export default function GlassCard({ children, className = '', glow = false, style = {} }) {
    return (
        <div
            className={`glass ${glow ? 'glass-glow' : ''} ${className}`}
            style={style}
        >
            {children}
        </div>
    )
}
