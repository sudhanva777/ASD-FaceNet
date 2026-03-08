import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import GlassCard from '../components/GlassCard'
import NeuralBG from '../components/NeuralBG'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [pass, setPass] = useState('')
    const [err, setErr] = useState({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    const login = useAuthStore((s) => s.login)
    const navigate = useNavigate()

    const handleSubmit = async () => {
        const e = {}
        if (!email) e.email = 'Required'
        if (!pass) e.pass = 'Required'
        if (Object.keys(e).length) return setErr(e)

        setLoading(true)
        setApiError('')
        try {
            await login(email, pass)
            navigate('/dashboard')
        } catch (error) {
            setApiError(error.response?.data?.detail || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSubmit()
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <NeuralBG />
            {/* Blobs */}
            <div style={{ position: 'absolute', width: 400, height: 400, top: '-10%', left: '-5%', background: 'radial-gradient(circle, rgba(0,240,200,0.09) 0%, transparent 70%)', borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%', animation: 'blob 12s ease-in-out infinite', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 350, height: 350, bottom: '-10%', right: '-5%', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)', borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%', animation: 'blob 12s ease-in-out 3s infinite', filter: 'blur(40px)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 420, padding: 20, position: 'relative', zIndex: 2 }}>
                {/* Logo */}
                <div className="fi" style={{ textAlign: 'center', marginBottom: 44 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 22, margin: '0 auto 18px',
                        background: 'linear-gradient(135deg, rgba(0,240,200,0.13), rgba(59,130,246,0.13))',
                        border: '1.5px solid rgba(0,240,200,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 50px rgba(0,240,200,0.15)',
                        animation: 'float 4s ease-in-out infinite',
                    }}>
                        <svg width={36} height={36} viewBox="0 0 24 24">
                            <path d="M9.5 2a6.5 6.5 0 0 0-3.17 12.2A3.5 3.5 0 0 0 4 17.5 3.5 3.5 0 0 0 7.5 21h9a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-2.33-3.3A6.5 6.5 0 0 0 14.5 2" fill="none" stroke="#00f0c8" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M12 2v19" stroke="#00f0c8" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity="0.4" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, background: 'linear-gradient(135deg, #00f0c8, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ASD-FaceNet
                    </h1>
                    <p style={{ color: '#556677', fontSize: 13, marginTop: 6 }}>
                        Deep Learning ASD Detection from Facial Images
                    </p>
                </div>

                {/* Form */}
                <GlassCard className="fi1" glow style={{ padding: 36 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
                    <p style={{ color: '#556677', fontSize: 13, marginBottom: 28 }}>Sign in to continue to your dashboard</p>

                    {apiError && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,68,102,0.08)', border: '1px solid rgba(255,68,102,0.2)', marginBottom: 18 }}>
                            <p style={{ fontSize: 13, color: '#ff4466' }}>{apiError}</p>
                        </div>
                    )}

                    <InputField label="EMAIL" icon="mail" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr((p) => ({ ...p, email: null })) }} placeholder="you@example.com" error={err.email} onKeyDown={handleKeyDown} />
                    <InputField label="PASSWORD" icon="lock" type="password" value={pass} onChange={(e) => { setPass(e.target.value); setErr((p) => ({ ...p, pass: null })) }} placeholder="Enter password" error={err.pass} onKeyDown={handleKeyDown} />

                    <button
                        id="btn-login"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '13px 22px', borderRadius: 12, border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontFamily: "'Outfit'", fontWeight: 700, fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            background: 'linear-gradient(135deg, #00b896, #008a6e)',
                            color: '#021a14', marginTop: 6, height: 48,
                            opacity: loading ? 0.5 : 1, transition: 'all 0.3s',
                        }}
                    >
                        {loading ? <div className="spinner" /> : <>Sign In <svg width={16} height={16} viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><polyline points="12 5 19 12 12 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></>}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#556677' }}>
                        No account?{' '}
                        <Link to="/register" style={{ color: '#00f0c8', fontWeight: 600, borderBottom: '1px dashed rgba(0,240,200,0.27)', textDecoration: 'none' }}>
                            Create one
                        </Link>
                    </p>
                </GlassCard>

                <p className="fi2" style={{ textAlign: 'center', marginTop: 28, fontSize: 11, color: '#556677' }}>
                    AIEMS · Dept. of ISE · Final Year Project 2024-25
                </p>
            </div>
        </div>
    )
}

function InputField({ label, icon, type = 'text', value, onChange, placeholder, error, onKeyDown }) {
    const [focused, setFocused] = useState(false)
    const icons = {
        mail: <><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
        lock: <><rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
    }

    return (
        <div style={{ marginBottom: 18 }}>
            {label && <label style={{ fontSize: 12, fontWeight: 500, color: '#8899aa', marginBottom: 7, display: 'block', letterSpacing: 0.5 }}>{label}</label>}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                borderRadius: 12, transition: 'all 0.3s',
                border: `1.5px solid ${error ? '#ff4466' : focused ? 'rgba(0,240,200,0.4)' : 'rgba(0,240,200,0.1)'}`,
                background: focused ? 'rgba(0,240,200,0.03)' : 'rgba(6,10,16,0.6)',
                boxShadow: focused ? '0 0 20px rgba(0,240,200,0.06)' : 'none',
            }}>
                {icon && icons[icon] && (
                    <svg width={17} height={17} viewBox="0 0 24 24" style={{ flexShrink: 0, color: focused ? '#00f0c8' : '#556677' }}>
                        {icons[icon]}
                    </svg>
                )}
                <input
                    type={type} value={value} onChange={onChange} placeholder={placeholder}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    onKeyDown={onKeyDown}
                    style={{
                        flex: 1, border: 'none', background: 'transparent',
                        color: '#e0e7ef', fontSize: 14, fontFamily: "'Outfit'",
                    }}
                />
            </div>
            {error && <p style={{ fontSize: 11, color: '#ff4466', marginTop: 5, fontWeight: 500 }}>{error}</p>}
        </div>
    )
}
