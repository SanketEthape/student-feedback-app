import { useState, useEffect } from 'react';
import api from '../api';

export default function Settings() {
    const [key, setKey] = useState('');
    const [hasKey, setHasKey] = useState(false);
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/auth/me').then(r => setHasKey(!!r.data.hasApiKey));
    }, []);

    const save = async e => {
        e.preventDefault(); setLoading(true); setMsg('');
        try {
            const { data } = await api.put('/auth/api-key', { geminiApiKey: key });
            setMsg('✅ ' + (data.message || 'API key saved securely!'));
            setHasKey(!!key);
            setKey('');
        } catch { setMsg('❌ Failed to save.'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ maxWidth: 600 }}>
            <h2 style={{ marginBottom: 8 }}>Settings</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>Configure your AI provider for question generation &amp; analytics</p>
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h3 style={{ fontSize: 18 }}>Gemini API Key</h3>
                    {hasKey && (
                        <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                            ✅ Active &amp; Encrypted
                        </span>
                    )}
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}>
                    Used for generating questions from your syllabus and providing AI analytics insights.
                    Your key is stored with <strong>AES-256 encryption</strong>.
                    Get your free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>aistudio.google.com</a>
                </p>
                {hasKey && (
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                        🔒 A key is currently saved. Enter a new one below to replace it.
                    </p>
                )}
                <form onSubmit={save}>
                    <input
                        id="faculty-api-key-input"
                        type="password" value={key}
                        onChange={e => setKey(e.target.value)}
                        placeholder={hasKey ? 'Enter new key to replace...' : 'AIzaSy...'}
                        style={{ marginBottom: 16 }}
                    />
                    {msg && <p style={{ color: msg.startsWith('✅') ? '#22c55e' : '#ef4444', fontSize: 13, marginBottom: 12 }}>{msg}</p>}
                    <button id="save-faculty-key-btn" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : hasKey ? 'Update Key' : 'Save Key'}</button>
                </form>
            </div>
        </div>
    );
}