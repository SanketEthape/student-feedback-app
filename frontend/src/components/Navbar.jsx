import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const logout = () => { localStorage.clear(); navigate('/login'); };
    const navStyle = (path) => ({
        color: pathname === path ? 'var(--accent)' : 'var(--muted)',
        textDecoration: 'none', fontSize: 14, fontWeight: 500
    });

    return (
        <nav style={{
            background: 'var(--surface)', borderBottom: '1px solid var(--border)',
            padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
                <span style={{ fontFamily: 'DM Serif Display', fontSize: 20, color: 'var(--accent)' }}>
                    EduPulse
                </span>
            </Link>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <Link to="/" style={navStyle('/')}>Dashboard</Link>
                <Link to="/create" style={navStyle('/create')}>New Form</Link>
                <Link to="/settings" style={navStyle('/settings')}>Settings</Link>
                <button className="btn btn-secondary" style={{ padding: '6px 14px' }} onClick={logout}>Logout</button>
            </div>
        </nav>
    );
}