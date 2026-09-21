import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentApi } from '../api';

export default function StudentRegister() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', rollNo: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.password !== form.confirm) {
      setErr('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setErr('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await studentApi.post('/student-auth/register', {
        name: form.name,
        email: form.email,
        rollNo: form.rollNo,
        password: form.password
      });
      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentInfo', JSON.stringify(data.student));
      nav('/student/dashboard');
    } catch (error) {
      setErr(error?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px', background: 'var(--bg)'
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
          <h1 style={{ fontSize: 26, marginBottom: 6, fontWeight: 700 }}>Create Account</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Join to take AI-powered assessments and track your progress
          </p>
        </div>

        <div className="card" style={{ padding: '32px 28px' }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Full Name *
                </label>
                <input
                  id="student-reg-name"
                  name="name"
                  value={form.name}
                  onChange={handle}
                  placeholder="Your full name"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Roll Number
                </label>
                <input
                  id="student-reg-rollno"
                  name="rollNo"
                  value={form.rollNo}
                  onChange={handle}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Email Address *
              </label>
              <input
                id="student-reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handle}
                placeholder="your@email.com"
                required
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Password *
              </label>
              <input
                id="student-reg-password"
                name="password"
                type="password"
                value={form.password}
                onChange={handle}
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Confirm Password *
              </label>
              <input
                id="student-reg-confirm"
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handle}
                placeholder="Re-enter your password"
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
              id="student-reg-btn"
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: 13, fontSize: 15 }}
            >
              {loading ? '⏳ Creating account...' : '🎓 Create Student Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link to="/student/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Sign in
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
