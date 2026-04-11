import { useState, useEffect } from 'react';
import api from '../api';

export default function Settings() {
    const [key, setKey] = useState('');
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/auth/me').then(r => setKey(r.data.geminiApiKey || ''));
    }, []);

    const save = async e => {
        e.preventDefault(); setLoading(true); setMsg('');
        try {
            await api.put('/auth/api-key', { geminiApiKey: key });
            setMsg('API key saved successfully!');
        } catch { setMsg('Failed to save.'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ maxWidth: 600 }}>
            <h2 style={{ marginBottom: 8 }}>Settings</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>Configure your AI provider for question generation & analytics</p>
            <div className="card">
                <h3 style={{ marginBottom: 6, fontSize: 18 }}>Gemini API Key</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                    Required for generating questions from your syllabus and providing AI analytics.
                    Get your free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>aistudio.google.com</a>
                </p>
                <form onSubmit={save}>
                    <input
                        type="password" value={key}
                        onChange={e => setKey(e.target.value)}
                        placeholder="AIza..."
                        style={{ marginBottom: 16 }}
                    />
                    {msg && <p style={{ color: msg.includes('success') ? 'var(--success)' : 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{msg}</p>}
                    <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Key'}</button>
                </form>
            </div>
        </div>
    );
}