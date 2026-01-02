
import React from 'react'

export default function Visualizer({ isSpeaking, isUser, audioLevel }) {
    // Config for the two states
    const config = {
        user: {
            gradient: 'fluid-blue',
            glow: 'shadow-[0_0_50px_rgba(0,170,255,0.4)]',
            accent: '#00aaff'
        },
        tutor: {
            gradient: 'fluid-green',
            glow: 'shadow-[0_0_50px_rgba(68,255,68,0.4)]',
            accent: '#44ff44'
        }
    }

    const activeConfig = isUser ? config.user : config.tutor

    // Dynamic scaling based on state and audio
    // When User speaks: highly reactive, energetic
    // When Tutor speaks: slow, breathing
    const baseScale = isSpeaking ? 1.2 : 1.0;
    const audioScale = isSpeaking ? Math.max(0, audioLevel * (isUser ? 0.8 : 0.4)) : 0;
    const totalScale = baseScale + audioScale;

    return (
        <div className="relative flex items-center justify-center w-40 h-40">
            {/* Background Aura (Slow Rotate) */}
            <div
                className={`absolute inset-0 opacity-30 blur-2xl transition-all duration-1000 ease-in-out
               animate-[spin-slow_10s_linear_infinite] ${activeConfig.gradient}
           `}
                style={{
                    borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                    transform: `scale(${totalScale * 1.5}) rotate(45deg)`,
                }}
            />

            {/* Secondary Layer (Counter Rotate) */}
            <div
                className={`absolute inset-2 opacity-60 mix-blend-screen transition-all duration-500 ease-out
               animate-[spin-reverse_8s_linear_infinite] ${activeConfig.gradient}
           `}
                style={{
                    animation: isSpeaking ? 'morph-fast 3s ease-in-out infinite alternate, spin-reverse 8s linear infinite' : 'morph-slow 8s ease-in-out infinite alternate, spin-reverse 15s linear infinite',
                    transform: `scale(${totalScale * 1.1})`,
                }}
            />

            {/* Core Fluid Node */}
            <div
                className={`
                relative w-full h-full glass transition-all duration-300 ease-out flex items-center justify-center
                ${activeConfig.glow}
            `}
                style={{
                    background: isUser
                        ? `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), ${activeConfig.accent} 80%)`
                        : `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), ${activeConfig.accent} 80%)`,
                    animation: isSpeaking ? 'morph-fast 2s ease-in-out infinite alternate' : 'morph-slow 6s ease-in-out infinite alternate',
                    transform: `scale(${totalScale}) rotate(-15deg)`,
                }}
            >
                {/* Inner "Soul" Light */}
                <div className="absolute top-[20%] left-[20%] w-[20%] h-[20%] bg-white blur-xl opacity-40 rounded-full" />
            </div>
        </div>
    )
}
