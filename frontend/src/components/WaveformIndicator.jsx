import { useMemo, useState, useEffect } from 'react'

const STATE_CONFIG = {
    idle: {
        label: 'READY',
        color: '#888888',
    },
    listening: {
        label: 'LISTENING',
        color: '#00ffd5',
    },
    thinking: {
        label: 'THINKING',
        color: '#ff00ff',
    },
    speaking: {
        label: 'SPEAKING',
        color: '#00aaff',
    },
}

export default function WaveformIndicator({ state = 'idle', audioLevel = 0 }) {
    const config = STATE_CONFIG[state] || STATE_CONFIG.idle
    const bars = useMemo(() => Array.from({ length: 32 }, (_, i) => i), [])
    const [time, setTime] = useState(0)

    useEffect(() => {
        let animationFrameId

        const animate = () => {
            setTime(Date.now())
            animationFrameId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
            }
        }
    }, [])

    return (
        <div className="flex flex-col items-center">
            {/* Waveform Container */}
            <div className="relative w-full max-w-md h-24 flex items-center justify-center gap-[2px]">
                {/* Background glow */}
                <div
                    className="absolute inset-0 blur-2xl transition-opacity duration-300"
                    style={{
                        backgroundColor: config.color,
                        opacity: state === 'listening' ? 0.2 + audioLevel * 0.3 : 0.1,
                    }}
                />

                {/* Waveform bars */}
                {bars.map((i) => {
                    // Create organic-looking animation
                    const baseHeight = 15 + Math.sin(i * 0.3) * 5

                    // Calculate dynamic height based on audio level when listening
                    let height = baseHeight
                    if (state === 'listening' && audioLevel > 0.01) {
                        // Create wave effect across bars
                        const wave = Math.sin((i / bars.length) * Math.PI * 2 + time / 200) * 0.3 + 0.7
                        height = 15 + audioLevel * 70 * wave
                    } else if (state === 'thinking') {
                        // Pulsing effect when thinking
                        height = 20 + Math.sin(time / 300 + i * 0.3) * 15
                    }

                    return (
                        <div
                            key={i}
                            className="relative w-1 rounded-full transition-all duration-75"
                            style={{
                                backgroundColor: config.color,
                                height: `${Math.min(height, 85)}%`,
                                opacity: state === 'idle' ? 0.3 : 0.8,
                            }}
                        />
                    )
                })}
            </div>

            {/* State label */}
            <div
                className="mt-4 text-sm font-mono tracking-[0.3em] transition-colors duration-300"
                style={{ color: config.color }}
            >
                {config.label}
            </div>
        </div>
    )
}
