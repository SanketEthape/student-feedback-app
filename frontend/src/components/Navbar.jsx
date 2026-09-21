import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const logout = () => { localStorage.clear(); navigate('/login'); };
    const navStyle = (path) => ({
        color: pathname === path ? 'var(--accent)' : 'var(--muted)',
        textDecoration: 'none', fontSize: 14, fontWeight: 500,
        padding: '5px 2px',
        borderBottom: pathname === path ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'color 0.2s, border-bottom-color 0.2s'
    });

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
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                <span style={{ fontFamily: 'DM Serif Display', fontSize: 22, color: 'var(--accent)', letterSpacing: '-0.3px' }}>
                    EduPulse
                </span>
            </Link>
            <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
                <Link to="/dashboard" style={navStyle('/dashboard')}>Dashboard</Link>
                <Link to="/create" style={navStyle('/create')}>New Form</Link>
                <Link to="/settings" style={navStyle('/settings')}>Settings</Link>
                <button className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: 13 }} onClick={logout}>Logout</button>
            </div>
        </nav>
    );
}