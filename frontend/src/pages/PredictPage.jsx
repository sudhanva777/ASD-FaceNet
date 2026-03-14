import { useState, useRef } from 'react'
import client from '../api/client'
import GlassCard from '../components/GlassCard'
import Disclaimer from '../components/Disclaimer'
import ConfidenceRing from '../components/ConfidenceRing'
import ReportModal from '../components/ReportModal'

export default function PredictPage() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [drag, setDrag] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const inputRef = useRef(null)

    const handleFile = (f) => {
        if (!f) return
        setFile(f)
        setResult(null)
        setError('')
        const r = new FileReader()
        r.onload = (e) => setPreview(e.target.result)
        r.readAsDataURL(f)
    }

    const predict = async () => {
        if (!file) return
        setLoading(true)
        setError('')
        try {
            const form = new FormData()
            form.append('image', file)
            const res = await client.post('/predict', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            setResult(res.data)
        } catch (err) {
            setError(err.response?.data?.detail || 'Prediction failed')
        } finally {
            setLoading(false)
        }
    }

    const reset = () => {
        setFile(null)
        setPreview(null)
        setResult(null)
        setError('')
    }

    return (
        <div>
            <h2 className="fi" style={{ fontSize: 24, fontWeight: 800, marginBottom: 22 }}>Predict</h2>
            <Disclaimer />

            {error && (
                <div className="fi1" style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(255,68,102,0.08)', border: '1px solid rgba(255,68,102,0.2)', marginBottom: 18 }}>
                    <p style={{ fontSize: 13, color: '#ff4466' }}>{error}</p>
                </div>
            )}

            {!result ? (
                <div className="su">
                    <GlassCard style={{ overflow: 'hidden', animation: !preview ? 'border-glow 4s ease infinite' : 'none' }}>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                            onDragLeave={() => setDrag(false)}
                            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
                            onClick={() => !preview && inputRef.current?.click()}
                            style={{
                                padding: preview ? 0 : '64px 40px', textAlign: 'center',
                                cursor: preview ? 'default' : 'pointer',
                                background: drag ? 'rgba(0,240,200,0.05)' : 'transparent',
                                transition: 'all 0.3s',
                            }}
                        >
                            <input
                                ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
                                style={{ display: 'none' }}
                                onChange={(e) => handleFile(e.target.files[0])}
                            />
                            {preview ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }} />
                                    {loading && (
                                        <div style={{
                                            position: 'absolute', inset: 0, background: 'rgba(6,10,16,0.75)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            justifyContent: 'center', gap: 16, backdropFilter: 'blur(4px)',
                                        }}>
                                            <div style={{
                                                position: 'absolute', left: 0, right: 0, height: 2,
                                                background: 'linear-gradient(90deg, transparent, #00f0c8, transparent)',
                                                animation: 'scan-line 2s ease-in-out infinite',
                                                boxShadow: '0 0 20px #00f0c8',
                                            }} />
                                            <svg width={40} height={40} viewBox="0 0 24 24">
                                                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" fill="none" stroke="#00f0c8" strokeWidth="1.5" strokeLinecap="round" />
                                                <circle cx="12" cy="12" r="4" fill="none" stroke="#00f0c8" strokeWidth="1.5" />
                                            </svg>
                                            <p style={{ color: '#00f0c8', fontWeight: 600, fontSize: 14, letterSpacing: 1 }}>
                                                Analyzing facial features...
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div style={{
                                        width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
                                        background: 'rgba(0,240,200,0.06)',
                                        border: '1.5px dashed rgba(0,240,200,0.4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        animation: 'float 3s ease-in-out infinite',
                                    }}>
                                        <svg width={28} height={28} viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="#00f0c8" strokeWidth="1.5" strokeLinecap="round" />
                                            <polyline points="17 8 12 3 7 8" fill="none" stroke="#00f0c8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <line x1="12" y1="3" x2="12" y2="15" stroke="#00f0c8" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Drop a facial image here</p>
                                    <p style={{ color: '#556677', fontSize: 13 }}>or click to browse · JPEG, PNG, WebP · Max 10MB</p>
                                </>
                            )}
                        </div>
                    </GlassCard>

                    {preview && !loading && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <button
                                id="btn-predict"
                                onClick={predict}
                                style={{
                                    flex: 1, height: 52, borderRadius: 12, border: 'none', cursor: 'pointer',
                                    fontFamily: "'Outfit'", fontWeight: 700, fontSize: 15,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    background: 'linear-gradient(135deg, #00b896, #008a6e)', color: '#021a14',
                                }}
                            >
                                <svg width={20} height={20} viewBox="0 0 24 24">
                                    <path d="M9.5 2a6.5 6.5 0 0 0-3.17 12.2A3.5 3.5 0 0 0 4 17.5 3.5 3.5 0 0 0 7.5 21h9a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-2.33-3.3A6.5 6.5 0 0 0 14.5 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                Run Prediction
                            </button>
                            <button
                                onClick={reset}
                                style={{
                                    padding: '11px 22px', borderRadius: 12, cursor: 'pointer',
                                    fontFamily: "'Outfit'", fontWeight: 600, fontSize: 14,
                                    background: 'transparent', color: '#8899aa',
                                    border: '1px solid rgba(0,240,200,0.1)', transition: 'all 0.3s',
                                }}
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="su">
                    <GlassCard glow style={{
                        overflow: 'hidden',
                        border: `1px solid ${result.label === 'ASD' ? 'rgba(255,176,32,0.2)' : 'rgba(0,224,158,0.2)'}`,
                    }}>
                        {/* Result header */}
                        <div style={{
                            padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: result.label === 'ASD' ? 'rgba(255,176,32,0.06)' : 'rgba(0,224,158,0.06)',
                            borderBottom: '1px solid rgba(0,240,200,0.1)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 12, height: 12, borderRadius: '50%',
                                    background: result.label === 'ASD' ? '#ffb020' : '#00e09e',
                                    boxShadow: `0 0 15px ${result.label === 'ASD' ? '#ffb020' : '#00e09e'}88`,
                                    animation: 'glow 2s ease infinite',
                                }} />
                                <span style={{ fontWeight: 800, fontSize: 20, color: result.label === 'ASD' ? '#ffb020' : '#00e09e' }}>
                                    {result.label === 'ASD' ? 'ASD Detected' : 'Typically Developing'}
                                </span>
                            </div>
                            <span style={{ fontSize: 12, color: '#556677', fontFamily: "'Fira Code', monospace" }}>
                                {result.processing_time_ms}ms · {result.model_version}
                            </span>
                        </div>

                        {/* Result body */}
                        <div style={{ padding: 28, display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: '1 1 280px', display: 'flex', gap: 14 }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 10, color: '#556677', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Original</p>
                                    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,240,200,0.1)' }}>
                                        <img src={preview} alt="Original" style={{ width: '100%', display: 'block' }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 10, color: '#556677', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Grad-CAM</p>
                                    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,240,200,0.1)' }}>
                                        <img src={result.gradcam_url} alt="Grad-CAM" style={{ width: '100%', display: 'block' }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: '0 0 190px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                <ConfidenceRing value={result.confidence} label={result.label} />
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: 11, color: '#556677', letterSpacing: 1, textTransform: 'uppercase' }}>ASD Probability</p>
                                    <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 22, fontWeight: 700, color: '#e0e7ef', marginTop: 4 }}>
                                        {(result.asd_probability * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                        <button
                            onClick={reset}
                            style={{
                                flex: 1, padding: '13px 22px', borderRadius: 12, cursor: 'pointer',
                                fontFamily: "'Outfit'", fontWeight: 600, fontSize: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                background: 'transparent', color: '#8899aa',
                                border: '1px solid rgba(0,240,200,0.1)', transition: 'all 0.3s',
                            }}
                        >
                            <svg width={16} height={16} viewBox="0 0 24 24">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <polyline points="17 8 12 3 7 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            New Prediction
                        </button>
                        <button
                            onClick={() => setShowReport(true)}
                            style={{
                                padding: '13px 22px', borderRadius: 12, cursor: 'pointer',
                                fontFamily: "'Outfit'", fontWeight: 600, fontSize: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                background: 'rgba(0,184,150,0.08)', color: '#00b896',
                                border: '1px solid rgba(0,184,150,0.25)', transition: 'all 0.3s',
                            }}
                        >
                            Generate Report
                        </button>
                    </div>
                    {showReport && (
                        <ReportModal prediction={result} onClose={() => setShowReport(false)} />
                    )}
                </div>
            )}
        </div>
    )
}
