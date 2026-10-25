import { Link, useNavigate } from 'react-router-dom';

export default function AdminNavbar() {
    const navigate = useNavigate();
    const admin = JSON.parse(localStorage.getItem('adminUser') || '{}');

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/login');
    };

    return (
        <nav style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: '14px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 6px rgba(30,34,53,0.07)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Link to="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'DM Serif Display', fontSize: 22, color: 'var(--accent)', letterSpacing: '-0.3px' }}>
                        EduPulse
                    </span>
                    <span style={{
                        background: 'rgba(79,110,247,0.1)',
                        color: 'var(--accent)',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Academic Admin
                    </span>
                </Link>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <Link to="/admin" style={{
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600
                }}>
                    📊 Curriculum Insights
                </Link>

                <div style={{
                    fontSize: 13,
                    color: 'var(--muted)',
                    background: '#f1f5f9',
                    padding: '4px 12px',
                    borderRadius: 20
                }}>
                    👤 {admin.name || admin.email || 'Admin'}
                </div>

                <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: 13 }}
                    onClick={logout}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}
