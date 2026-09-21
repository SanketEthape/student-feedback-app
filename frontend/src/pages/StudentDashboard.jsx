import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';
import { studentApi } from '../api';

// =============================================
// LEVEL BADGE
// =============================================
const LevelBadge = ({ level }) => {
  const map = {
    'Good Understanding': { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '🌟' },
    'Average Understanding': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '📈' },
    'Needs Improvement': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '📚' },
  };
  const s = map[level] || { color: 'var(--muted)', bg: 'var(--bg)', icon: '❓' };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.color}30`,
      borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600
    }}>
      {s.icon} {level}
    </span>
  );
};

// =============================================
// SCORE RING
// =============================================
const ScoreRing = ({ score }) => {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%',
      border: `3px solid ${color}`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
      background: `${color}10`
    }}>
      <span style={{ fontWeight: 700, fontSize: 13, color }}>{score}%</span>
    </div>
  );
};

// =============================================
// FULL RESULT MODAL
// =============================================
const ResultModal = ({ response, onClose }) => {
  if (!response) return null;
  const form = response.form || {};

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 700,
        maxHeight: '90vh', overflowY: 'auto', padding: 28,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
      }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>{form.title || 'Assessment'}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {form.subject} · {form.faculty?.name} · {new Date(response.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            fontSize: 13, color: 'var(--muted)'
          }}>✕ Close</button>
        </div>

        {/* Score Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Overall Score', value: `${response.overallScore}%`, color: 'var(--accent)' },
            { label: 'Correct', value: `${response.answers?.filter(a => a.isCorrect === true).length || 0} ✅`, color: '#22c55e' },
            { label: 'Wrong', value: `${response.answers?.filter(a => a.isCorrect === false).length || 0} ❌`, color: '#ef4444' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Level + Recommendation */}
        <div style={{ marginBottom: 16 }}>
          <LevelBadge level={response.overallLevel} />
        </div>

        {response.recommendation && (
          <div style={{
            background: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.15)',
            borderLeft: '3px solid var(--accent)', borderRadius: 10, padding: '16px 18px', marginBottom: 20
          }}>
            <strong>💡 Personalised Recommendation</strong>
            <p style={{ marginTop: 8, lineHeight: 1.7, color: 'var(--text)', fontSize: 14 }}>
              {response.recommendation}
            </p>
          </div>
        )}

        {/* MCQ Answers */}
        {response.answers?.filter(a => a.questionType === 'mcq').length > 0 && (
          <>
            <h3 style={{ marginBottom: 12 }}>📝 MCQ Review</h3>
            <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              {response.answers.filter(a => a.questionType === 'mcq').map((a, i) => (
                <div key={i} className="card" style={{
                  borderLeft: `4px solid ${a.isCorrect ? '#22c55e' : '#ef4444'}`,
                  padding: '12px 16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>Q{i + 1} · {a.topic}</span>
                    <span style={{ fontSize: 13 }}>{a.isCorrect ? '✅ Correct' : '❌ Wrong'}</span>
                  </div>
                  <p style={{ fontSize: 14, marginBottom: 8 }}>{a.question}</p>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    <strong>Your answer:</strong> {a.answer || 'Not answered'}
                    {!a.isCorrect && a.correctAnswer && (
                      <> &nbsp;·&nbsp; <strong>Correct:</strong> {a.correctAnswer}</>
                    )}
                  </div>
                  {a.explanation && (
                    <div style={{
                      marginTop: 10, padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(124,106,247,0.08)', fontSize: 13, lineHeight: 1.6
                    }}>
                      💡 {a.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Descriptive Answers */}
        {response.answers?.filter(a => a.questionType === 'text').length > 0 && (
          <>
            <h3 style={{ marginBottom: 12 }}>✍️ Descriptive Review</h3>
            <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              {response.answers.filter(a => a.questionType === 'text').map((a, i) => {
                const levelColor = a.level === 'Good' ? '#22c55e' : a.level === 'Average' ? '#f59e0b' : '#ef4444';
                return (
                  <div key={i} className="card" style={{ borderLeft: `4px solid ${levelColor}`, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>· {a.topic}</span>
                      <span style={{ color: levelColor, fontSize: 13, fontWeight: 600 }}>{a.level} ({a.score}%)</span>
                    </div>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>{a.question}</p>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                      <strong>Your answer:</strong> {a.answer || 'Not answered'}
                    </div>
                    {a.feedback && (
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{a.feedback}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// =============================================
// MAIN DASHBOARD
// =============================================
export default function StudentDashboard() {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab] = useState('history'); // 'history' | 'profile'
  const [selectedResponse, setSelectedResponse] = useState(null);

  // API Key form
  const [apiKey, setApiKey] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyMsg, setApiKeyMsg] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('studentToken');
    if (!token) { nav('/student/login'); return; }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profileRes, responsesRes] = await Promise.all([
        studentApi.get('/student-auth/me'),
        studentApi.get('/responses/my-responses')
      ]);
      setProfile(profileRes.data);
      setResponses(responsesRes.data);
    } catch {
      nav('/student/login');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) { setApiKeyMsg('Please enter an API key'); return; }
    setApiKeyLoading(true);
    setApiKeyMsg('');
    try {
      await studentApi.put('/student-auth/api-key', { geminiApiKey: apiKey.trim() });
      setApiKeyMsg('✅ API key saved securely!');
      setApiKey('');
      setProfile(prev => ({ ...prev, hasApiKey: true }));
      setTimeout(() => setApiKeyMsg(''), 3000);
    } catch (err) {
      setApiKeyMsg('❌ ' + (err?.response?.data?.message || 'Failed to save'));
    } finally {
      setApiKeyLoading(false);
    }
  };

  const removeApiKey = async () => {
    if (!confirm('Remove your Gemini API key? AI evaluation will fall back to faculty key.')) return;
    setApiKeyLoading(true);
    try {
      await studentApi.delete('/student-auth/api-key');
      setProfile(prev => ({ ...prev, hasApiKey: false }));
      setApiKeyMsg('Key removed successfully');
      setTimeout(() => setApiKeyMsg(''), 3000);
    } catch {
      setApiKeyMsg('Failed to remove key');
    } finally {
      setApiKeyLoading(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Loading your dashboard...</p>
    </div>
  );

  const tabStyle = (active) => ({
    padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    border: 'none', transition: 'all 0.15s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)'
  });

  return (
    <>
      <StudentNavbar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>

        {/* Welcome Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(79,110,247,0.12), rgba(124,106,247,0.08))',
          border: '1px solid rgba(79,110,247,0.2)', borderRadius: 16,
          padding: '24px 28px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 20
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #4f6ef7, #7c6af7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, boxShadow: '0 4px 16px rgba(79,110,247,0.3)'
          }}>
            {profile?.name?.[0]?.toUpperCase() || '🎓'}
          </div>
          <div>
            <h1 style={{ fontSize: 22, marginBottom: 4 }}>Welcome back, {profile?.name}! 👋</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              {profile?.rollNo && <><strong>Roll No:</strong> {profile.rollNo} · </>}
              <strong>Submissions:</strong> {responses.length} assessment{responses.length !== 1 ? 's' : ''} completed
              {profile?.hasApiKey && <> · <span style={{ color: '#22c55e' }}>✅ AI Key Active</span></>}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        {responses.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              {
                label: 'Avg Score',
                value: `${Math.round(responses.reduce((s, r) => s + r.overallScore, 0) / responses.length)}%`,
                icon: '📊', color: 'var(--accent)'
              },
              {
                label: 'Best Score',
                value: `${Math.max(...responses.map(r => r.overallScore))}%`,
                icon: '🏆', color: '#22c55e'
              },
              {
                label: 'Assessments',
                value: responses.length,
                icon: '📝', color: '#7c6af7'
              },
              {
                label: 'Good Results',
                value: responses.filter(r => r.overallLevel === 'Good Understanding').length,
                icon: '🌟', color: '#f59e0b'
              }
            ].map((s, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--card)', padding: 6, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content' }}>
          <button id="tab-history" style={tabStyle(activeTab === 'history')} onClick={() => setTab('history')}>
            📋 My Assessments
          </button>
          <button id="tab-profile" style={tabStyle(activeTab === 'profile')} onClick={() => setTab('profile')}>
            ⚙️ Profile & API Key
          </button>
        </div>

        {/* ===================== HISTORY TAB ===================== */}
        {activeTab === 'history' && (
          <div>
            {responses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📭</div>
                <h3 style={{ marginBottom: 8 }}>No assessments yet</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
                  You haven't submitted any assessments. Use the form link shared by your faculty.
                </p>
                {!profile?.hasApiKey && (
                  <p style={{ color: '#f59e0b', fontSize: 13 }}>
                    💡 Add your Gemini API key in the Profile tab to get AI-powered personalised feedback!
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {responses.map((r) => (
                  <div
                    key={r._id}
                    className="card"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onClick={() => setSelectedResponse(r)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <ScoreRing score={r.overallScore} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 15, marginBottom: 4, fontWeight: 600 }}>
                        {r.form?.title || 'Assessment'}
                      </h3>
                      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
                        {r.form?.subject} · {r.form?.faculty?.name}
                      </p>
                      <LevelBadge level={r.overallLevel} />
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                        {new Date(r.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                        View Details →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== PROFILE & API KEY TAB ===================== */}
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Profile Info */}
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>👤 Profile Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Name', value: profile?.name },
                  { label: 'Email', value: profile?.email },
                  { label: 'Roll Number', value: profile?.rollNo || '—' },
                  { label: 'Member Since', value: new Date(profile?.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }
                ].map((f, i) => (
                  <div key={i} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gemini API Key */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h3>🤖 Gemini API Key</h3>
                {profile?.hasApiKey && (
                  <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                    ✅ Active
                  </span>
                )}
              </div>

              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
                Your personal Gemini API key is used for AI evaluation of your descriptive answers.
                This means your assessment uses <strong>your own free API quota</strong> — not the faculty's tokens.
                Get a free key from{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                  Google AI Studio →
                </a>
              </p>

              {profile?.hasApiKey && (
                <div style={{
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13
                }}>
                  ✅ You have an active API key. Descriptive answers will be evaluated using your Gemini quota.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    id="student-api-key-input"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={profile?.hasApiKey ? 'Enter new key to replace...' : 'AIzaSy...'}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    onClick={() => setShowKey(s => !s)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--muted)'
                    }}
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <button
                  id="save-api-key-btn"
                  className="btn btn-primary"
                  onClick={saveApiKey}
                  disabled={apiKeyLoading}
                  style={{ whiteSpace: 'nowrap', padding: '0 20px' }}
                >
                  {apiKeyLoading ? '...' : profile?.hasApiKey ? 'Update Key' : 'Save Key'}
                </button>
              </div>

              {profile?.hasApiKey && (
                <button
                  id="remove-api-key-btn"
                  onClick={removeApiKey}
                  disabled={apiKeyLoading}
                  style={{
                    marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ef4444', fontSize: 13, padding: 0
                  }}
                >
                  🗑️ Remove API key
                </button>
              )}

              {apiKeyMsg && (
                <p style={{
                  marginTop: 10, fontSize: 13,
                  color: apiKeyMsg.startsWith('✅') ? '#22c55e' : '#ef4444'
                }}>
                  {apiKeyMsg}
                </p>
              )}
            </div>

            {/* Info Card */}
            <div style={{
              background: 'rgba(79,110,247,0.05)', border: '1px solid rgba(79,110,247,0.15)',
              borderRadius: 12, padding: '16px 18px'
            }}>
              <h4 style={{ marginBottom: 8 }}>🔒 Security Note</h4>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Your Gemini API key is encrypted using AES-256 encryption before being stored in our database.
                It is never exposed in API responses and is only decrypted server-side when needed to call the Gemini API.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Result Modal */}
      {selectedResponse && (
        <ResultModal response={selectedResponse} onClose={() => setSelectedResponse(null)} />
      )}
    </>
  );
}
