import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV = [
    { id: 'dashboard', path: '/dashboard', icon: 'bar', label: 'Dashboard' },
    { id: 'predict', path: '/predict', icon: 'brain', label: 'Predict' },
    { id: 'history', path: '/history', icon: 'clock', label: 'History' },
]

const ICONS = {
    brain: <><path d="M9.5 2a6.5 6.5 0 0 0-3.17 12.2A3.5 3.5 0 0 0 4 17.5 3.5 3.5 0 0 0 7.5 21h9a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-2.33-3.3A6.5 6.5 0 0 0 14.5 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M12 2v19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity="0.4" /></>,
    bar: <><line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
    clock: <><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><polyline points="12 6 12 12 16 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
    out: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><polyline points="16 17 21 12 16 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
}

function Icon({ name, size = 18, color = 'currentColor' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, color }}>
            {ICONS[name]}
        </svg>
    )
}

export default function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const user = useAuthStore((s) => s.user)
    const logout = useAuthStore((s) => s.logout)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <aside style={{
            width: 240, background: 'rgba(6,10,16,0.85)',
            backdropFilter: 'blur(30px)', borderRight: '1px solid rgba(0,240,200,0.1)',
            padding: '28px 16px', display: 'flex', flexDirection: 'column',
            flexShrink: 0, position: 'relative', zIndex: 10,
        }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, paddingLeft: 10 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(0,240,200,0.13), rgba(59,130,246,0.13))',
                    border: '1px solid rgba(0,240,200,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 25px rgba(0,240,200,0.15)',
                }}>
                    <Icon name="brain" size={22} color="#00f0c8" />
                </div>
                <div>
                    <p style={{
                        fontWeight: 800, fontSize: 16, lineHeight: 1,
                        background: 'linear-gradient(135deg, #00f0c8, #3b82f6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        ASD-FaceNet
                    </p>
                    <p style={{ fontSize: 10, color: '#556677', marginTop: 3, fontFamily: "'Fira Code', monospace" }}>
                        v1.0.0 · local
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1 }}>
                {NAV.map((item) => {
                    const active = location.pathname === item.path
                    return (
                        <button
                            key={item.id}
                            id={`nav-${item.id}`}
                            onClick={() => navigate(item.path)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                padding: '11px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                marginBottom: 4, fontFamily: "'Outfit'", fontSize: 14,
                                fontWeight: active ? 700 : 400,
                                background: active ? 'rgba(0,240,200,0.06)' : 'transparent',
                                color: active ? '#00f0c8' : '#556677',
                                transition: 'all 0.25s',
                                boxShadow: active ? 'inset 0 0 20px rgba(0,240,200,0.06)' : 'none',
                            }}
                        >
                            <Icon name={item.icon} size={18} color={active ? '#00f0c8' : '#556677'} />
                            {item.label}
                            {active && (
                                <div style={{
                                    marginLeft: 'auto', width: 6, height: 6,
                                    borderRadius: '50%', background: '#00f0c8',
                                    boxShadow: '0 0 10px #00f0c8',
                                }} />
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* User info + logout */}
            <div style={{ borderTop: '1px solid rgba(0,240,200,0.1)', paddingTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingLeft: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(0,240,200,0.12), rgba(59,130,246,0.12))',
                        border: '1px solid rgba(0,240,200,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon name="user" size={16} color="#00f0c8" />
                    </div>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{user?.name || 'User'}</p>
                        <p style={{ fontSize: 10, color: '#556677', fontFamily: "'Fira Code', monospace" }}>
                            {user?.role || 'demo_user'}
                        </p>
                    </div>
                </div>
                <button
                    id="btn-logout"
                    onClick={handleLogout}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,68,102,0.2)'
                        e.currentTarget.style.color = '#ff4466'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent'
                        e.currentTarget.style.color = '#556677'
                    }}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 16px', borderRadius: 10, border: '1px solid transparent',
                        cursor: 'pointer', background: 'transparent', color: '#556677',
                        fontSize: 13, fontFamily: "'Outfit'", transition: 'all 0.25s',
                    }}
                >
                    <Icon name="out" size={16} /> Sign Out
                </button>
            </div>
        </aside>
    )
}
