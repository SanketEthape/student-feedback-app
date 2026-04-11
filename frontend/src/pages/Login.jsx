import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const submit = async e => {
        e.preventDefault(); setErr(''); setLoading(true);
        try {
            const { data } = await api.post('/auth/login', form);
            localStorage.setItem('token', data.token);
            localStorage.setItem('faculty', JSON.stringify(data.faculty));
            navigate('/');
        } catch (e) { setErr(e.response?.data?.message || 'Login failed'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: 400 }}>
                <h2 style={{ marginBottom: 8 }}>Faculty Login</h2>
                <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>Sign in to manage your feedback forms</p>
                {err && <div style={{ background: 'rgba(247,106,106,0.1)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 14 }}>{err}</div>}
                <form onSubmit={submit}>
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Email</label>
                        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Password</label>
                        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
                    No account? <Link to="/register" style={{ color: 'var(--accent)' }}>Register</Link>
                </p>
            </div>
        </div>
    );
}