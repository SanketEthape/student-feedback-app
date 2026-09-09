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
    const [regeneratingIdx, setRegeneratingIdx] = useState(null);
    const [approvingIdx, setApprovingIdx] = useState(null);
    const [actionMsg, setActionMsg] = useState('');

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

    const handleApprove = async (qIndex) => {
        setApprovingIdx(qIndex);
        try {
            const { data } = await api.patch(`/forms/${id}/questions/${qIndex}/approve`);
            setForm(data);
            const approved = data.questions[qIndex].isApproved;
            setActionMsg(approved ? '✅ Question approved!' : '↩️ Approval removed.');
        } catch (e) {
            setActionMsg('❌ Failed to update approval.');
        } finally {
            setApprovingIdx(null);
            setTimeout(() => setActionMsg(''), 3000);
        }
    };

    const handleRegenerate = async (qIndex) => {
        if (!confirm('Regenerate this question using AI? The current question will be replaced.')) return;
        setRegeneratingIdx(qIndex);
        try {
            const { data } = await api.patch(`/forms/${id}/questions/${qIndex}/regenerate`);
            setForm(data);
            setActionMsg('🔄 Question regenerated successfully!');
        } catch (e) {
            setActionMsg('❌ ' + (e.response?.data?.message || 'Failed to regenerate question.'));
        } finally {
            setRegeneratingIdx(null);
            setTimeout(() => setActionMsg(''), 4000);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', padding: 40 }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Loading analytics...
        </div>
    );
    if (!form) return <p style={{ color: 'var(--danger)' }}>Form not found.</p>;

    const totalQuestions = form.questions.length;
    const approvedCount = form.questions.filter(q => q.isApproved).length;
    const allApproved = approvedCount === totalQuestions;

    const tabStyle = (t) => ({
        padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
        background: tab === t ? 'var(--accent)' : 'transparent',
        color: tab === t ? '#fff' : 'var(--muted)',
        border: tab === t ? 'none' : '1px solid transparent',
        transition: 'all 0.2s'
    });

    return (
        <div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
                .action-toast { animation: fadeIn 0.3s ease; }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ marginBottom: 4 }}>{form.title}</h2>
                    <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                        {form.subject} · {totalQuestions} questions · {responses.length} responses
                        {tab === 'questions' && (
                            <span style={{ marginLeft: 10 }}>
                                <span className={`tag ${allApproved ? 'tag-approved' : 'tag-pending'}`}>
                                    {approvedCount}/{totalQuestions} Approved
                                </span>
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <button className="btn btn-primary" onClick={copyLink}>📋 Copy Student Link</button>
                    {!allApproved && (
                        <p style={{ fontSize: 12, color: 'var(--accent2)', textAlign: 'right' }}>
                            ⚠️ {totalQuestions - approvedCount} question{totalQuestions - approvedCount > 1 ? 's' : ''} pending approval
                        </p>
                    )}
                </div>
            </div>

            {/* Toast notification */}
            {actionMsg && (
                <div className="action-toast" style={{
                    background: actionMsg.startsWith('❌') ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    border: `1px solid ${actionMsg.startsWith('❌') ? 'var(--danger)' : 'var(--success)'}`,
                    color: actionMsg.startsWith('❌') ? 'var(--danger)' : '#059669',
                    borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14, fontWeight: 500
                }}>
                    {actionMsg}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#f1f3fb', padding: 4, borderRadius: 10, width: 'fit-content' }}>
                {['overview', 'responses', 'questions'].map(t => (
                    <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                        {t === 'questions' ? `Questions (${approvedCount}/${totalQuestions} ✓)` : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
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
                                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(30,34,53,0.1)' }}
                                        formatter={(v) => [v + '%', 'Correct']}
                                    />
                                    <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                                        {analytics.topicStats.map((entry, i) => (
                                            <Cell key={i} fill={entry.pct >= 75 ? '#10b981' : entry.pct >= 50 ? '#f59e0b' : '#ef4444'} />
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

            {/* Responses Tab */}
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
                                            style={{ background: a.isCorrect === null ? 'rgba(79,110,247,0.1)' : undefined, color: a.isCorrect === null ? 'var(--accent)' : undefined }}>
                                            {a.topic}
                                        </span>
                                    ))}
                                </div>
                                {r.recommendation && (
                                    <div style={{ background: 'rgba(79,110,247,0.06)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6, border: '1px solid rgba(79,110,247,0.12)' }}>
                                        <strong>💡 Recommendation:</strong> {r.recommendation}
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            )}

            {/* Questions Tab — with Approve + Regenerate */}
            {tab === 'questions' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* Summary bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: allApproved ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.07)',
                        border: `1px solid ${allApproved ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'}`,
                        borderRadius: 10, padding: '12px 18px', fontSize: 14
                    }}>
                        <span style={{ color: allApproved ? '#059669' : '#b45309', fontWeight: 600 }}>
                            {allApproved ? '✅ All questions approved — form is ready to share!' : `⏳ ${totalQuestions - approvedCount} question${totalQuestions - approvedCount > 1 ? 's' : ''} still need your approval`}
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{approvedCount} of {totalQuestions} approved</span>
                    </div>

                    {form.questions.map((q, i) => (
                        <div key={i} className="card" style={{
                            borderLeft: `4px solid ${q.isApproved ? 'var(--success)' : 'var(--border)'}`,
                            transition: 'border-left-color 0.3s, box-shadow 0.2s'
                        }}>
                            {/* Question header row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                                    <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, minWidth: 24 }}>Q{i + 1}</span>
                                    <span className="tag" style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--accent)', fontSize: 11 }}>{q.topic}</span>
                                    <span className="tag" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309', fontSize: 11 }}>{q.type.toUpperCase()}</span>
                                    <span className={`tag ${q.isApproved ? 'tag-approved' : 'tag-pending'}`} style={{ fontSize: 11 }}>
                                        {q.isApproved ? '✓ Approved' : '⏳ Pending'}
                                    </span>
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    {/* Regenerate button */}
                                    <button
                                        className="btn btn-warning"
                                        style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                                        onClick={() => handleRegenerate(i)}
                                        disabled={regeneratingIdx === i || approvingIdx === i}
                                        title="Regenerate this question using AI"
                                    >
                                        {regeneratingIdx === i ? (
                                            <>
                                                <span style={{ width: 12, height: 12, border: '2px solid #b45309', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                                Regenerating...
                                            </>
                                        ) : '🔄 Reframe'}
                                    </button>

                                    {/* Approve button */}
                                    <button
                                        className={`btn ${q.isApproved ? 'btn-success' : 'btn-secondary'}`}
                                        style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}
                                        onClick={() => handleApprove(i)}
                                        disabled={approvingIdx === i || regeneratingIdx === i}
                                        title={q.isApproved ? 'Revoke approval' : 'Approve this question'}
                                    >
                                        {approvingIdx === i ? (
                                            <>
                                                <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                                Saving...
                                            </>
                                        ) : q.isApproved ? '✓ Approved' : '✓ Approve'}
                                    </button>
                                </div>
                            </div>

                            {/* Question text */}
                            <p style={{ fontSize: 14, marginBottom: q.options?.length ? 12 : 0, lineHeight: 1.6, color: 'var(--text)' }}>{q.question}</p>

                            {/* Options */}
                            {q.options?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {q.options.map((opt, j) => (
                                        <span key={j} style={{
                                            padding: '5px 14px', borderRadius: 6, fontSize: 13,
                                            background: opt === q.correctOption ? 'rgba(16,185,129,0.1)' : '#f9fafb',
                                            color: opt === q.correctOption ? '#059669' : 'var(--muted)',
                                            border: `1px solid ${opt === q.correctOption ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`,
                                            fontWeight: opt === q.correctOption ? 600 : 400
                                        }}>{opt === q.correctOption ? '✓ ' : ''}{opt}</span>
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