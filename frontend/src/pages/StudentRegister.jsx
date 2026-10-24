import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentApi } from '../api';

export default function StudentRegister() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    studentClass: 'TY',
    division: 'A',
    rollNo: '',
    password: '',
    confirm: ''
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!form.name.trim() || !form.email.trim() || !form.studentClass || !form.division || !form.rollNo.trim()) {
      setErr('Please fill in all required fields (Name, Class, Division, Roll Number, Email).');
      return;
    }

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
        name: form.name.trim(),
        email: form.email.trim(),
        studentClass: form.studentClass.trim(),
        division: form.division.trim().toUpperCase(),
        rollNo: form.rollNo.trim(),
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
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #4f6ef7, #7c6af7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 8px 32px rgba(79,110,247,0.3)'
          }}>🎓</div>
          <h1 style={{ fontSize: 26, marginBottom: 6, fontWeight: 700 }}>Student Registration</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Create your account with your class and division to access assigned assessments
          </p>
        </div>

        <div className="card" style={{ padding: '28px 24px' }}>
          <form onSubmit={submit}>
            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                Full Name *
              </label>
              <input
                id="student-reg-name"
                name="name"
                value={form.name}
                onChange={handle}
                placeholder="e.g. Rahul Sharma"
                required
                autoFocus
              />
            </div>

            {/* Class, Division & Roll No */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Class *
                </label>
                <select
                  name="studentClass"
                  value={form.studentClass}
                  onChange={handle}
                  required
                  style={{ background: '#fff', fontSize: 13 }}
                >
                  <option value="FY">FY</option>
                  <option value="SY">SY</option>
                  <option value="TY">TY</option>
                  <option value="Final Year">Final Year</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Division *
                </label>
                <select
                  name="division"
                  value={form.division}
                  onChange={handle}
                  required
                  style={{ background: '#fff', fontSize: 13 }}
                >
                  <option value="A">Div A</option>
                  <option value="B">Div B</option>
                  <option value="C">Div C</option>
                  <option value="D">Div D</option>
                  <option value="E">Div E</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Roll No *
                </label>
                <input
                  id="student-reg-rollno"
                  name="rollNo"
                  value={form.rollNo}
                  onChange={handle}
                  placeholder="e.g. 42"
                  required
                  style={{ background: '#fff', fontSize: 13 }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
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

            {/* Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Password *
                </label>
                <input
                  id="student-reg-password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handle}
                  placeholder="Min 6 chars"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Confirm *
                </label>
                <input
                  id="student-reg-confirm"
                  name="confirm"
                  type="password"
                  value={form.confirm}
                  onChange={handle}
                  placeholder="Re-enter password"
                  required
                />
              </div>
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
              {loading ? '⏳ Creating student account...' : '🎓 Register Student Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
            Already registered?{' '}
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
