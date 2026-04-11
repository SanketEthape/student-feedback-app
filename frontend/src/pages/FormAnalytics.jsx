import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api';

export default function FormAnalytics() {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [responses, setResponses] = useState([]);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get(`/forms/${id}`),
            api.get(`/analytics/form/${id}`),
            api.get(`/responses/form/${id}`)
        ]).then(([f, a, r]) => {
            setForm(f.data); setAnalytics(a.data); setResponses(r.data);
        }).finally(() => setLoading(false));
    }, [id]);

    const copyLink = () => {
        if (!form) return;
        navigator.clipboard.writeText(`${window.location.origin}/f/${form.uniqueLink}`);
        alert('Student link copied!');
    };

    if (loading) return <p style={{ color: 'var(--muted)' }}>Loading analytics...</p>;
    if (!form) return <p style={{ color: 'var(--danger)' }}>Form not found.</p>;

    const tabStyle = (t) => ({
        padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
        background: tab === t ? 'var(--accent)' : 'transparent',
        color: tab === t ? '#fff' : 'var(--muted)',
        border: 'none'
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2>{form.title}</h2>
                    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{form.subject} · {form.questions.length} questions · {responses.length} responses</p>
                </div>
                <button className="btn btn-primary" onClick={copyLink}>📋 Copy Student Link</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {['overview', 'responses', 'questions'].map(t => (
                    <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'Total Responses', value: analytics?.totalResponses || 0, color: 'var(--accent)' },
                            { label: 'Topics Covered', value: analytics?.topicStats?.length || 0, color: 'var(--accent2)' },
                            { label: 'Avg Understanding', value: analytics?.topicStats?.length > 0 ? Math.round(analytics.topicStats.reduce((a, b) => a + b.pct, 0) / analytics.topicStats.length) + '%' : 'N/A', color: 'var(--success)' }
                        ].map(stat => (
                            <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {analytics?.topicStats?.length > 0 && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <h3 style={{ marginBottom: 20, fontSize: 18 }}>Topic-wise Understanding</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={analytics.topicStats} margin={{ left: -10 }}>
                                    <XAxis dataKey="topic" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                                        formatter={(v) => [v + '%', 'Correct']}
                                    />
                                    <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                                        {analytics.topicStats.map((entry, i) => (
                                            <Cell key={i} fill={entry.pct >= 75 ? '#6af7b0' : entry.pct >= 50 ? '#f7c36a' : '#f76a6a'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {analytics?.aiInsight && (
                        <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
                            <h3 style={{ marginBottom: 12, fontSize: 18 }}>🤖 AI Teaching Insight</h3>
                            <p style={{ color: 'var(--text)', lineHeight: 1.7, fontSize: 14 }}>{analytics.aiInsight}</p>
                        </div>
                    )}
                </div>
            )}

            {tab === 'responses' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {responses.length === 0 ? <p style={{ color: 'var(--muted)' }}>No responses yet.</p> :
                        responses.map(r => (
                            <div key={r._id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div>
                                        <strong>{r.studentName}</strong>
                                        {r.rollNo && <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 8 }}>Roll: {r.rollNo}</span>}
                                    </div>
                                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>{new Date(r.submittedAt).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: r.recommendation ? 12 : 0, flexWrap: 'wrap' }}>
                                    {r.answers.map((a, i) => (
                                        <span key={i} className={`tag ${a.isCorrect === true ? 'tag-active' : a.isCorrect === false ? 'tag-inactive' : ''}`}
                                            style={{ background: a.isCorrect === null ? 'rgba(124,106,247,0.15)' : undefined, color: a.isCorrect === null ? 'var(--accent)' : undefined }}>
                                            {a.topic}
                                        </span>
                                    ))}
                                </div>
                                {r.recommendation && (
                                    <div style={{ background: 'rgba(124,106,247,0.08)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                                        <strong>💡 Recommendation:</strong> {r.recommendation}
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            )}

            {tab === 'questions' && (
                <div style={{ display: 'grid', gap: 12 }}>
                    {form.questions.map((q, i) => (
                        <div key={i} className="card">
                            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>Q{i + 1}</span>
                                <span className="tag" style={{ background: 'rgba(124,106,247,0.15)', color: 'var(--accent)', fontSize: 11 }}>{q.topic}</span>
                                <span className="tag" style={{ background: 'rgba(247,195,106,0.15)', color: 'var(--accent2)', fontSize: 11 }}>{q.type.toUpperCase()}</span>
                            </div>
                            <p style={{ fontSize: 14, marginBottom: q.options?.length ? 10 : 0 }}>{q.question}</p>
                            {q.options?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {q.options.map((opt, j) => (
                                        <span key={j} style={{
                                            padding: '4px 12px', borderRadius: 6, fontSize: 13,
                                            background: opt === q.correctOption ? 'rgba(106,247,176,0.15)' : 'rgba(255,255,255,0.05)',
                                            color: opt === q.correctOption ? 'var(--success)' : 'var(--muted)',
                                            border: `1px solid ${opt === q.correctOption ? 'var(--success)' : 'var(--border)'}`
                                        }}>{opt}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}