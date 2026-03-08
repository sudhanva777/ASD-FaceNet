import { useState, useEffect } from 'react'
import client from '../api/client'
import GlassCard from '../components/GlassCard'

export default function HistoryPage() {
    const [items, setItems] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [labelFilter, setLabelFilter] = useState('')
    const [loading, setLoading] = useState(false)

    const perPage = 20

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const params = { page, per_page: perPage }
            if (labelFilter) params.label = labelFilter
            const res = await client.get('/history', { params })
            setItems(res.data.items || [])
            setTotal(res.data.total || 0)
            setTotalPages(res.data.total_pages || 1)
        } catch {
            setItems([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchHistory() }, [page, labelFilter])

    return (
        <div>
            <div className="fi" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>History</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['', 'ASD', 'TD'].map((f) => (
                        <button
                            key={f}
                            onClick={() => { setLabelFilter(f); setPage(1) }}
                            style={{
                                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                fontFamily: "'Outfit'", cursor: 'pointer', transition: 'all 0.2s',
                                background: labelFilter === f ? 'rgba(0,240,200,0.1)' : 'transparent',
                                border: `1px solid ${labelFilter === f ? 'rgba(0,240,200,0.3)' : 'rgba(0,240,200,0.1)'}`,
                                color: labelFilter === f ? '#00f0c8' : '#556677',
                            }}
                        >
                            {f || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            <GlassCard className="su" style={{ overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 120px',
                    padding: '14px 24px', background: 'rgba(0,240,200,0.03)',
                    borderBottom: '1px solid rgba(0,240,200,0.1)',
                    fontSize: 10, color: '#556677', textTransform: 'uppercase',
                    letterSpacing: 2, fontWeight: 700,
                }}>
                    <span>ID</span><span>Label</span><span>Confidence</span><span>Time</span><span>Date</span>
                </div>

                {/* Rows */}
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#556677' }}>Loading...</div>
                ) : items.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#556677', fontSize: 14 }}>
                        No predictions found.
                    </div>
                ) : (
                    items.map((p, i) => (
                        <div
                            key={p.prediction_id}
                            className={`fi${Math.min(i + 1, 5)}`}
                            style={{
                                display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 120px',
                                padding: '16px 24px', fontSize: 13,
                                borderBottom: i < items.length - 1 ? '1px solid rgba(0,240,200,0.1)' : 'none',
                                transition: 'background 0.2s', cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,240,200,0.03)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 12, color: '#8899aa', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.prediction_id}
                            </span>
                            <span>
                                <span style={{
                                    padding: '3px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                                    background: p.label === 'ASD' ? 'rgba(255,176,32,0.2)' : 'rgba(0,224,158,0.2)',
                                    color: p.label === 'ASD' ? '#ffb020' : '#00e09e',
                                    boxShadow: `0 0 10px ${p.label === 'ASD' ? '#ffb020' : '#00e09e'}15`,
                                }}>
                                    {p.label}
                                </span>
                            </span>
                            <span style={{ fontFamily: "'Fira Code', monospace", fontWeight: 600 }}>
                                {Math.round(p.confidence * 100)}%
                            </span>
                            <span style={{ color: '#556677', fontFamily: "'Fira Code', monospace", fontSize: 12 }}>
                                {p.processing_time_ms}ms
                            </span>
                            <span style={{ color: '#556677', fontSize: 12 }}>
                                {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </span>
                        </div>
                    ))
                )}
            </GlassCard>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="fi2" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(0,240,200,0.1)',
                            background: 'transparent', color: page <= 1 ? '#333' : '#8899aa',
                            cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 13,
                            fontFamily: "'Outfit'", transition: 'all 0.2s',
                        }}
                    >
                        ← Prev
                    </button>
                    <span style={{
                        padding: '8px 16px', fontSize: 13, color: '#8899aa',
                        fontFamily: "'Fira Code', monospace",
                    }}>
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(0,240,200,0.1)',
                            background: 'transparent', color: page >= totalPages ? '#333' : '#8899aa',
                            cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13,
                            fontFamily: "'Outfit'", transition: 'all 0.2s',
                        }}
                    >
                        Next →
                    </button>
                </div>
            )}

            <p className="fi3" style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#556677' }}>
                {total} total prediction{total !== 1 ? 's' : ''}
            </p>
        </div>
    )
}
