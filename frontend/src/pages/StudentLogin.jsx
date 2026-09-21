import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { studentApi } from '../api';

export default function StudentLogin() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/student/dashboard';
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data } = await studentApi.post('/student-auth/login', form);
      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentInfo', JSON.stringify(data.student));
      nav(redirectTo);
    } catch (error) {
      setErr(error?.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
      background: 'var(--bg)'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #4f6ef7, #7c6af7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 8px 32px rgba(79,110,247,0.3)'
          }}>🎓</div>
          <h1 style={{ fontSize: 26, marginBottom: 6, fontWeight: 700 }}>Student Login</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Sign in to take assessments and view your learning history
          </p>
        </div>

        <div className="card" style={{ padding: '32px 28px' }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                id="student-login-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handle}
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                id="student-login-password"
                name="password"
                type="password"
                value={form.password}
                onChange={handle}
                placeholder="Enter your password"
                required
              />
            </div>

            {err && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                color: '#ef4444', fontSize: 13
              }}>
                {err}
              </div>
            )}

            <button
              id="student-login-btn"
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: 13, fontSize: 15 }}
            >
              {loading ? '⏳ Signing in...' : '→ Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
            Don't have an account?{' '}
            <Link to="/student/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Register here
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          Are you a faculty member?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>Faculty Login</Link>
        </div>
      </div>
    </div>
  );
}
