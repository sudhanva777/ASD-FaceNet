import GlassCard from './GlassCard'

const ICONS = {
    scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
    warn: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="currentColor" strokeWidth="1.5" /><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="17" r="0.5" fill="currentColor" /></>,
    check: <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
}

export default function StatCard({ label, value, color = '#00f0c8', icon, delay = '' }) {
    return (
        <GlassCard className={delay} style={{
            padding: '22px 20px', flex: '1 1 180px', minWidth: 155,
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
                borderRadius: '50%',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {icon && ICONS[icon] && (
                    <svg width={15} height={15} viewBox="0 0 24 24" style={{ color, flexShrink: 0 }}>
                        {ICONS[icon]}
                    </svg>
                )}
                <p style={{
                    fontSize: 11, color: '#556677', textTransform: 'uppercase',
                    letterSpacing: 1.5, fontWeight: 600,
                }}>
                    {label}
                </p>
            </div>
            <p style={{
                fontSize: 30, fontWeight: 800, color,
                fontFamily: "'Fira Code', monospace",
                textShadow: `0 0 20px ${color}33`,
            }}>
                {value}
            </p>
        </GlassCard>
    )
}
