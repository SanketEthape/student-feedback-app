import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', department: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const submit = async e => {
        e.preventDefault(); setErr('');
        if (form.password !== form.confirmPassword) {
            setErr('Passwords do not match. Please verify your confirm password.');
            return;
        }
        if (form.password.length < 6) {
            setErr('Password must be at least 6 characters long.');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                confirmPassword: form.confirmPassword,
                department: form.department.trim()
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('faculty', JSON.stringify(data.faculty));
            navigate('/settings');
        } catch (e) { setErr(e.response?.data?.message || 'Registration failed'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <div className="card" style={{ width: 440 }}>
                <h2 style={{ marginBottom: 8 }}>Create Faculty Account</h2>
                <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>Join EduPulse to create intelligent feedback forms</p>
                {err && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 14 }}>{err}</div>}
                <form onSubmit={submit}>
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Full Name *</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Dr. Jane Smith"
                        />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Email Address *</label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="faculty@college.edu"
                        />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Department</label>
                        <input
                            type="text"
                            value={form.department}
                            onChange={e => setForm({ ...form, department: e.target.value })}
                            placeholder="e.g. Computer Engineering"
                        />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Password *</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                placeholder="Min 6 characters"
                                style={{ width: '100%', paddingRight: 42 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(p => !p)}
                                style={{
                                    position: 'absolute', right: 10, background: 'none', border: 'none',
                                    cursor: 'pointer', fontSize: 16, padding: '4px 6px', color: 'var(--muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Confirm Password *</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={form.confirmPassword}
                                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                placeholder="Re-enter your password"
                                style={{ width: '100%', paddingRight: 42 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(p => !p)}
                                style={{
                                    position: 'absolute', right: 10, background: 'none', border: 'none',
                                    cursor: 'pointer', fontSize: 16, padding: '4px 6px', color: 'var(--muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

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