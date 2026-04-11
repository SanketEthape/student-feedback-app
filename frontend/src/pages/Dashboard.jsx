import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const faculty = JSON.parse(localStorage.getItem('faculty') || '{}');

    useEffect(() => {
        api.get('/forms/my').then(r => setForms(r.data)).finally(() => setLoading(false));
    }, []);

    const toggle = async (id) => {
        const { data } = await api.patch(`/forms/${id}/toggle`);
        setForms(forms.map(f => f._id === id ? data : f));
    };

    const remove = async (id) => {
        if (!confirm('Delete this form?')) return;
        await api.delete(`/forms/${id}`);
        setForms(forms.filter(f => f._id !== id));
    };

    const copyLink = (link) => {
        navigator.clipboard.writeText(`${window.location.origin}/f/${link}`);
        alert('Link copied!');
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <h2>Welcome back, {faculty.name || 'Faculty'} 👋</h2>
                    <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Manage your feedback forms and view student analytics</p>
                </div>
                <Link to="/create"><button className="btn btn-primary">+ New Form</button></Link>
            </div>

            {loading ? <p style={{ color: 'var(--muted)' }}>Loading...</p> : forms.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                    <h3 style={{ marginBottom: 8 }}>No forms yet</h3>
                    <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14 }}>Create your first feedback form by uploading a syllabus</p>
                    <Link to="/create"><button className="btn btn-primary">Create Form</button></Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                    {forms.map(f => (
                        <div key={f._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                    <h3 style={{ fontSize: 18 }}>{f.title}</h3>
                                    <span className={`tag ${f.isActive ? 'tag-active' : 'tag-inactive'}`}>{f.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                                <p style={{ color: 'var(--muted)', fontSize: 13 }}>{f.subject} · {f.questions.length} questions · {new Date(f.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => copyLink(f.uniqueLink)}>📋 Copy Link</button>
                                <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => navigate(`/analytics/${f._id}`)}>📊 Analytics</button>
                                <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => toggle(f._id)}>{f.isActive ? 'Deactivate' : 'Activate'}</button>
                                <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={() => remove(f._id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}