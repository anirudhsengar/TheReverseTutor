export default function TranscriptLog({ text }) {
    if (!text) return null

    return (
        <div className="mb-3 px-4 py-2 bg-abyss/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-neon-cyan rounded-full animate-pulse" />
                <span className="text-xs text-ash font-mono">TRANSCRIBING</span>
            </div>
            <p className="text-sm text-ash/70 font-mono italic">
                {text}
            </p>
        </div>
    )
}
