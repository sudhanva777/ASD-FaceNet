import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import GlassCard from '../components/GlassCard'
import NeuralBG from '../components/NeuralBG'

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', pass: '', confirm: '', role: 'demo_user' })
    const [err, setErr] = useState({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    const register = useAuthStore((s) => s.register)
    const navigate = useNavigate()

    const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErr((p) => ({ ...p, [k]: null })) }

    const handleSubmit = async () => {
        const e = {}
        if (!form.name) e.name = 'Required'
        if (!form.email) e.email = 'Required'
        if (form.pass.length < 8) e.pass = 'Min 8 characters'
        if (!/[A-Z]/.test(form.pass)) e.pass = 'Need 1 uppercase letter'
        if (!/\d/.test(form.pass)) e.pass = 'Need 1 digit'
        if (form.pass !== form.confirm) e.confirm = "Doesn't match"
        if (Object.keys(e).length) return setErr(e)

        setLoading(true)
        setApiError('')
        try {
            await register(form.name, form.email, form.pass, form.confirm, form.role)
            navigate('/dashboard')
        } catch (error) {
            setApiError(error.response?.data?.detail || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <NeuralBG />
            <div style={{ position: 'absolute', width: 400, height: 400, top: '-8%', right: '-5%', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)', borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%', animation: 'blob 12s ease-in-out infinite', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 300, height: 300, bottom: '-5%', left: '10%', background: 'radial-gradient(circle, rgba(0,240,200,0.09) 0%, transparent 70%)', borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%', animation: 'blob 12s ease-in-out 2s infinite', filter: 'blur(40px)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 420, padding: 20, position: 'relative', zIndex: 2 }}>
                <div className="fi" style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px', background: 'linear-gradient(135deg, rgba(0,240,200,0.13), rgba(59,130,246,0.13))', border: '1.5px solid rgba(0,240,200,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(0,240,200,0.15)', animation: 'float 4s ease-in-out infinite' }}>
                        <svg width={28} height={28} viewBox="0 0 24 24">
                            <path d="M9.5 2a6.5 6.5 0 0 0-3.17 12.2A3.5 3.5 0 0 0 4 17.5 3.5 3.5 0 0 0 7.5 21h9a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-2.33-3.3A6.5 6.5 0 0 0 14.5 2" fill="none" stroke="#00f0c8" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M12 2v19" stroke="#00f0c8" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity="0.4" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg, #00f0c8, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Create Account
                    </h1>
                </div>

                <GlassCard className="fi1" glow style={{ padding: 32 }}>
                    {apiError && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,68,102,0.08)', border: '1px solid rgba(255,68,102,0.2)', marginBottom: 18 }}>
                            <p style={{ fontSize: 13, color: '#ff4466' }}>{apiError}</p>
                        </div>
                    )}

                    <Field label="FULL NAME" icon="user" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" error={err.name} />
                    <Field label="EMAIL" icon="mail" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" error={err.email} />
                    <Field label="PASSWORD" icon="lock" type="password" value={form.pass} onChange={(e) => set('pass', e.target.value)} placeholder="Min 8 characters" error={err.pass} />
                    <Field label="CONFIRM" icon="lock" type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="Repeat password" error={err.confirm} />

                    <div style={{ marginBottom: 18 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: '#8899aa', marginBottom: 8, display: 'block', letterSpacing: 0.5 }}>ROLE</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[['demo_user', 'Demo User'], ['clinician', 'Clinician']].map(([k, l]) => (
                                <button key={k} onClick={() => set('role', k)} style={{
                                    flex: 1, padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                    fontSize: 13, fontWeight: 600, fontFamily: "'Outfit'", transition: 'all 0.3s',
                                    background: form.role === k ? 'rgba(0,240,200,0.07)' : 'rgba(6,10,16,0.6)',
                                    border: `1.5px solid ${form.role === k ? 'rgba(0,240,200,0.4)' : 'rgba(0,240,200,0.1)'}`,
                                    color: form.role === k ? '#00f0c8' : '#556677',
                                    boxShadow: form.role === k ? '0 0 15px rgba(0,240,200,0.06)' : 'none',
                                }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        id="btn-register"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            width: '100%', height: 48, borderRadius: 12, border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontFamily: "'Outfit'", fontWeight: 700, fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            background: 'linear-gradient(135deg, #00b896, #008a6e)',
                            color: '#021a14', opacity: loading ? 0.5 : 1, transition: 'all 0.3s',
                        }}
                    >
                        {loading ? <div className="spinner" /> : 'Create Account'}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: '#556677' }}>
                        Have an account?{' '}
                        <Link to="/login" style={{ color: '#00f0c8', fontWeight: 600, borderBottom: '1px dashed rgba(0,240,200,0.27)', textDecoration: 'none' }}>
                            Sign in
                        </Link>
                    </p>
                </GlassCard>
            </div>
        </div>
    )
}

function Field({ label, icon, type = 'text', value, onChange, placeholder, error }) {
    const [focused, setFocused] = useState(false)
    const icons = {
        user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
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
                {icon && icons[icon] && <svg width={17} height={17} viewBox="0 0 24 24" style={{ flexShrink: 0, color: focused ? '#00f0c8' : '#556677' }}>{icons[icon]}</svg>}
                <input type={type} value={value} onChange={onChange} placeholder={placeholder} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ flex: 1, border: 'none', background: 'transparent', color: '#e0e7ef', fontSize: 14, fontFamily: "'Outfit'" }} />
            </div>
            {error && <p style={{ fontSize: 11, color: '#ff4466', marginTop: 5, fontWeight: 500 }}>{error}</p>}
        </div>
    )
}
