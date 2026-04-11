import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CreateForm() {
    const [form, setForm] = useState({ title: '', subject: '', syllabus: '' });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const navigate = useNavigate();

    const submit = async e => {
        e.preventDefault(); setErr(''); setLoading(true);
        try {
            const { data } = await api.post('/forms/generate', form);
            navigate(`/analytics/${data._id}`);
        } catch (e) { setErr(e.response?.data?.message || 'Failed to generate form'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ maxWidth: 700 }}>
            <h2 style={{ marginBottom: 8 }}>Create Feedback Form</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>Paste your unit syllabus and AI will generate relevant feedback questions</p>

            {err && <div style={{ background: 'rgba(247,106,106,0.1)', border: '1px solid var(--danger)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--danger)', fontSize: 14 }}>{err}</div>}

            <div className="card">
                <form onSubmit={submit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Form Title</label>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Unit 3 Feedback - Data Structures" required />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Subject</label>
                        <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Data Structures and Algorithms" required />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Unit Syllabus</label>
                        <textarea
                            value={form.syllabus}
                            onChange={e => setForm({ ...form, syllabus: e.target.value })}
                            placeholder="Paste the topics covered in this unit. e.g.:
- Arrays and Dynamic Arrays
- Linked Lists: Singly, Doubly
- Stacks and Queues
- Binary Trees and BST
- Graph Traversal: BFS, DFS"
                            rows={10} required
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                        {loading ? '⏳ Generating questions with AI...' : '✨ Generate Feedback Form'}
                    </button>
                </form>
            </div>
        </div>
    );
}