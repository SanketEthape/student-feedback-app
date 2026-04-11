import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const submit = async e => {
        e.preventDefault(); setErr(''); setLoading(true);
        try {
            const { data } = await api.post('/auth/register', form);
            localStorage.setItem('token', data.token);
            localStorage.setItem('faculty', JSON.stringify(data.faculty));
            navigate('/settings');
        } catch (e) { setErr(e.response?.data?.message || 'Registration failed'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: 420 }}>
                <h2 style={{ marginBottom: 8 }}>Create Faculty Account</h2>
                <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>Join EduPulse to create intelligent feedback forms</p>
                {err && <div style={{ background: 'rgba(247,106,106,0.1)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 14 }}>{err}</div>}
                <form onSubmit={submit}>
                    {[['name', 'Name', 'text'], ['email', 'Email', 'email'], ['department', 'Department', 'text'], ['password', 'Password', 'password']].map(([key, label, type]) => (
                        <div key={key} style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{label}</label>
                            <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required={key !== 'department'} />
                        </div>
                    ))}
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>
                <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Login</Link>
                </p>
            </div>
        </div>
    );
}