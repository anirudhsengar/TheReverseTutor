import { useState, useEffect, useRef, useCallback } from 'react'
import Visualizer from './Visualizer'
import useWebSocket from '../hooks/useWebSocket'

const STATES = {
    IDLE: 'idle',
    LISTENING: 'listening',
    THINKING: 'thinking',
    SPEAKING: 'speaking',
}

// VAD Configuration
const VAD_CONFIG = {
    SPEECH_THRESHOLD: 0.1,   // Increased from 0.03 to 0.1 to ignore background noise
    SILENCE_THRESHOLD: 0.05, // Increased from 0.015 to 0.05
    SILENCE_DELAY: 2000,      // Reduced to 2s for snappier response
    MIN_SPEECH_MS: 300,
}

export default function SessionView({ onConnectionChange }) {
    const [state, setState] = useState(STATES.IDLE)
    const [messages, setMessages] = useState([])
    const [error, setError] = useState(null)
    const [audioLevel, setAudioLevel] = useState(0)

    const stateRef = useRef(state)
    useEffect(() => {
        stateRef.current = state
    }, [state])

    const messagesEndRef = useRef(null)

    // Audio refs
    const mediaStreamRef = useRef(null)
    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])
    const silenceTimeoutRef = useRef(null)
    const speechStartTimeRef = useRef(null)
    const isRecordingRef = useRef(false)
    const animationFrameRef = useRef(null)
    const monitorAudioRef = useRef(null)
    const currentAudioRef = useRef(null)

    // WebSocket Handlers
    const handleOpen = useCallback(() => {
        onConnectionChange?.('connected')
    }, [onConnectionChange])

    const handleClose = useCallback(() => {
        onConnectionChange?.('disconnected')
        if (stateRef.current === STATES.THINKING) {
            setState(STATES.IDLE)
        }
    }, [onConnectionChange])

    const handleMessage = useCallback((lastMessage) => {
        if (lastMessage.type === 'response') {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: lastMessage.text,
                quality: lastMessage.quality,
                timestamp: Date.now(),
            }])
        } else if (lastMessage.type === 'transcript') {
            // Transcript received
        } else if (lastMessage.type === 'error') {
            setError(lastMessage.text)
            setState(STATES.IDLE)
        } else if (lastMessage.type === 'audio') {
            // Play TTS audio
            try {
                // specialized clean up for previous audio if any
                if (currentAudioRef.current) {
                    currentAudioRef.current.pause()
                    currentAudioRef.current = null
                }

                setState(STATES.SPEAKING)
                const audioData = `data:${lastMessage.mimeType || 'audio/mp3'};base64,${lastMessage.audio}`
                const audio = new Audio(audioData)
                currentAudioRef.current = audio

                audio.onended = () => {
                    currentAudioRef.current = null
                    setState(STATES.IDLE)
                }
                audio.onerror = (e) => {
                    console.error('Audio playback error:', e)
                    setError('Audio playback failed')
                    currentAudioRef.current = null
                    setState(STATES.IDLE)
                }

                const playPromise = audio.play()
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error('Failed to play audio (Autoplay blocked?):', e)
                        // Don't show error to user immediately, just log it
                        currentAudioRef.current = null
                        setState(STATES.IDLE)
                    })
                }
            } catch (e) {
                console.error('Error handling audio message:', e)
                setState(STATES.IDLE)
            }
        }
    }, [])

    // WebSocket connection
    const {
        isConnected,
        sendMessage
    } = useWebSocket('/ws/session', {
        onOpen: handleOpen,
        onClose: handleClose,
        onMessage: handleMessage
    })

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Start recording when speech detected
    const startRecording = useCallback(() => {
        if (isRecordingRef.current || !mediaStreamRef.current) return

        isRecordingRef.current = true
        speechStartTimeRef.current = Date.now()
        audioChunksRef.current = []

        const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
            mimeType: 'audio/webm;codecs=opus'
        })
        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data)
            }
        }

        mediaRecorder.onstop = async () => {
            const speechDuration = Date.now() - (speechStartTimeRef.current || 0)

            // Only send if speech was long enough
            if (speechDuration >= VAD_CONFIG.MIN_SPEECH_MS && audioChunksRef.current.length > 0) {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

                // Convert to base64 and send
                const reader = new FileReader()
                reader.onloadend = () => {
                    const base64Audio = reader.result.split(',')[1]
                    sendMessage({
                        type: 'audio',
                        audio: base64Audio,
                        mimeType: 'audio/webm'
                    })
                    setState(STATES.THINKING)
                }
                reader.readAsDataURL(audioBlob)
            }

            isRecordingRef.current = false
        }

        mediaRecorder.start(100)
        setState(STATES.LISTENING)
    }, [sendMessage])

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
        isRecordingRef.current = false
    }, [])

    // Monitor audio levels for VAD
    const monitorAudio = useCallback(() => {
        if (!analyserRef.current) return

        // Skip processing if AI is thinking or speaking
        if (stateRef.current === STATES.THINKING || stateRef.current === STATES.SPEAKING) {
            setAudioLevel(0)
            animationFrameRef.current = requestAnimationFrame(() => monitorAudioRef.current?.())
            return
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate average audio level
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
        const normalizedLevel = average / 255
        setAudioLevel(normalizedLevel)

        // Detect speech - use SPEECH_THRESHOLD to start, SILENCE_THRESHOLD to stop
        if (normalizedLevel > VAD_CONFIG.SPEECH_THRESHOLD) {
            // Clear speech detected - clear silence timeout
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current)
                silenceTimeoutRef.current = null
            }

            // Start recording if not already
            if (!isRecordingRef.current) {
                startRecording()
            }
        } else if (isRecordingRef.current && normalizedLevel < VAD_CONFIG.SILENCE_THRESHOLD) {
            // Below silence threshold while recording - start countdown
            if (!silenceTimeoutRef.current) {
                silenceTimeoutRef.current = setTimeout(() => {
                    stopRecording()
                    silenceTimeoutRef.current = null
                }, VAD_CONFIG.SILENCE_DELAY)
            }
        } else if (isRecordingRef.current && normalizedLevel >= VAD_CONFIG.SILENCE_THRESHOLD) {
            // Still some audio (between silence and speech thresholds) - extend recording
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current)
                silenceTimeoutRef.current = null
            }
        }

        animationFrameRef.current = requestAnimationFrame(() => monitorAudioRef.current?.())
    }, [startRecording, stopRecording])

    // Update monitorAudio ref
    useEffect(() => {
        monitorAudioRef.current = monitorAudio
    }, [monitorAudio])

    // Initialize audio context and microphone
    useEffect(() => {
        if (!isConnected) return

        const initAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        channelCount: 1,
                        sampleRate: 16000,
                        echoCancellation: true,
                        noiseSuppression: true,
                    }
                })
                mediaStreamRef.current = stream

                const audioContext = new (window.AudioContext || window.webkitAudioContext)()
                audioContextRef.current = audioContext

                const analyser = audioContext.createAnalyser()
                analyser.fftSize = 256
                analyser.smoothingTimeConstant = 0.8
                analyserRef.current = analyser

                const source = audioContext.createMediaStreamSource(stream)
                source.connect(analyser)

                // Start monitoring
                animationFrameRef.current = requestAnimationFrame(() => monitorAudioRef.current?.())

            } catch (err) {
                console.error('Microphone error:', err)
                setError('Microphone access required. Please allow microphone permissions.')
            }
        }

        initAudio()

        return () => {
            // Cleanup
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current)
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop())
            }
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [isConnected, monitorAudio])

    const isUser = state !== STATES.SPEAKING
    const isActive = state === STATES.LISTENING || state === STATES.SPEAKING || state === STATES.THINKING

    return (
        <div className="w-full h-full flex items-center justify-center">
            {/* Error Toast */}
            {error && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-error/10 border border-error/30 rounded-full backdrop-blur-md">
                    <div className="text-error text-sm font-medium">
                        {error}
                    </div>
                </div>
            )}

            {/* Status Text (Optional minimal feedback) */}
            <div className="absolute bottom-12 text-center pointer-events-none opacity-50">
                <p className="text-sm font-light tracking-widest uppercase">
                    {state === STATES.LISTENING && 'Listening'}
                    {state === STATES.THINKING && 'Thinking'}
                    {state === STATES.SPEAKING && 'Speaking'}
                    {state === STATES.IDLE && 'Ready'}
                </p>
            </div>

            <Visualizer
                isSpeaking={isActive}
                isUser={isUser}
                audioLevel={audioLevel}
            />
        </div>
    )
}
