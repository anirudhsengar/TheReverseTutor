import { useState, useCallback, useRef } from 'react'

export default function useAudioRecorder({ onAudioData, sampleRate = 16000 }) {
    const [isRecording, setIsRecording] = useState(false)
    const [error, setError] = useState(null)

    const mediaStreamRef = useRef(null)
    const audioContextRef = useRef(null)
    const processorRef = useRef(null)
    const sourceRef = useRef(null)

    // Start recording
    const startRecording = useCallback(async () => {
        try {
            setError(null)

            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            })

            mediaStreamRef.current = stream

            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: sampleRate,
            })
            audioContextRef.current = audioContext

            // Create source from stream
            const source = audioContext.createMediaStreamSource(stream)
            sourceRef.current = source

            // Create script processor for raw audio data
            const processor = audioContext.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor

            processor.onaudioprocess = (e) => {
                if (onAudioData) {
                    const inputData = e.inputBuffer.getChannelData(0)

                    // Convert float32 to int16
                    const int16Data = new Int16Array(inputData.length)
                    for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]))
                        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
                    }

                    onAudioData(int16Data.buffer)
                }
            }

            // Connect nodes
            source.connect(processor)
            processor.connect(audioContext.destination)

            setIsRecording(true)

        } catch (err) {
            console.error('Failed to start recording:', err)
            setError(err.message || 'Failed to access microphone')
        }
    }, [onAudioData, sampleRate])

    // Stop recording
    const stopRecording = useCallback(() => {
        if (processorRef.current) {
            processorRef.current.disconnect()
            processorRef.current = null
        }

        if (sourceRef.current) {
            sourceRef.current.disconnect()
            sourceRef.current = null
        }

        if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop())
            mediaStreamRef.current = null
        }

        setIsRecording(false)
    }, [])

    return {
        isRecording,
        error,
        startRecording,
        stopRecording,
    }
}
