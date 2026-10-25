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

    // Manual Question Edit State
    const [editingIdx, setEditingIdx] = useState(null);
    const [editFormData, setEditFormData] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    // Topic Video Links State
    const [videoLinks, setVideoLinks] = useState([]);
    const [savingVideos, setSavingVideos] = useState(false);

    // Publishing & Target Classes/Divisions/Branches State
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [targetBranches, setTargetBranches] = useState([]);
    const [targetClasses, setTargetClasses] = useState([]);
    const [targetDivisions, setTargetDivisions] = useState([]);
    const [allowAnonymous, setAllowAnonymous] = useState(true);
    const [reattemptDays, setReattemptDays] = useState(0);
    const [availableTargets, setAvailableTargets] = useState({
        branches: [
            'Computer Engineering',
            'Information Technology',
            'AI & Data Science',
            'Electronics & Telecommunication',
            'Mechanical Engineering',
            'Civil Engineering',
            'Electrical Engineering'
        ],
        classes: ['FY', 'SY', 'TY', 'Final Year'],
        divisions: ['A', 'B', 'C', 'D']
    });

    // Add New Question to Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addingQuestion, setAddingQuestion] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [deletingIdx, setDeletingIdx] = useState(null);
    const [newQuestionData, setNewQuestionData] = useState({
        question: '',
        type: 'mcq',
        topic: '',
        options: ['', '', '', ''],
        correctOption: '',
        explanation: '',
        expectedAnswer: ''
    });

    useEffect(() => {
        Promise.all([
            api.get(`/forms/${id}`),
            api.get(`/analytics/form/${id}`),
            api.get(`/responses/form/${id}`),
            api.get(`/forms/${id}/available-targets`).catch(() => ({ data: null }))
        ]).then(([f, a, r, targetsRes]) => {
            setForm(f.data);
            setAnalytics(a.data);
            setResponses(r.data);

            // Initialize publishing settings
            setTargetBranches(f.data.targetBranches || []);
            setTargetClasses(f.data.targetClasses || []);
            setTargetDivisions(f.data.targetDivisions || []);
            setAllowAnonymous(f.data.allowAnonymous !== undefined ? f.data.allowAnonymous : true);
            setReattemptDays(f.data.reattemptDays !== undefined ? f.data.reattemptDays : 0);

            if (targetsRes?.data) {
                setAvailableTargets({
                    branches: targetsRes.data.branches?.length ? targetsRes.data.branches : [
                        'Computer Engineering',
                        'Information Technology',
                        'AI & Data Science',
                        'Electronics & Telecommunication',
                        'Mechanical Engineering',
                        'Civil Engineering',
                        'Electrical Engineering'
                    ],
                    classes: targetsRes.data.classes?.length ? targetsRes.data.classes : ['FY', 'SY', 'TY', 'Final Year'],
                    divisions: targetsRes.data.divisions?.length ? targetsRes.data.divisions : ['A', 'B', 'C', 'D']
                });
            }

            // Initialize topic video links from form.topicResources
            const resources = f.data.topicResources || [];
            // Merge with any derived topics present in questions if not yet saved
            const qTopics = [...new Set(f.data.questions.map(q => q.topic?.trim()).filter(Boolean))];
            const merged = [...resources];
            qTopics.forEach(qt => {
                if (!merged.some(m => m.topic.toLowerCase() === qt.toLowerCase())) {
                    merged.push({ topic: qt, videoUrl: '', title: '' });
                }
            });
            setVideoLinks(merged);
        }).finally(() => setLoading(false));
    }, [id]);

    const handlePublishForm = async () => {
        if (targetBranches.length === 0) {
            alert('Please select at least one branch/department to target (e.g. Computer Engineering, IT).');
            return;
        }
        if (targetClasses.length === 0) {
            alert('Please select at least one class to target (e.g. FY, SY, TY, Final Year).');
            return;
        }
        if (targetDivisions.length === 0) {
            alert('Please select at least one division to target (e.g. A, B, C, D).');
            return;
        }
        setPublishing(true);
        try {
            const { data } = await api.post(`/forms/${id}/publish`, {
                targetBranches,
                targetClasses,
                targetDivisions,
                allowAnonymous,
                reattemptDays: Number(reattemptDays) || 0
            });
            setForm(data.form);
            setShowPublishModal(false);
            setActionMsg(`📢 Assessment published! ${data.notificationsCount} students notified.`);
        } catch (e) {
            setActionMsg('❌ ' + (e.response?.data?.message || 'Failed to publish assessment'));
        } finally {
            setPublishing(false);
            setTimeout(() => setActionMsg(''), 4500);
        }
    };

    const toggleTargetBranch = (br) => {
        setTargetBranches(prev =>
            prev.includes(br) ? prev.filter(b => b !== br) : [...prev, br]
        );
    };

    const toggleTargetClass = (cls) => {
        setTargetClasses(prev =>
            prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
        );
    };

    const toggleTargetDivision = (div) => {
        setTargetDivisions(prev =>
            prev.includes(div) ? prev.filter(d => d !== div) : [...prev, div]
        );
    };

    const handleApprove = async (qIndex) => {
        setApprovingIdx(qIndex);
        try {
            const { data } = await api.patch(`/forms/${id}/questions/${qIndex}/approve`);
            setForm(data);
            const approved = data.questions[qIndex].isApproved;
            setActionMsg(approved ? '✅ Question approved!' : '↩️ Approval removed.');
        } catch {
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

    // Start manual editing of a question
    const startManualEdit = (idx) => {
        const q = form.questions[idx];
        let opts = Array.isArray(q.options) && q.options.length > 0 ? [...q.options] : ['', '', '', ''];
        if ((q.type || 'mcq') === 'mcq' && opts.length < 4) {
            while (opts.length < 4) opts.push('');
        }
        setEditingIdx(idx);
        setEditFormData({
            question: q.question || '',
            topic: q.topic || '',
            type: q.type || 'mcq',
            options: opts,
            correctOption: q.correctOption || opts[0] || '',
            explanation: q.explanation || '',
            expectedAnswer: q.expectedAnswer || '',
            isApproved: q.isApproved || false
        });
    };

    const cancelManualEdit = () => {
        setEditingIdx(null);
        setEditFormData(null);
    };

    const handleOptionTextChange = (optIdx, val) => {
        if (!editFormData) return;
        const newOpts = [...editFormData.options];
        const oldVal = newOpts[optIdx];
        newOpts[optIdx] = val;
        const newCorrect = editFormData.correctOption === oldVal ? val : editFormData.correctOption;
        setEditFormData({ ...editFormData, options: newOpts, correctOption: newCorrect });
    };

    const handleAddOption = () => {
        if (!editFormData) return;
        setEditFormData({
            ...editFormData,
            options: [...editFormData.options, '']
        });
    };

    const handleRemoveOption = (optIdx) => {
        if (!editFormData || editFormData.options.length <= 2) return;
        const removedVal = editFormData.options[optIdx];
        const newOpts = editFormData.options.filter((_, i) => i !== optIdx);
        const newCorrect = editFormData.correctOption === removedVal ? (newOpts[0] || '') : editFormData.correctOption;
        setEditFormData({
            ...editFormData,
            options: newOpts,
            correctOption: newCorrect
        });
    };

    const handleTypeSwitch = (newType) => {
        if (!editFormData) return;
        let opts = [...(editFormData.options || [])];
        if (newType === 'mcq' && opts.length < 4) {
            while (opts.length < 4) opts.push('');
        }
        setEditFormData({
            ...editFormData,
            type: newType,
            options: newType === 'mcq' ? opts : (newType === 'scale' ? ['1', '2', '3', '4', '5'] : []),
            correctOption: newType === 'mcq' ? (editFormData.correctOption || opts[0] || '') : ''
        });
    };

    const saveManualEdit = async (idx) => {
        if (!editFormData.question.trim()) {
            alert('Question text cannot be empty');
            return;
        }
        if (editFormData.type === 'mcq') {
            const cleanedOptions = editFormData.options.map(o => o.trim()).filter(Boolean);
            if (cleanedOptions.length < 2) {
                alert('MCQ must have at least 2 non-empty options');
                return;
            }
            if (!editFormData.correctOption || !cleanedOptions.includes(editFormData.correctOption.trim())) {
                alert('Please select or specify a valid correct option among the provided options');
                return;
            }
            editFormData.options = cleanedOptions;
            editFormData.correctOption = editFormData.correctOption.trim();
        }

        setSavingEdit(true);
        try {
            const { data } = await api.put(`/forms/${id}/questions/${idx}`, editFormData);
            setForm(data);
            setEditingIdx(null);
            setEditFormData(null);
            setActionMsg('✅ Question updated successfully!');
        } catch (e) {
            setActionMsg('❌ ' + (e.response?.data?.message || 'Failed to update question'));
        } finally {
            setSavingEdit(false);
            setTimeout(() => setActionMsg(''), 3500);
        }
    };

    // Add New Question Handlers
    const resetNewQuestionForm = () => {
        const availableTopics = [...new Set((form?.questions || []).map(q => q.topic?.trim()).filter(Boolean))];
        setNewQuestionData({
            question: '',
            type: 'mcq',
            topic: availableTopics[0] || (form?.subject ? `${form.subject} Fundamentals` : 'General'),
            options: ['', '', '', ''],
            correctOption: '',
            explanation: '',
            expectedAnswer: ''
        });
    };

    const handleCreateQuestion = async () => {
        if (!newQuestionData.question.trim()) {
            alert('Please enter question text');
            return;
        }
        if (!newQuestionData.topic.trim()) {
            alert('Please enter or select a syllabus topic');
            return;
        }

        const payload = { ...newQuestionData };

        if (payload.type === 'mcq') {
            const cleanedOptions = payload.options.map(o => o.trim()).filter(Boolean);
            if (cleanedOptions.length < 2) {
                alert('MCQ must have at least 2 non-empty options');
                return;
            }
            if (!payload.correctOption || !cleanedOptions.includes(payload.correctOption.trim())) {
                alert('Please select a valid correct option among the provided choices');
                return;
            }
            payload.options = cleanedOptions;
            payload.correctOption = payload.correctOption.trim();
        }

        setAddingQuestion(true);
        try {
            const { data } = await api.post(`/forms/${id}/questions`, payload);
            setForm(data);
            setShowAddModal(false);
            resetNewQuestionForm();
            setActionMsg('➕ Question added to form successfully!');
        } catch (e) {
            setActionMsg('❌ ' + (e.response?.data?.message || 'Failed to add question'));
        } finally {
            setAddingQuestion(false);
            setTimeout(() => setActionMsg(''), 4000);
        }
    };

    const handleGenerateSingleAI = async () => {
        if (!newQuestionData.topic.trim()) {
            alert('Please provide a topic for AI question generation');
            return;
        }
        setAiGenerating(true);
        try {
            const { data } = await api.post(`/forms/${id}/questions/generate-ai`, {
                topic: newQuestionData.topic.trim(),
                type: newQuestionData.type
            });
            setForm(data.form);
            setShowAddModal(false);
            resetNewQuestionForm();
            setActionMsg('✨ AI Question generated and added to form!');
        } catch (e) {
            setActionMsg('❌ ' + (e.response?.data?.message || 'Failed to generate AI question'));
        } finally {
            setAiGenerating(false);
            setTimeout(() => setActionMsg(''), 4000);
        }
    };

    const handleDeleteQuestion = async (qIndex) => {
        if (!confirm(`Are you sure you want to delete Question #${qIndex + 1}? This action cannot be undone.`)) return;
        setDeletingIdx(qIndex);
        try {
            const { data } = await api.delete(`/forms/${id}/questions/${qIndex}`);
            setForm(data);
            setActionMsg('🗑️ Question removed from form.');
        } catch (e) {
            setActionMsg('❌ ' + (e.response?.data?.message || 'Failed to delete question'));
        } finally {
            setDeletingIdx(null);
            setTimeout(() => setActionMsg(''), 3000);
        }
    };

    // Save topic video links
    const saveVideoLinks = async () => {
        setSavingVideos(true);
        try {
            const { data } = await api.patch(`/forms/${id}/topics/videos`, { topicResources: videoLinks });
            setForm(data);
            // Refresh analytics topic video references
            const anRes = await api.get(`/analytics/form/${id}`);
            setAnalytics(anRes.data);
            setActionMsg('🎥 Topic recommended video links saved successfully!');
        } catch (e) {
            setActionMsg('❌ ' + (e.response?.data?.message || 'Failed to save video links'));
        } finally {
            setSavingVideos(false);
            setTimeout(() => setActionMsg(''), 3500);
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
        padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
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
                    {form.isPublished ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span style={{
                                padding: '6px 12px',
                                borderRadius: 20,
                                background: 'rgba(34, 197, 94, 0.12)',
                                color: '#16a34a',
                                fontSize: 13,
                                fontWeight: 600,
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                                Published: {form.targetBranches?.length ? (form.targetBranches.length > 2 ? `${form.targetBranches.slice(0, 2).join(', ')} +${form.targetBranches.length - 2}` : form.targetBranches.join(', ')) : 'All Branches'} · {form.targetClasses?.join(', ')} ({form.targetDivisions?.join(', ')})
                            </span>
                            <button className="btn btn-secondary" onClick={() => setShowPublishModal(true)} style={{ fontSize: 13, padding: '6px 12px' }}>
                                ⚙️ Target &amp; Settings
                            </button>
                        </div>
                    ) : (
                        <button className="btn btn-primary" onClick={() => setShowPublishModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            📢 Publish Assessment
                        </button>
                    )}
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
            <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#f1f3fb', padding: 4, borderRadius: 10, width: 'fit-content', flexWrap: 'wrap' }}>
                {['overview', 'topics', 'questions', 'responses'].map(t => (
                    <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                        {t === 'questions'
                            ? `Questions (${approvedCount}/${totalQuestions} ✓)`
                            : t === 'topics'
                                ? `📚 Topic Videos (${videoLinks.filter(v => v.videoUrl).length}/${videoLinks.length})`
                                : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* ========================================================= */}
            {/* OVERVIEW TAB */}
            {/* ========================================================= */}
            {tab === 'overview' && (
                <div>
                    {/* Top Overview Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 20 }}>
                        {[
                            { label: 'Total Responses', value: analytics?.totalResponses || 0, color: 'var(--accent)' },
                            { label: 'Derived Topics', value: analytics?.topicStats?.length || videoLinks.length || 0, color: 'var(--accent2)' },
                            {
                                label: 'Class Avg Understanding',
                                value: analytics?.topicStats?.length > 0
                                    ? Math.round(analytics.topicStats.reduce((a, b) => a + (b.avgScore || b.pct), 0) / analytics.topicStats.length) + '%'
                                    : 'N/A',
                                color: 'var(--success)'
                            }
                        ].map(stat => (
                            <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Standout Highlights: Most Understood & Lowest Understood */}
                    {analytics?.topicStats?.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                            {/* Most Understood */}
                            {analytics.mostUnderstoodTopic && (
                                <div className="card" style={{
                                    borderLeft: '5px solid #10b981',
                                    background: 'linear-gradient(to right, rgba(16,185,129,0.05), transparent)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            🏆 Most Understood {analytics.mostUnderstoodTopic.isTie ? `Topics (${analytics.mostUnderstoodTopic.count} Tied)` : 'Topic'}
                                        </span>
                                        <span style={{
                                            background: '#10b981', color: '#fff', padding: '2px 10px',
                                            borderRadius: 12, fontSize: 12, fontWeight: 700
                                        }}>
                                            {analytics.mostUnderstoodTopic.avgScore || analytics.mostUnderstoodTopic.pct}% Avg
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: 18, marginBottom: 4, color: 'var(--text)' }}>
                                        {analytics.mostUnderstoodTopic.topic}
                                    </h3>
                                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                                        {analytics.mostUnderstoodTopic.isTie
                                            ? `Class demonstrated highest mastery across these ${analytics.mostUnderstoodTopic.count} tied topics.`
                                            : 'Class demonstrated highest mastery in this concept.'}
                                    </p>
                                </div>
                            )}

                            {/* Lowest Understood */}
                            {analytics.lowestUnderstoodTopic && (
                                <div className="card" style={{
                                    borderLeft: '5px solid #ef4444',
                                    background: 'linear-gradient(to right, rgba(239,68,68,0.05), transparent)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            ⚠️ Lowest Understood {analytics.lowestUnderstoodTopic.isTie ? `Topics (${analytics.lowestUnderstoodTopic.count} Tied Priority)` : 'Topic (Priority)'}
                                        </span>
                                        <span style={{
                                            background: '#ef4444', color: '#fff', padding: '2px 10px',
                                            borderRadius: 12, fontSize: 12, fontWeight: 700
                                        }}>
                                            {analytics.lowestUnderstoodTopic.avgScore || analytics.lowestUnderstoodTopic.pct}% Avg
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: 18, marginBottom: 4, color: 'var(--text)' }}>
                                        {analytics.lowestUnderstoodTopic.topic}
                                    </h3>
                                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                                        {analytics.lowestUnderstoodTopic.isTie
                                            ? `These ${analytics.lowestUnderstoodTopic.count} topics tied for lowest score and require immediate classroom reteaching.`
                                            : 'Requires immediate classroom reteaching and targeted review.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chart */}
                    {analytics?.topicStats?.length > 0 && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <h3 style={{ marginBottom: 20, fontSize: 18 }}>Topic-wise Understanding Level</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={analytics.topicStats} margin={{ left: -10 }}>
                                    <XAxis dataKey="topic" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(30,34,53,0.1)' }}
                                        formatter={(v) => [`${v}%`, 'Understanding']}
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

                    {/* Class-wide Summary */}
                    {(analytics?.classSummary || analytics?.aiInsight) && (
                        <div className="card" style={{ borderLeft: '4px solid var(--accent)', marginBottom: 24 }}>
                            <h3 style={{ marginBottom: 10, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                                🤖 Class-Wide Assessment Summary
                            </h3>
                            <p style={{ color: 'var(--text)', lineHeight: 1.7, fontSize: 14, margin: 0 }}>
                                {analytics.classSummary || analytics.aiInsight}
                            </p>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TOPIC-BY-TOPIC DIAGNOSTICS & TEACHING SOLUTIONS */}
                    {/* ========================================================= */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <h3 style={{ fontSize: 19, margin: '0 0 4px' }}>🎯 Detailed Topic Diagnostic Insights & Solutions</h3>
                                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                                    Per-topic comprehension level, diagnostic breakdown, and recommended solutions to bridge knowledge gaps
                                </p>
                            </div>
                        </div>

                        {(!analytics?.topicStats || analytics.topicStats.length === 0) ? (
                            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                <p>No student submissions yet. Topic diagnostics and solutions will appear here once students submit responses.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 16 }}>
                                {analytics.topicStats.map((stat, i) => {
                                    const insightItem = (analytics.topicInsights || []).find(
                                        ti => ti.topic && ti.topic.trim().toLowerCase() === stat.topic.trim().toLowerCase()
                                    ) || {};

                                    const isLowest = analytics.lowestUnderstoodTopic?.topics
                                        ? analytics.lowestUnderstoodTopic.topics.includes(stat.topic)
                                        : analytics.lowestUnderstoodTopic?.topic === stat.topic;
                                    const isMost = analytics.mostUnderstoodTopic?.topics
                                        ? analytics.mostUnderstoodTopic.topics.includes(stat.topic)
                                        : analytics.mostUnderstoodTopic?.topic === stat.topic;
                                    const score = stat.avgScore || stat.pct;
                                    const badgeColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                                    const badgeBg = score >= 75 ? 'rgba(16,185,129,0.1)' : score >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

                                    return (
                                        <div key={i} className="card" style={{
                                            borderLeft: `5px solid ${badgeColor}`,
                                            position: 'relative'
                                        }}>
                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <h4 style={{ margin: 0, fontSize: 17, color: 'var(--text)' }}>{stat.topic}</h4>
                                                        {isLowest && (
                                                            <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                                                                {analytics.lowestUnderstoodTopic?.isTie ? 'LOWEST UNDERSTOOD (TIED)' : 'LOWEST UNDERSTOOD'}
                                                            </span>
                                                        )}
                                                        {isMost && (
                                                            <span style={{ background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                                                                {analytics.mostUnderstoodTopic?.isTie ? 'MOST UNDERSTOOD (TIED)' : 'MOST UNDERSTOOD'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                                                        {stat.totalAnswers} student answers recorded
                                                        {stat.mcqCount > 0 && ` (${stat.correct} correct, ${stat.wrong} wrong)`}
                                                    </p>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{
                                                        background: badgeBg, color: badgeColor,
                                                        border: `1px solid ${badgeColor}40`,
                                                        borderRadius: 8, padding: '4px 12px',
                                                        fontSize: 13, fontWeight: 700
                                                    }}>
                                                        {score}% · {stat.level || (score >= 75 ? 'Good Understanding' : score >= 50 ? 'Average Understanding' : 'Needs Improvement')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Insight & Solution Grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 12 }}>
                                                {/* Diagnostic Insight */}
                                                <div style={{
                                                    background: '#f8fafc', border: '1px solid var(--border)',
                                                    borderRadius: 8, padding: '12px 14px'
                                                }}>
                                                    <strong style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                        🧐 Current Understanding Diagnosis
                                                    </strong>
                                                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                                                        {insightItem.insight || `Students averaged ${score}% in this topic.`}
                                                    </p>
                                                </div>

                                                {/* Actionable Teaching Solution */}
                                                <div style={{
                                                    background: 'rgba(79,110,247,0.04)', border: '1px solid rgba(79,110,247,0.15)',
                                                    borderRadius: 8, padding: '12px 14px'
                                                }}>
                                                    <strong style={{ fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                        💡 Actionable Solution to Improve Understanding
                                                    </strong>
                                                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                                                        {insightItem.solution || `Review fundamental concepts of ${stat.topic} and practice application problems in class.`}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Attached Recommended Video indicator */}
                                            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                                    {stat.videoUrl ? (
                                                        <span style={{ color: '#059669', fontWeight: 600 }}>
                                                            🎥 Curated Video Attached: <a href={stat.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{stat.videoUrl}</a>
                                                        </span>
                                                    ) : (
                                                        <span>🎥 No faculty video link attached yet.</span>
                                                    )}
                                                </span>
                                                <button
                                                    onClick={() => setTab('topics')}
                                                    style={{
                                                        background: 'none', border: 'none', color: 'var(--accent)',
                                                        fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0
                                                    }}
                                                >
                                                    {stat.videoUrl ? 'Edit Video Link →' : '+ Add Recommended Video Link →'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* TOPIC VIDEOS & RESOURCES TAB */}
            {/* ========================================================= */}
            {tab === 'topics' && (
                <div style={{ display: 'grid', gap: 20 }}>
                    <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>📺 Recommended Video Links for Derived Syllabus Topics</h3>
                        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                            Add your recommended educational video link (YouTube, Vimeo, Google Drive, or college LMS video) for each derived topic.
                            When students complete their assessment and have low or average understanding on a topic, your curated video link will be directly recommended to them!
                        </p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h4 style={{ margin: 0, fontSize: 16 }}>Derived Syllabus Topics ({videoLinks.length})</h4>
                            <button
                                className="btn btn-primary"
                                onClick={saveVideoLinks}
                                disabled={savingVideos}
                                style={{ padding: '8px 20px', fontSize: 14 }}
                            >
                                {savingVideos ? 'Saving...' : '💾 Save All Video Links'}
                            </button>
                        </div>

                        {videoLinks.length === 0 ? (
                            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>No topics found for this form.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: 16 }}>
                                {videoLinks.map((item, idx) => (
                                    <div key={idx} style={{
                                        border: '1px solid var(--border)', borderRadius: 10,
                                        padding: '14px 18px', background: '#fafbfc'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{
                                                    background: 'rgba(79,110,247,0.1)', color: 'var(--accent)',
                                                    padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700
                                                }}>
                                                    Topic #{idx + 1}
                                                </span>
                                                <strong style={{ fontSize: 15, color: 'var(--text)' }}>{item.topic}</strong>
                                            </div>
                                            {item.videoUrl && (
                                                <a
                                                    href={item.videoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontSize: 12, color: '#059669', background: 'rgba(16,185,129,0.1)',
                                                        padding: '3px 8px', borderRadius: 4, textDecoration: 'none', fontWeight: 600
                                                    }}
                                                >
                                                    ▶️ Test Link
                                                </a>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <input
                                                type="url"
                                                placeholder="https://www.youtube.com/watch?v=... or any video link"
                                                value={item.videoUrl || ''}
                                                onChange={e => {
                                                    const updated = [...videoLinks];
                                                    updated[idx] = { ...updated[idx], videoUrl: e.target.value };
                                                    setVideoLinks(updated);
                                                }}
                                                style={{ flex: 1, padding: '9px 12px', fontSize: 13 }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: 20, textAlign: 'right' }}>
                            <button
                                className="btn btn-primary"
                                onClick={saveVideoLinks}
                                disabled={savingVideos}
                                style={{ padding: '10px 24px', fontSize: 14 }}
                            >
                                {savingVideos ? 'Saving...' : '💾 Save All Video Links'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* QUESTIONS TAB — With Manual Reframe & AI Reframe */}
            {/* ========================================================= */}
            {tab === 'questions' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* Summary & Action bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: allApproved ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.07)',
                        border: `1px solid ${allApproved ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'}`,
                        borderRadius: 10, padding: '12px 18px', fontSize: 14, flexWrap: 'wrap', gap: 10
                    }}>
                        <div>
                            <span style={{ color: allApproved ? '#059669' : '#b45309', fontWeight: 600 }}>
                                {allApproved ? '✅ All questions approved — form is ready to share!' : `⏳ ${totalQuestions - approvedCount} question${totalQuestions - approvedCount > 1 ? 's' : ''} still need your approval`}
                            </span>
                            <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 10 }}>{approvedCount} of {totalQuestions} approved</span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                resetNewQuestionForm();
                                setShowAddModal(true);
                            }}
                            style={{ fontSize: 13, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            ➕ Add New Question
                        </button>
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
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {/* Manual Edit Button */}
                                    <button
                                        className="btn btn-secondary"
                                        style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                                        onClick={() => editingIdx === i ? cancelManualEdit() : startManualEdit(i)}
                                        disabled={regeneratingIdx === i || savingEdit || deletingIdx === i}
                                        title="Manually edit / reframe question"
                                    >
                                        {editingIdx === i ? '✕ Cancel Edit' : '✏️ Manual Reframe'}
                                    </button>

                                    {/* AI Regenerate button */}
                                    <button
                                        className="btn btn-warning"
                                        style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                                        onClick={() => handleRegenerate(i)}
                                        disabled={regeneratingIdx === i || approvingIdx === i || editingIdx === i || deletingIdx === i}
                                        title="Regenerate this question using AI"
                                    >
                                        {regeneratingIdx === i ? (
                                            <>
                                                <span style={{ width: 12, height: 12, border: '2px solid #b45309', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                                Regenerating...
                                            </>
                                        ) : '🔄 AI Reframe'}
                                    </button>

                                    {/* Approve button */}
                                    <button
                                        className={`btn ${q.isApproved ? 'btn-success' : 'btn-secondary'}`}
                                        style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}
                                        onClick={() => handleApprove(i)}
                                        disabled={approvingIdx === i || regeneratingIdx === i || editingIdx === i || deletingIdx === i}
                                        title={q.isApproved ? 'Revoke approval' : 'Approve this question'}
                                    >
                                        {approvingIdx === i ? (
                                            <>
                                                <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                                                Saving...
                                            </>
                                        ) : q.isApproved ? '✓ Approved' : '✓ Approve'}
                                    </button>

                                    {/* Delete Question Button */}
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ fontSize: 12, padding: '6px 10px', color: '#dc2626', borderColor: '#fca5a5' }}
                                        onClick={() => handleDeleteQuestion(i)}
                                        disabled={deletingIdx === i || editingIdx === i || form.questions.length <= 1}
                                        title={form.questions.length <= 1 ? 'Cannot delete the only question' : 'Delete question'}
                                    >
                                        {deletingIdx === i ? '...' : '🗑️'}
                                    </button>
                                </div>
                            </div>

                            {/* INLINE MANUAL EDIT MODE */}
                            {editingIdx === i ? (
                                <div style={{ background: '#f8fafc', border: '2px solid var(--accent)', borderRadius: 10, padding: 18, marginTop: 10, boxShadow: '0 4px 14px rgba(79, 110, 247, 0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                                        <h4 style={{ margin: 0, fontSize: 15, color: 'var(--accent)' }}>✏️ Manually Reframe Question #{i + 1}</h4>

                                        {/* Question Type Switcher */}
                                        <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', padding: 3, borderRadius: 8 }}>
                                            {[
                                                { id: 'mcq', label: '🔘 MCQ' },
                                                { id: 'text', label: '✍️ Descriptive' },
                                                { id: 'scale', label: '📊 Scale' }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => handleTypeSwitch(t.id)}
                                                    style={{
                                                        padding: '4px 10px', fontSize: 12, fontWeight: 600,
                                                        borderRadius: 6, border: 'none', cursor: 'pointer',
                                                        background: editFormData.type === t.id ? '#fff' : 'transparent',
                                                        color: editFormData.type === t.id ? 'var(--accent)' : 'var(--muted)',
                                                        boxShadow: editFormData.type === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                                    }}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Topic */}
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Syllabus Topic</label>
                                        <input
                                            value={editFormData.topic}
                                            onChange={e => setEditFormData({ ...editFormData, topic: e.target.value })}
                                            placeholder="Topic name (e.g. Binary Search Trees)"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: '#fff' }}
                                        />
                                    </div>

                                    {/* Question Text */}
                                    <div style={{ marginBottom: 14 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Question Prompt</label>
                                        <textarea
                                            value={editFormData.question}
                                            onChange={e => setEditFormData({ ...editFormData, question: e.target.value })}
                                            rows={3}
                                            placeholder="Type the question text here..."
                                            style={{ width: '100%', padding: '9px 12px', fontSize: 13, resize: 'vertical', background: '#fff' }}
                                        />
                                    </div>

                                    {/* MCQ Options Editor */}
                                    {editFormData.type === 'mcq' && (
                                        <div style={{
                                            marginBottom: 16,
                                            background: '#ffffff',
                                            border: '1px solid var(--border)',
                                            borderRadius: 8,
                                            padding: '14px 16px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <div>
                                                    <strong style={{ fontSize: 13, color: 'var(--text)', display: 'block' }}>
                                                        Set Multiple Choice Options & Select Correct Answer
                                                    </strong>
                                                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                                                        Type each option below. Click the radio button next to an option to mark it as the correct answer.
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAddOption}
                                                    style={{
                                                        fontSize: 12, padding: '4px 10px', borderRadius: 6,
                                                        background: 'rgba(79,110,247,0.1)', color: 'var(--accent)',
                                                        border: '1px solid rgba(79,110,247,0.2)', cursor: 'pointer', fontWeight: 600
                                                    }}
                                                >
                                                    + Add Option
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gap: 10 }}>
                                                {editFormData.options.map((opt, optIdx) => {
                                                    const isCorrect = editFormData.correctOption === opt && opt !== '';
                                                    const letter = String.fromCharCode(65 + optIdx);
                                                    return (
                                                        <div
                                                            key={optIdx}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 10,
                                                                padding: '8px 12px',
                                                                borderRadius: 8,
                                                                border: isCorrect ? '2px solid #10b981' : '1px solid var(--border)',
                                                                background: isCorrect ? 'rgba(16,185,129,0.04)' : '#fafbfc'
                                                            }}
                                                        >
                                                            {/* Option Letter Badge */}
                                                            <span style={{
                                                                width: 24, height: 24, borderRadius: '50%',
                                                                background: isCorrect ? '#10b981' : 'var(--border)',
                                                                color: isCorrect ? '#fff' : 'var(--text)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 11, fontWeight: 700, flexShrink: 0
                                                            }}>
                                                                {letter}
                                                            </span>

                                                            {/* Option Text Input */}
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={e => handleOptionTextChange(optIdx, e.target.value)}
                                                                placeholder={`Enter text for Option ${letter}...`}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '8px 12px',
                                                                    fontSize: 13,
                                                                    background: '#fff',
                                                                    border: '1px solid var(--border)',
                                                                    borderRadius: 6
                                                                }}
                                                            />

                                                            {/* Radio Button for Correct Answer */}
                                                            <label
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    cursor: 'pointer',
                                                                    fontSize: 12,
                                                                    fontWeight: isCorrect ? 700 : 500,
                                                                    color: isCorrect ? '#059669' : 'var(--muted)',
                                                                    background: isCorrect ? 'rgba(16,185,129,0.1)' : 'transparent',
                                                                    padding: '4px 8px',
                                                                    borderRadius: 6,
                                                                    flexShrink: 0,
                                                                    userSelect: 'none'
                                                                }}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`correctOpt-${i}`}
                                                                    checked={isCorrect}
                                                                    onChange={() => setEditFormData({ ...editFormData, correctOption: opt })}
                                                                    style={{
                                                                        width: 16,
                                                                        height: 16,
                                                                        minWidth: 16,
                                                                        cursor: 'pointer',
                                                                        accentColor: '#10b981',
                                                                        margin: 0
                                                                    }}
                                                                />
                                                                {isCorrect ? '✓ Correct Answer' : 'Mark Correct'}
                                                            </label>

                                                            {/* Delete Option Button */}
                                                            {editFormData.options.length > 2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveOption(optIdx)}
                                                                    title="Delete option"
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#ef4444',
                                                                        cursor: 'pointer',
                                                                        fontSize: 14,
                                                                        padding: '4px',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Correct Option Status Banner */}
                                            {editFormData.correctOption ? (
                                                <div style={{ marginTop: 10, fontSize: 12, color: '#059669', fontWeight: 600 }}>
                                                    ✅ Selected correct answer: "{editFormData.correctOption}"
                                                </div>
                                            ) : (
                                                <div style={{ marginTop: 10, fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                                                    ⚠️ Please select one of the options above as the correct answer.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Descriptive Expected Answer */}
                                    {editFormData.type === 'text' && (
                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
                                                Expected Answer / Key Concepts for Evaluation
                                            </label>
                                            <textarea
                                                value={editFormData.expectedAnswer}
                                                onChange={e => setEditFormData({ ...editFormData, expectedAnswer: e.target.value })}
                                                rows={3}
                                                placeholder="Key definitions, principles, or formulas students should include in their response..."
                                                style={{ width: '100%', padding: '9px 12px', fontSize: 13, resize: 'vertical', background: '#fff' }}
                                            />
                                        </div>
                                    )}

                                    {/* Explanation */}
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
                                            Explanation / Model Solution (Displayed to students after submission)
                                        </label>
                                        <textarea
                                            value={editFormData.explanation}
                                            onChange={e => setEditFormData({ ...editFormData, explanation: e.target.value })}
                                            rows={2}
                                            placeholder="Student-friendly explanation..."
                                            style={{ width: '100%', padding: '9px 12px', fontSize: 13, resize: 'vertical', background: '#fff' }}
                                        />
                                    </div>

                                    {/* Edit Action Buttons */}
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={cancelManualEdit}
                                            disabled={savingEdit}
                                            style={{ fontSize: 13, padding: '6px 14px' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => saveManualEdit(i)}
                                            disabled={savingEdit}
                                            style={{ fontSize: 13, padding: '6px 18px' }}
                                        >
                                            {savingEdit ? 'Saving...' : '💾 Save Question'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Normal View */}
                                    <p style={{ fontSize: 14, marginBottom: q.options?.length ? 12 : 0, lineHeight: 1.6, color: 'var(--text)' }}>
                                        {q.question}
                                    </p>

                                    {/* MCQ Options Display */}
                                    {q.options?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                            {q.options.map((opt, j) => (
                                                <span key={j} style={{
                                                    padding: '5px 14px', borderRadius: 6, fontSize: 13,
                                                    background: opt === q.correctOption ? 'rgba(16,185,129,0.1)' : '#f9fafb',
                                                    color: opt === q.correctOption ? '#059669' : 'var(--muted)',
                                                    border: `1px solid ${opt === q.correctOption ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`,
                                                    fontWeight: opt === q.correctOption ? 600 : 400
                                                }}>
                                                    {opt === q.correctOption ? '✓ ' : ''}{opt}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Text Question Expected Answer Preview */}
                                    {q.type === 'text' && q.expectedAnswer && (
                                        <div style={{ fontSize: 12, color: 'var(--muted)', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, marginTop: 8 }}>
                                            <strong>Expected Answer:</strong> {q.expectedAnswer}
                                        </div>
                                    )}

                                    {/* Explanation Preview */}
                                    {q.explanation && (
                                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                                            💡 <em>{q.explanation}</em>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ========================================================= */}
            {/* RESPONSES TAB */}
            {/* ========================================================= */}
            {tab === 'responses' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {responses.length === 0 ? <p style={{ color: 'var(--muted)' }}>No responses yet.</p> :
                        responses.map(r => (
                            <div key={r._id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        {(() => {
                                            const isMasked = !!form?.allowAnonymous || !!r.isAnonymous || r.studentName === 'Anonymous' || r.studentName === 'Anonymous Student';
                                            return (
                                                <>
                                                    <strong>{isMasked ? 'Anonymous Student' : r.studentName}</strong>
                                                    {!isMasked && r.rollNo && r.rollNo !== 'Hidden' && (
                                                        <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 8 }}>Roll: {r.rollNo}</span>
                                                    )}
                                                    {isMasked && (
                                                        <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                                            🎭 Anonymous
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        })()}
                                        {r.attemptNumber && r.attemptNumber > 1 && (
                                            <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(79,110,247,0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                                Attempt #{r.attemptNumber}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>{new Date(r.submittedAt).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {r.answers.map((a, i) => (
                                        <span key={i} className={`tag ${a.isCorrect === true ? 'tag-active' : a.isCorrect === false ? 'tag-inactive' : ''}`}
                                            style={{ background: a.isCorrect === null ? 'rgba(79,110,247,0.1)' : undefined, color: a.isCorrect === null ? 'var(--accent)' : undefined }}>
                                            {a.topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* ========================================================= */}
            {/* PUBLISH ASSESSMENT MODAL */}
            {/* ========================================================= */}
            {showPublishModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px 16px'
                }} onClick={() => !publishing && setShowPublishModal(false)}>
                    <div style={{
                        background: '#ffffff',
                        color: '#1e2235',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 580,
                        maxHeight: '92vh',
                        overflowY: 'auto',
                        padding: 28,
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                        border: '1px solid #dde1ec'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <h3 style={{ fontSize: 20, marginBottom: 4, color: '#1e2235' }}>📢 Publish Assessment</h3>
                                <p style={{ color: '#6b7280', fontSize: 13 }}>
                                    Select target classes and student policies. Notifications will be sent automatically.
                                </p>
                            </div>
                            <button
                                onClick={() => !publishing && setShowPublishModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Target Branches / Departments */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)' }}>
                                    Target Branches / Departments *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setTargetBranches(targetBranches.length === availableTargets.branches.length ? [] : [...availableTargets.branches])}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                >
                                    {targetBranches.length === availableTargets.branches.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {availableTargets.branches.map(br => {
                                    const selected = targetBranches.includes(br);
                                    return (
                                        <button
                                            key={br}
                                            type="button"
                                            onClick={() => toggleTargetBranch(br)}
                                            style={{
                                                padding: '7px 14px',
                                                borderRadius: 8,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: `1.5px solid ${selected ? 'var(--accent)' : '#dde1ec'}`,
                                                background: selected ? 'rgba(79,110,247,0.12)' : '#f8fafc',
                                                color: selected ? 'var(--accent)' : '#1e2235',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {selected ? '✓ ' : '+ '} {br}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Target Classes */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)' }}>
                                    Target Classes *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setTargetClasses(targetClasses.length === availableTargets.classes.length ? [] : [...availableTargets.classes])}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                >
                                    {targetClasses.length === availableTargets.classes.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {availableTargets.classes.map(cls => {
                                    const selected = targetClasses.includes(cls);
                                    return (
                                        <button
                                            key={cls}
                                            type="button"
                                            onClick={() => toggleTargetClass(cls)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: `1.5px solid ${selected ? 'var(--accent)' : '#dde1ec'}`,
                                                background: selected ? 'rgba(79,110,247,0.12)' : '#f8fafc',
                                                color: selected ? 'var(--accent)' : '#1e2235',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {selected ? '✓ ' : '+ '} {cls}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Target Divisions */}
                        <div style={{ marginBottom: 22 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)' }}>
                                    Target Divisions *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setTargetDivisions(targetDivisions.length === availableTargets.divisions.length ? [] : [...availableTargets.divisions])}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                >
                                    {targetDivisions.length === availableTargets.divisions.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {availableTargets.divisions.map(div => {
                                    const selected = targetDivisions.includes(div);
                                    return (
                                        <button
                                            key={div}
                                            type="button"
                                            onClick={() => toggleTargetDivision(div)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: `1.5px solid ${selected ? 'var(--accent)' : '#dde1ec'}`,
                                                background: selected ? 'rgba(79,110,247,0.12)' : '#f8fafc',
                                                color: selected ? 'var(--accent)' : '#1e2235',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {selected ? '✓ Div ' : '+ Div '} {div}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Anonymous Submissions Policy */}
                        <div style={{
                            background: '#f8fafc',
                            borderRadius: 10,
                            padding: '14px 16px',
                            marginBottom: 20,
                            border: '1px solid #dde1ec'
                        }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={allowAnonymous}
                                    onChange={e => setAllowAnonymous(e.target.checked)}
                                    style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--accent)' }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e2235' }}>Allow Anonymous Responses</div>
                                    <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2, margin: 0, lineHeight: 1.5 }}>
                                        Students must register and log in, but can choose to hide their name and roll number from the faculty analytics.
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Reattempt Cooldown Policy */}
                        <div style={{ marginBottom: 26 }}>
                            <label style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                                Re-attempt Cooldown Window
                            </label>
                            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>
                                Number of days before a student is allowed to re-attempt this form. (0 = Single attempt only).
                            </p>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={reattemptDays}
                                    onChange={e => setReattemptDays(Math.max(0, parseInt(e.target.value) || 0))}
                                    style={{ width: 100, padding: '8px 12px', fontSize: 14, background: '#f8fafc', color: '#1e2235', border: '1px solid #dde1ec' }}
                                />
                                <span style={{ fontSize: 13, color: '#6b7280' }}>days between attempts</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {[
                                    { label: 'Single Attempt (0d)', days: 0 },
                                    { label: '3 Days', days: 3 },
                                    { label: '7 Days', days: 7 },
                                    { label: '14 Days', days: 14 },
                                    { label: '30 Days', days: 30 }
                                ].map(p => (
                                    <button
                                        key={p.days}
                                        type="button"
                                        onClick={() => setReattemptDays(p.days)}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            background: reattemptDays === p.days ? 'var(--accent)' : '#f8fafc',
                                            color: reattemptDays === p.days ? '#fff' : '#6b7280',
                                            border: `1px solid ${reattemptDays === p.days ? 'var(--accent)' : '#dde1ec'}`
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowPublishModal(false)}
                                disabled={publishing}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handlePublishForm}
                                disabled={publishing}
                                style={{ minWidth: 150 }}
                            >
                                {publishing ? 'Publishing...' : form.isPublished ? 'Update & Re-Publish' : '📢 Publish & Notify'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* ADD NEW QUESTION MODAL (Manual or AI generated) */}
            {/* ========================================================= */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px 16px'
                }} onClick={() => !addingQuestion && !aiGenerating && setShowAddModal(false)}>
                    <div style={{
                        background: '#ffffff',
                        color: '#1e2235',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 620,
                        maxHeight: '92vh',
                        overflowY: 'auto',
                        padding: 28,
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                        border: '1px solid #dde1ec'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                            <div>
                                <h3 style={{ fontSize: 20, marginBottom: 4, color: '#1e2235' }}>➕ Add New Question</h3>
                                <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
                                    Add a question to this form. It works whether the form is in draft or previously published!
                                </p>
                            </div>
                            <button
                                onClick={() => !addingQuestion && !aiGenerating && setShowAddModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Question Type Switcher */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                                Question Type
                            </label>
                            <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
                                {[
                                    { id: 'mcq', label: '🔘 MCQ (Multiple Choice)' },
                                    { id: 'text', label: '✍️ Descriptive / Text' },
                                    { id: 'scale', label: '📊 Scale (1-5 Rating)' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                            const opts = t.id === 'mcq'
                                                ? (newQuestionData.options.length >= 2 ? newQuestionData.options : ['', '', '', ''])
                                                : (t.id === 'scale' ? ['1', '2', '3', '4', '5'] : []);
                                            setNewQuestionData({
                                                ...newQuestionData,
                                                type: t.id,
                                                options: opts,
                                                correctOption: t.id === 'mcq' ? (opts[0] || '') : ''
                                            });
                                        }}
                                        style={{
                                            flex: 1, padding: '8px 10px', fontSize: 12, fontWeight: 600,
                                            borderRadius: 8, border: 'none', cursor: 'pointer',
                                            background: newQuestionData.type === t.id ? '#ffffff' : 'transparent',
                                            color: newQuestionData.type === t.id ? 'var(--accent)' : '#64748b',
                                            boxShadow: newQuestionData.type === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Syllabus Topic */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)' }}>
                                    Syllabus Topic *
                                </label>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                    Existing topics from form:
                                </span>
                            </div>
                            <input
                                type="text"
                                list="available-topics-list"
                                required
                                value={newQuestionData.topic}
                                onChange={e => setNewQuestionData({ ...newQuestionData, topic: e.target.value })}
                                placeholder="e.g. Binary Search Trees, Normalized Databases, etc."
                                style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #dde1ec', background: '#f8fafc', color: '#1e2235' }}
                            />
                            <datalist id="available-topics-list">
                                {[...new Set((form.questions || []).map(q => q.topic?.trim()).filter(Boolean))].map((t, i) => (
                                    <option key={i} value={t} />
                                ))}
                            </datalist>
                        </div>

                        {/* AI Quick Generator Box */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(79,110,247,0.06), rgba(124,106,247,0.04))',
                            border: '1px dashed rgba(79,110,247,0.3)',
                            borderRadius: 10,
                            padding: '12px 16px',
                            marginBottom: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap'
                        }}>
                            <div>
                                <strong style={{ fontSize: 13, color: 'var(--accent)', display: 'block' }}>✨ Want AI to craft this question?</strong>
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                    Gemini will generate a high-quality {newQuestionData.type.toUpperCase()} question for topic <em>"{newQuestionData.topic || 'specified above'}"</em>.
                                </span>
                            </div>
                            <button
                                type="button"
                                className="btn btn-warning"
                                onClick={handleGenerateSingleAI}
                                disabled={aiGenerating || addingQuestion || !newQuestionData.topic.trim()}
                                style={{ fontSize: 12, padding: '7px 14px', whiteSpace: 'nowrap' }}
                            >
                                {aiGenerating ? 'Generating...' : '✨ Generate with AI'}
                            </button>
                        </div>

                        {/* Question Prompt */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                                Question Prompt *
                            </label>
                            <textarea
                                required
                                value={newQuestionData.question}
                                onChange={e => setNewQuestionData({ ...newQuestionData, question: e.target.value })}
                                rows={3}
                                placeholder="Enter the question text here..."
                                style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #dde1ec', background: '#f8fafc', color: '#1e2235', resize: 'vertical' }}
                            />
                        </div>

                        {/* MCQ Options & Correct Option Picker */}
                        {newQuestionData.type === 'mcq' && (
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #dde1ec',
                                borderRadius: 10,
                                padding: 16,
                                marginBottom: 18
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)' }}>
                                        Options (Select radio for correct answer) *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setNewQuestionData({ ...newQuestionData, options: [...newQuestionData.options, ''] })}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                    >
                                        + Add Option
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gap: 10 }}>
                                    {newQuestionData.options.map((opt, optIdx) => (
                                        <div key={optIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input
                                                type="radio"
                                                name="new-q-correct-opt"
                                                checked={newQuestionData.correctOption === opt && opt !== ''}
                                                onChange={() => setNewQuestionData({ ...newQuestionData, correctOption: opt })}
                                                title="Mark as correct answer"
                                                style={{ accentColor: '#10b981', width: 16, height: 16, cursor: 'pointer' }}
                                            />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={e => {
                                                    const updated = [...newQuestionData.options];
                                                    const oldVal = updated[optIdx];
                                                    updated[optIdx] = e.target.value;
                                                    const newCorrect = newQuestionData.correctOption === oldVal ? e.target.value : newQuestionData.correctOption;
                                                    setNewQuestionData({ ...newQuestionData, options: updated, correctOption: newCorrect });
                                                }}
                                                placeholder={`Option ${optIdx + 1}`}
                                                style={{ flex: 1, padding: '8px 12px', fontSize: 13, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, color: '#1e2235' }}
                                            />
                                            {newQuestionData.options.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const removed = newQuestionData.options[optIdx];
                                                        const updated = newQuestionData.options.filter((_, i) => i !== optIdx);
                                                        const newCorrect = newQuestionData.correctOption === removed ? (updated[0] || '') : newQuestionData.correctOption;
                                                        setNewQuestionData({ ...newQuestionData, options: updated, correctOption: newCorrect });
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Descriptive Expected Answer */}
                        {newQuestionData.type === 'text' && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                                    Expected Key Points / Answer Outline (Optional)
                                </label>
                                <textarea
                                    value={newQuestionData.expectedAnswer || ''}
                                    onChange={e => setNewQuestionData({ ...newQuestionData, expectedAnswer: e.target.value })}
                                    rows={2}
                                    placeholder="Outline the core ideas or keywords expected in student response..."
                                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #dde1ec', background: '#f8fafc', color: '#1e2235' }}
                                />
                            </div>
                        )}

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid #dde1ec' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowAddModal(false)}
                                disabled={addingQuestion || aiGenerating}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleCreateQuestion}
                                disabled={addingQuestion || aiGenerating}
                                style={{ minWidth: 150 }}
                            >
                                {addingQuestion ? 'Adding Question...' : '➕ Save & Add Question'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}