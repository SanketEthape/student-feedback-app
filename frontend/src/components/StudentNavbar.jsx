import { useNavigate, Link } from 'react-router-dom';

export default function StudentNavbar() {
  const nav = useNavigate();
  const info = JSON.parse(localStorage.getItem('studentInfo') || '{}');

  const logout = () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentInfo');
    nav('/student/login');
  };

  return (
    <nav style={{
      background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 60,
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link to="/student/dashboard" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        textDecoration: 'none', color: 'var(--text)'
      }}>
        <span style={{ fontSize: 22 }}>🎓</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>
          Student Portal
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f6ef7, #7c6af7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14
          }}>
            {info.name ? info.name[0].toUpperCase() : 'S'}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{info.name || 'Student'}</span>
        </div>

        <button
          id="student-logout-btn"
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--muted)',
            transition: 'all 0.15s'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
