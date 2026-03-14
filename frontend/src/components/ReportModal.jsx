import { useState } from 'react'
import { generateReport } from '../api/report'

const PURPOSES = [
    'Preliminary ASD Screening',
    'Research Study',
    'Parental Concern',
    'Clinical Referral',
    'Other',
]

const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#8899aa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
}

const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    outline: 'none',
    fontFamily: "'Outfit', sans-serif",
    fontSize: 14,
    color: '#e0e7ef',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0,240,200,0.12)',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
}

export default function ReportModal({ prediction, onClose }) {
    const [form, setForm] = useState({
        subject_name: '',
        subject_age: '',
        subject_gender: 'Male',
        tester_name: '',
        tester_designation: '',
        screening_purpose: PURPOSES[0],
        custom_purpose: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

    const handleGenerate = async () => {
        if (!form.subject_name.trim() || !form.subject_age || !form.tester_name.trim()) {
            setError('Subject Name, Age, and Tester Name are required.')
            return
        }
        if (form.screening_purpose === 'Other' && !form.custom_purpose.trim()) {
            setError('Please specify the purpose when "Other" is selected.')
            return
        }
        setLoading(true)
        setError('')
        try {
            const purpose =
                form.screening_purpose === 'Other'
                    ? form.custom_purpose.trim()
                    : form.screening_purpose

            const res = await generateReport({
                prediction_id: prediction.prediction_id,
                subject_name: form.subject_name.trim(),
                subject_age: parseInt(form.subject_age, 10),
                subject_gender: form.subject_gender,
                tester_name: form.tester_name.trim(),
                tester_designation: form.tester_designation.trim() || null,
                screening_purpose: purpose,
            })

            const url = window.URL.createObjectURL(
                new Blob([res.data], { type: 'application/pdf' })
            )
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `ASD_Report_${prediction.prediction_id}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            onClose()
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to generate report. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose()
    }

    return (
        <div
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'rgba(6,10,16,0.88)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
            }}
        >
            <div
                className="su"
                style={{
                    width: '100%',
                    maxWidth: 560,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'rgba(10,18,28,0.97)',
                    border: '1px solid rgba(0,240,200,0.18)',
                    borderRadius: 20,
                    boxShadow:
                        '0 0 60px rgba(0,240,200,0.07), 0 24px 48px rgba(0,0,0,0.6)',
                    padding: 28,
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                    }}
                >
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#e0e7ef', margin: 0 }}>
                        Generate Screening Report
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#556677',
                            fontSize: 22,
                            lineHeight: 1,
                            padding: '2px 8px',
                            borderRadius: 8,
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Prediction summary badge */}
                <div
                    style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        marginBottom: 20,
                        background:
                            prediction.label === 'ASD'
                                ? 'rgba(255,176,32,0.06)'
                                : 'rgba(0,224,158,0.06)',
                        border: `1px solid ${prediction.label === 'ASD' ? 'rgba(255,176,32,0.2)' : 'rgba(0,224,158,0.2)'}`,
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <span
                        style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: prediction.label === 'ASD' ? '#ffb020' : '#00e09e',
                        }}
                    >
                        {prediction.label === 'ASD' ? 'ASD Detected' : 'Typically Developing'}
                    </span>
                    <span style={{ color: '#556677', fontSize: 12 }}>·</span>
                    <span style={{ color: '#8899aa', fontSize: 12 }}>
                        Confidence: {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                    <span style={{ color: '#556677', fontSize: 12 }}>·</span>
                    <span style={{ color: '#556677', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>
                        ID: {prediction.prediction_id}
                    </span>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            marginBottom: 16,
                            background: 'rgba(255,68,102,0.08)',
                            border: '1px solid rgba(255,68,102,0.25)',
                        }}
                    >
                        <p style={{ fontSize: 12, color: '#ff4466', margin: 0 }}>{error}</p>
                    </div>
                )}

                {/* Form fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Subject Name */}
                    <div>
                        <label style={labelStyle}>Subject Name *</label>
                        <input
                            type="text"
                            value={form.subject_name}
                            onChange={(e) => set('subject_name', e.target.value)}
                            placeholder="Full name of the subject"
                            style={inputStyle}
                        />
                    </div>

                    {/* Age + Gender */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Age *</label>
                            <input
                                type="number"
                                value={form.subject_age}
                                min={1}
                                max={120}
                                onChange={(e) => set('subject_age', e.target.value)}
                                placeholder="Years"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Gender *</label>
                            <select
                                value={form.subject_gender}
                                onChange={(e) => set('subject_gender', e.target.value)}
                                style={inputStyle}
                            >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Tester Name */}
                    <div>
                        <label style={labelStyle}>Tester / Clinician Name *</label>
                        <input
                            type="text"
                            value={form.tester_name}
                            onChange={(e) => set('tester_name', e.target.value)}
                            placeholder="Name of the person conducting the screening"
                            style={inputStyle}
                        />
                    </div>

                    {/* Tester Designation */}
                    <div>
                        <label style={labelStyle}>
                            Tester Designation{' '}
                            <span style={{ color: '#445566', fontWeight: 400 }}>(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={form.tester_designation}
                            onChange={(e) => set('tester_designation', e.target.value)}
                            placeholder="e.g., Clinical Psychologist"
                            style={inputStyle}
                        />
                    </div>

                    {/* Screening Purpose */}
                    <div>
                        <label style={labelStyle}>Purpose of Screening *</label>
                        <select
                            value={form.screening_purpose}
                            onChange={(e) => set('screening_purpose', e.target.value)}
                            style={inputStyle}
                        >
                            {PURPOSES.map((p) => (
                                <option key={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom purpose (only when "Other" selected) */}
                    {form.screening_purpose === 'Other' && (
                        <div className="fi">
                            <label style={labelStyle}>Specify Purpose *</label>
                            <input
                                type="text"
                                value={form.custom_purpose}
                                onChange={(e) => set('custom_purpose', e.target.value)}
                                placeholder="Describe the purpose of this screening"
                                style={inputStyle}
                            />
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{
                            flex: 1,
                            height: 46,
                            borderRadius: 10,
                            border: 'none',
                            cursor: loading ? 'wait' : 'pointer',
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: 700,
                            fontSize: 14,
                            background: loading
                                ? 'rgba(0,184,150,0.35)'
                                : 'linear-gradient(135deg, #00b896, #008a6e)',
                            color: '#021a14',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            opacity: loading ? 0.75 : 1,
                            transition: 'all 0.2s',
                        }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ borderTopColor: '#021a14', borderColor: 'rgba(2,26,20,0.25)' }} />
                                Generating PDF...
                            </>
                        ) : (
                            'Generate Report'
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0 22px',
                            height: 46,
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: 600,
                            fontSize: 14,
                            background: 'transparent',
                            color: '#8899aa',
                            border: '1px solid rgba(0,240,200,0.1)',
                            transition: 'all 0.2s',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
