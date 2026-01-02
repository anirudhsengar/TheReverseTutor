import { useState } from 'react'

export default function WelcomeScreen({ onStart }) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div className="max-w-2xl mx-auto px-6 text-center">
            {/* Hero */}
            <div className="mb-12">
                <div
                    className="w-24 h-24 mx-auto mb-8 rounded-full border-2 border-neon-cyan/30 
                     flex items-center justify-center relative"
                    style={{
                        background: 'radial-gradient(circle, rgba(0,255,213,0.1) 0%, transparent 70%)',
                    }}
                >
                    <div className="absolute inset-0 rounded-full border-2 border-neon-cyan/20 animate-ping" />
                    <svg
                        className="w-10 h-10 text-neon-cyan"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                    </svg>
                </div>

                <h2 className="text-3xl font-bold mb-4 tracking-tight">
                    Learn by <span className="text-neon-cyan">Teaching</span>
                </h2>

                <p className="text-ash text-lg leading-relaxed max-w-md mx-auto">
                    Explain any concept to me. I won't just nod along—I'll challenge your
                    understanding until you truly get it.
                </p>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-sm">
                <div className="bg-steel/50 rounded-lg p-5 border border-white/5">
                    <div className="text-neon-cyan font-mono text-2xl mb-2">01</div>
                    <div className="text-bone font-medium mb-1">Explain</div>
                    <div className="text-ash text-xs">Teach me a concept in your own words</div>
                </div>

                <div className="bg-steel/50 rounded-lg p-5 border border-white/5">
                    <div className="text-neon-magenta font-mono text-2xl mb-2">02</div>
                    <div className="text-bone font-medium mb-1">Get Challenged</div>
                    <div className="text-ash text-xs">I'll probe for gaps in your understanding</div>
                </div>

                <div className="bg-steel/50 rounded-lg p-5 border border-white/5">
                    <div className="text-neon-blue font-mono text-2xl mb-2">03</div>
                    <div className="text-bone font-medium mb-1">Master It</div>
                    <div className="text-ash text-xs">Refine until you can explain it simply</div>
                </div>
            </div>

            {/* Start Button */}
            <button
                onClick={onStart}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
          relative px-10 py-4 rounded-lg font-semibold text-lg
          bg-gradient-to-r from-neon-cyan/20 to-neon-cyan/10
          border border-neon-cyan/50 text-neon-cyan
          transition-all duration-300 ease-out
          hover:border-neon-cyan hover:shadow-[0_0_30px_rgba(0,255,213,0.3)]
          active:scale-95
        `}
            >
                <span className="relative z-10">Begin Teaching Session</span>
                {isHovered && (
                    <div className="absolute inset-0 bg-neon-cyan/10 rounded-lg animate-pulse" />
                )}
            </button>

            {/* Technical note */}
            <p className="mt-8 text-xs text-ash/50">
                Based on the Feynman Technique • Socratic questioning methodology
            </p>
        </div>
    )
}
