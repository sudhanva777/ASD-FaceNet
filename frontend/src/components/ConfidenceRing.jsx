export default function ConfidenceRing({ value, label }) {
    const color = label === 'ASD' ? '#ffb020' : '#00e09e'
    const pct = Math.round(value * 100)
    const rad = 64
    const circ = 2 * Math.PI * rad

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
                <svg viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="80" cy="80" r={rad} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                    <circle
                        cx="80" cy="80" r={rad} fill="none" stroke={color} strokeWidth="10"
                        strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                        strokeLinecap="round"
                        style={{
                            transition: 'stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)',
                            filter: `drop-shadow(0 0 8px ${color}88)`,
                        }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{
                        fontSize: 36, fontWeight: 800, color,
                        fontFamily: "'Fira Code', monospace",
                        textShadow: `0 0 20px ${color}44`,
                    }}>
                        {pct}<span style={{ fontSize: 18 }}>%</span>
                    </span>
                    <span style={{
                        fontSize: 10, color: '#556677', fontWeight: 500,
                        letterSpacing: 1.5, textTransform: 'uppercase',
                    }}>
                        Confidence
                    </span>
                </div>
            </div>
        </div>
    )
}
