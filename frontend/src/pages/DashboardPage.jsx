import { useState, useEffect } from 'react'
import client from '../api/client'
import GlassCard from '../components/GlassCard'
import Disclaimer from '../components/Disclaimer'
import StatCard from '../components/StatCard'

export default function DashboardPage() {
    const [stats, setStats] = useState(null)
    const [recent, setRecent] = useState([])

    useEffect(() => {
        client.get('/history/stats').then((r) => setStats(r.data)).catch(() => { })
        client.get('/history?per_page=5').then((r) => setRecent(r.data.items || [])).catch(() => { })
    }, [])

    return (
        <div>
            <h2 className="fi" style={{ fontSize: 24, fontWeight: 800, marginBottom: 22 }}>Dashboard</h2>
            <Disclaimer />

            <div className="fi1" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
                <StatCard label="Total Scans" value={stats?.total_predictions ?? '—'} icon="scan" delay="su" />
                <StatCard label="ASD Detected" value={stats?.asd_count ?? '—'} color="#ffb020" icon="warn" delay="su1" />
                <StatCard label="TD Detected" value={stats?.td_count ?? '—'} color="#00e09e" icon="check" delay="su2" />
                <StatCard label="Avg Confidence" value={stats ? `${(stats.avg_confidence * 100).toFixed(1)}%` : '—'} color="#00f0c8" icon="eye" delay="su3" />
            </div>

            {/* Today's activity */}
            <GlassCard className="su1" style={{ padding: 24, marginBottom: 22 }}>
                <p style={{ fontSize: 12, color: '#556677', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>Today's Activity</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 36, fontWeight: 700, color: '#00f0c8', lineHeight: 1 }}>
                            {stats?.predictions_today ?? '—'}
                        </p>
                        <p style={{ fontSize: 12, color: '#556677', marginTop: 6 }}>predictions today</p>
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,240,200,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 36, fontWeight: 700, color: '#e0e7ef', lineHeight: 1 }}>
                            {stats ? `${stats.avg_processing_time_ms.toFixed(0)}ms` : '—'}
                        </p>
                        <p style={{ fontSize: 12, color: '#556677', marginTop: 6 }}>avg processing time</p>
                    </div>
                </div>
            </GlassCard>

            {/* Recent predictions */}
            <GlassCard className="su2" style={{ padding: 24 }}>
                <p style={{ fontSize: 12, color: '#556677', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
                    Recent Predictions
                </p>
                {recent.length === 0 ? (
                    <p style={{ color: '#556677', fontSize: 13 }}>No predictions yet. Upload an image to get started.</p>
                ) : (
                    recent.map((p, i) => (
                        <div key={p.prediction_id} className={`fi${Math.min(i + 1, 5)}`} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '13px 0', borderBottom: i < recent.length - 1 ? '1px solid rgba(0,240,200,0.1)' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: p.label === 'ASD' ? '#ffb020' : '#00e09e',
                                    boxShadow: `0 0 10px ${p.label === 'ASD' ? '#ffb020' : '#00e09e'}55`,
                                }} />
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.label}</span>
                                    <span style={{ fontSize: 12, color: '#556677', marginLeft: 10 }}>
                                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    </span>
                                </div>
                            </div>
                            <span style={{
                                fontFamily: "'Fira Code', monospace", fontSize: 13, fontWeight: 600,
                                color: p.label === 'ASD' ? '#ffb020' : '#00e09e',
                                textShadow: `0 0 10px ${p.label === 'ASD' ? '#ffb020' : '#00e09e'}33`,
                            }}>
                                {Math.round(p.confidence * 100)}%
                            </span>
                        </div>
                    ))
                )}
            </GlassCard>
        </div>
    )
}
