import GlassCard from './GlassCard'

export default function Disclaimer() {
    return (
        <GlassCard
            style={{
                padding: '14px 18px',
                marginBottom: 24,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                border: '1px solid rgba(255,176,32,0.15)',
                background: 'rgba(255,176,32,0.04)',
            }}
        >
            <svg width={18} height={18} viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="#ffb020" strokeWidth="1.5" />
                <line x1="12" y1="9" x2="12" y2="13" stroke="#ffb020" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="17" r="0.5" fill="#ffb020" />
            </svg>
            <p style={{ fontSize: 12, color: '#ccaa55', lineHeight: 1.6 }}>
                <strong style={{ color: '#ffb020' }}>Research Prototype.</strong>{' '}
                ASD-FaceNet is NOT a medical device. Results must be interpreted by qualified
                professionals with ADOS-2/ADI-R protocols.
            </p>
        </GlassCard>
    )
}
