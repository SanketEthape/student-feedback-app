import { Link } from 'react-router-dom';

export default function Landing() {
  const isFacultyLoggedIn = Boolean(localStorage.getItem('token'));
  const isStudentLoggedIn = Boolean(localStorage.getItem('studentToken'));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Top Navigation */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 6px rgba(30,34,53,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #4f6ef7, #7c6af7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            boxShadow: '0 4px 12px rgba(79,110,247,0.3)'
          }}>
            EP
          </div>
          <span style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: 'var(--accent)', letterSpacing: '-0.3px' }}>
            EduPulse
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isFacultyLoggedIn ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Faculty Dashboard →
            </Link>
          ) : isStudentLoggedIn ? (
            <Link to="/student/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Student Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/student/login" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Student Login
              </Link>
              <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Faculty Portal
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '60px 20px 80px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 64px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 30,
            background: 'rgba(79, 110, 247, 0.1)',
            color: 'var(--accent)',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 20,
            border: '1px solid rgba(79, 110, 247, 0.2)'
          }}>
            ✨ Next-Generation Feedback & Analytics Platform
          </div>

          <h1 style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
            lineHeight: 1.15,
            marginBottom: 20,
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}>
            Empowering Educators & Inspiring Students
          </h1>

          <p style={{
            fontSize: 18,
            color: 'var(--muted)',
            lineHeight: 1.6,
            marginBottom: 32
          }}>
            Streamlined course feedback, real-time analytics, and interactive student assessments — designed to foster continuous educational growth.
          </p>
        </div>

        {/* Portal Selection Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 28,
          marginBottom: 72
        }}>
          {/* Faculty Card */}
          <div className="card" style={{
            padding: 36,
            borderRadius: 16,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #ffffff 0%, #f9faff 100%)'
          }}>
            <div>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'rgba(79, 110, 247, 0.12)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 20
              }}>
                👨‍🏫
              </div>
              <h2 style={{ fontSize: 24, marginBottom: 10, fontWeight: 700 }}>Faculty Portal</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                Design custom feedback forms, monitor student participation, view automated insights, and refine course delivery.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                {[
                  'Instant Form Builder with Multiple Question Types',
                  'Real-Time Analytics & Response Distribution',
                  'Departmental & Course Performance Tracking'
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/login" className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '12px 20px', fontSize: 15 }}>
                Faculty Sign In →
              </Link>
              <Link to="/register" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', padding: '12px 20px', fontSize: 15 }}>
                Register
              </Link>
            </div>
          </div>

          {/* Student Card */}
          <div className="card" style={{
            padding: 36,
            borderRadius: 16,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #ffffff 0%, #faf8ff 100%)'
          }}>
            <div>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'rgba(124, 106, 247, 0.12)',
                color: '#7c6af7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 20
              }}>
                🎓
              </div>
              <h2 style={{ fontSize: 24, marginBottom: 10, fontWeight: 700 }}>Student Portal</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                Access assigned course evaluations, share constructive feedback securely, and track your completed form history.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                {[
                  'Quick Access to Assigned Surveys & Forms',
                  'Secure Student Login & Data Protection',
                  'Seamless Experience on Desktop & Mobile'
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
                    <span style={{ color: '#7c6af7', fontWeight: 'bold' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/student/login" className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '12px 20px', fontSize: 15, background: '#7c6af7', borderColor: '#7c6af7' }}>
                Student Sign In →
              </Link>
              <Link to="/student/register" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', padding: '12px 20px', fontSize: 15 }}>
                Register
              </Link>
            </div>
          </div>
        </div>

        {/* Features Highlights Section */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 16,
          padding: '40px 32px',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(30,34,53,0.04)'
        }}>
          <h3 style={{ textAlign: 'center', fontSize: 22, marginBottom: 32 }}>Why Use EduPulse?</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>⚡ Rapid Creation</div>
              <h4 style={{ fontSize: 16, marginBottom: 6, fontWeight: 600 }}>Simple Form Creation</h4>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                Build rating scales, open text feedback, and multiple-choice questions in seconds.
              </p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>📊 Deep Insights</div>
              <h4 style={{ fontSize: 16, marginBottom: 6, fontWeight: 600 }}>Actionable Analytics</h4>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                Visualize student sentiment and performance trends with clean graphs and statistics.
              </p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>🔒 Role Safety</div>
              <h4 style={{ fontSize: 16, marginBottom: 6, fontWeight: 600 }}>Dedicated Portals</h4>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                Tailored interfaces and authentication for both faculty members and enrolled students.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '24px 32px',
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: 14
      }}>
        <p>© {new Date().getFullYear()} EduPulse Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
