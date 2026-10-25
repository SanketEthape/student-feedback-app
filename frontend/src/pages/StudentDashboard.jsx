import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from '../components/StudentNavbar';
import { studentApi } from '../api';
import PracticeModal from '../components/PracticeModal';

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
// =============================================
// ASSESSMENT RESULT FULL VIEW (INLINE, NO POPUP)
// =============================================
const AssessmentResultView = ({
  response,
  onBack,
  hasApiKey,
  onNavigateToSettings,
  onOpenPractice,
  onPlanGenerated
}) => {
  if (!response) return null;
  const form = response.form || {};

  const [activeResultTab, setActiveResultTab] = useState('results'); // 'results' | 'resources'
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [localStudyPlan, setLocalStudyPlan] = useState(response.aiStudyPlan);
  const [planErr, setPlanErr] = useState('');

  const generatePlan = async () => {
    setGeneratingPlan(true);
    setPlanErr('');
    try {
      const { data } = await studentApi.post(`/responses/my-responses/${response._id}/study-plan`);
      setLocalStudyPlan(data.aiStudyPlan);
      if (onPlanGenerated) onPlanGenerated(response._id, data.aiStudyPlan);
    } catch (err) {
      setPlanErr(err?.response?.data?.message || 'Failed to generate study plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Compile all unique topics for the unit from topicResources, questions, and answers
  const allTopics = [
    ...new Set([
      ...(form.topicResources || []).map(r => r.topic?.trim()).filter(Boolean),
      ...(form.questions || []).map(q => q.topic?.trim()).filter(Boolean),
      ...(response.answers || []).map(a => a.topic?.trim()).filter(Boolean)
    ])
  ];

  // Helper to determine student's standing on each topic
  const getTopicStatus = (topic) => {
    const matchingAnswers = (response.answers || []).filter(
      a => a.topic && a.topic.trim().toLowerCase() === topic.toLowerCase()
    );
    if (matchingAnswers.length === 0) {
      return { label: '📘 Unit Topic', color: 'var(--muted)', bg: 'rgba(107,114,128,0.1)' };
    }
    const hasWrong = matchingAnswers.some(a => a.isCorrect === false || a.level === 'Low' || a.level === 'Average');
    if (hasWrong) {
      return { label: '🔴 Needs Revision', color: '#dc2626', bg: 'rgba(239,68,68,0.1)' };
    }
    return { label: '🟢 Mastered', color: '#16a34a', bg: 'rgba(34,197,94,0.1)' };
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Top Bar with Back Button */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)'
      }}>
        <button
          onClick={onBack}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 13, padding: '8px 16px', fontWeight: 600
          }}
        >
          <span>←</span>
          <span>Back to Assessments</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {response.attemptNumber && (
            <span style={{ fontSize: 12, background: 'rgba(79,110,247,0.1)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>
              Attempt #{response.attemptNumber}
            </span>
          )}
          {response.isAnonymous && (
            <span style={{ fontSize: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>
              🎭 Anonymous Submission
            </span>
          )}
        </div>
      </div>

      {/* Header Assessment Card */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, margin: '0 0 6px' }}>{form.title || 'Assessment'}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              <strong>Subject:</strong> {form.subject} {form.unit ? `· Unit: ${form.unit}` : ''}
              <br />
              <strong>Faculty:</strong> {form.faculty?.name || 'Faculty'} · <strong>Submitted:</strong> {new Date(response.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <LevelBadge level={response.overallLevel} />
        </div>
      </div>

      {/* Result Tabs Navigation */}
      <div style={{
        display: 'flex', gap: 10, borderBottom: '2px solid var(--border)',
        paddingBottom: 0, marginTop: 4
      }}>
        <button
          type="button"
          onClick={() => setActiveResultTab('results')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeResultTab === 'results' ? '3px solid var(--accent)' : '3px solid transparent',
            background: activeResultTab === 'results' ? 'rgba(79,110,247,0.08)' : 'transparent',
            color: activeResultTab === 'results' ? 'var(--accent)' : 'var(--muted)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2
          }}
        >
          <span>📊</span>
          <span>Assessment &amp; AI Results</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveResultTab('resources')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeResultTab === 'resources' ? '3px solid var(--accent)' : '3px solid transparent',
            background: activeResultTab === 'resources' ? 'rgba(79,110,247,0.08)' : 'transparent',
            color: activeResultTab === 'resources' ? 'var(--accent)' : 'var(--muted)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2
          }}
        >
          <span>📚</span>
          <span>Faculty Shared Resources</span>
          <span style={{
            background: activeResultTab === 'resources' ? 'var(--accent)' : 'var(--border)',
            color: activeResultTab === 'resources' ? '#fff' : 'var(--muted)',
            padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700
          }}>
            {allTopics.length}
          </span>
        </button>
      </div>

      {/* ====================================================== */}
      {/* TAB 1: ASSESSMENT & AI RESULTS                         */}
      {/* ====================================================== */}
      {activeResultTab === 'results' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Score Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {[
              { label: 'Overall Score', value: `${response.overallScore}%`, color: 'var(--accent)' },
              { label: 'Correct MCQs', value: `${response.answers?.filter(a => a.isCorrect === true).length || 0} ✅`, color: '#22c55e' },
              { label: 'Wrong MCQs', value: `${response.answers?.filter(a => a.isCorrect === false).length || 0} ❌`, color: '#ef4444' },
              { label: 'Descriptive Evaluated', value: `${response.answers?.filter(a => a.questionType === 'text').length || 0} ✍️`, color: '#7c6af7' }
            ].map((s, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI UNIT STUDY PLAN & ESTIMATED STUDY HOURS */}
          {localStudyPlan ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(79,110,247,0.06) 0%, rgba(16,185,129,0.06) 100%)',
              border: '1px solid rgba(79,110,247,0.2)',
              borderRadius: 12,
              padding: '18px 20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>🤖</span>
                  <strong style={{ fontSize: 15, color: 'var(--text)' }}>AI Unit Diagnostic &amp; Study Plan</strong>
                </div>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#047857',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '3px 10px',
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  ⏱️ Study Time Needed: ~{localStudyPlan.totalEstimatedHours || 1} hrs
                </span>
              </div>

              {localStudyPlan.unitSummary && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', marginBottom: 14 }}>
                  {localStudyPlan.unitSummary}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {/* Strong Areas */}
                <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#047857', marginBottom: 6 }}>
                    🟢 Mastered Concepts in this Unit
                  </div>
                  {localStudyPlan.strongTopics && localStudyPlan.strongTopics.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {localStudyPlan.strongTopics.map((st, i) => (
                        <span key={i} style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                          ✓ {st}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Continue practicing to build strength in this unit.</span>
                  )}
                </div>

                {/* Weak Areas & Study Hours */}
                <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#b91c1c', marginBottom: 6 }}>
                    🔴 Weak Concepts &amp; Required Study Hours
                  </div>
                  {localStudyPlan.weakTopics && localStudyPlan.weakTopics.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {localStudyPlan.weakTopics.map((wt, i) => (
                        <div key={i} style={{ background: '#fff', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, flexWrap: 'wrap', gap: 4 }}>
                            <strong style={{ fontSize: 12, color: '#b91c1c' }}>{wt.topic}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                                ⏳ ~{wt.estimatedHours || 1} hr{wt.estimatedHours > 1 ? 's' : ''}
                              </span>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ fontSize: 10, padding: '2px 6px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                                onClick={() => onOpenPractice && onOpenPractice(wt.topic, form.subject, form.unit || form.title)}
                              >
                                🎯 Practice 3 Qs
                              </button>
                            </div>
                          </div>
                          {wt.advice && (
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
                              {wt.advice}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>🎉 No weak concepts detected in this unit!</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* LOCKED / GENERATE BANNER */
            hasApiKey ? (
              <div style={{
                background: 'rgba(79,110,247,0.06)',
                border: '1px solid rgba(79,110,247,0.2)',
                borderRadius: 12,
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>✨ AI Unit Diagnostic &amp; Study Hours Planner</strong>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      Calculate exact study hours needed for weak topics and get strong/weak concepts breakdown.
                    </p>
                    {planErr && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{planErr}</p>}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '6px 14px' }}
                    onClick={generatePlan}
                    disabled={generatingPlan}
                  >
                    {generatingPlan ? '🤖 Generating...' : '✨ Generate AI Study Plan'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 12,
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>✨</span>
                  <strong style={{ color: '#d97706', fontSize: 14 }}>
                    Unlock AI Unit Study Plan &amp; Practice Questions:
                  </strong>
                </div>
                <p style={{ margin: '4px 0 10px', fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                  Add your free Gemini API key to calculate <strong>how many study hours</strong> you need on weak topics, see your <strong>Strong vs. Weak Areas</strong> for this unit, and practice interactive AI questions on any concept.
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={onNavigateToSettings}
                >
                  ⚙️ Add Gemini API Key in Profile →
                </button>
              </div>
            )
          )}

          {/* MCQ Answers */}
          {response.answers?.filter(a => a.questionType === 'mcq').length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12 }}>📝 MCQ Review</h3>
              <div style={{ display: 'grid', gap: 10 }}>
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
            </div>
          )}

          {/* Descriptive Answers */}
          {response.answers?.filter(a => a.questionType === 'text').length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12 }}>✍️ Descriptive Review</h3>
              <div style={{ display: 'grid', gap: 10 }}>
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
            </div>
          )}

          {/* Callout to Shared Resources Tab */}
          <div className="card" style={{
            background: 'rgba(79,110,247,0.04)',
            border: '1px dashed var(--accent)',
            padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
          }}>
            <div>
              <strong style={{ fontSize: 14 }}>📚 Want to explore all faculty learning materials?</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Access faculty video lectures and targeted 3-question practice for all topics in this unit.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveResultTab('resources')}
              style={{ fontSize: 12, padding: '7px 16px' }}
            >
              View Faculty Resources ({allTopics.length}) →
            </button>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* TAB 2: FACULTY SHARED RESOURCES (FOR ALL STUDENTS)     */}
      {/* ====================================================== */}
      {activeResultTab === 'resources' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(79,110,247,0.06), rgba(16,185,129,0.05))',
            border: '1px solid rgba(79,110,247,0.2)', padding: '16px 20px'
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>📚 Faculty Shared Learning Materials &amp; Lecture Videos</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
              All resources shared by faculty for <strong>{form.subject}</strong> {form.unit ? `(${form.unit})` : ''} are provided below for all students regardless of test score. Review the recommended lectures and practice any topic with targeted AI questions!
            </p>
          </div>

          {allTopics.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--muted)' }}>
              No topic resources were found for this assessment.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {allTopics.map((topic, i) => {
                const matchedResource = (form.topicResources || []).find(
                  tr => tr.topic && tr.topic.trim().toLowerCase() === topic.toLowerCase()
                );
                const videoUrl = matchedResource?.videoUrl?.trim();
                const resourceTitle = matchedResource?.title?.trim();
                const status = getTopicStatus(topic);

                return (
                  <div key={i} className="card" style={{
                    padding: '16px 20px',
                    borderLeft: `4px solid ${videoUrl ? 'var(--accent)' : 'var(--border)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>📖 {topic}</span>
                          <span style={{
                            background: status.bg, color: status.color,
                            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700
                          }}>
                            {status.label}
                          </span>
                        </div>
                        {resourceTitle && (
                          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                            📌 <em>{resourceTitle}</em>
                          </div>
                        )}
                        {!videoUrl && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                            No external video attached by faculty · Targeted AI practice available
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {videoUrl && (
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{
                              fontSize: 12, padding: '6px 14px',
                              textDecoration: 'none', background: '#059669', borderColor: '#059669',
                              display: 'inline-flex', alignItems: 'center', gap: 6
                            }}
                          >
                            <span>🎥</span>
                            <span>Watch Faculty Video</span>
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => onOpenPractice && onOpenPractice(topic, form.subject || '', form.unit || form.title || '')}
                          style={{
                            fontSize: 12, padding: '6px 14px',
                            borderColor: 'var(--accent)', color: 'var(--accent)',
                            display: 'inline-flex', alignItems: 'center', gap: 6
                          }}
                        >
                          <span>🎯</span>
                          <span>Practice 3 Questions</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab] = useState('assigned'); // 'assigned' | 'history' | 'profile'
  const [selectedResponse, setSelectedResponse] = useState(null);

  // Interactive Practice Modal state
  const [practiceTopic, setPracticeTopic] = useState('');
  const [practiceSubject, setPracticeSubject] = useState('');
  const [practiceUnit, setPracticeUnit] = useState('');
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);

  // Profile Edit form state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    rollNo: '',
    branch: 'Computer Engineering',
    studentClass: 'FY',
    division: 'A',
    currentPassword: '',
    newPassword: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

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
      const [profileRes, responsesRes, notifRes] = await Promise.all([
        studentApi.get('/student-auth/me'),
        studentApi.get('/responses/my-responses'),
        studentApi.get('/notifications/my').catch(() => ({ data: [] }))
      ]);
      setProfile(profileRes.data);
      setResponses(responsesRes.data);
      setNotifications(notifRes.data || []);
    } catch {
      nav('/student/login');
    } finally {
      setLoading(false);
    }
  };

  const markNotificationRead = async (notifId) => {
    try {
      await studentApi.patch(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  };

  const startEditingProfile = () => {
    setProfileFormData({
      name: profile?.name || '',
      rollNo: profile?.rollNo || '',
      branch: profile?.branch || 'Computer Engineering',
      studentClass: profile?.studentClass || 'FY',
      division: profile?.division || 'A',
      currentPassword: '',
      newPassword: ''
    });
    setProfileMsg('');
    setEditingProfile(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileFormData.name.trim()) {
      setProfileMsg('❌ Name cannot be empty');
      return;
    }
    if (!profileFormData.rollNo.trim()) {
      setProfileMsg('❌ Roll number cannot be empty');
      return;
    }
    if (!profileFormData.branch.trim()) {
      setProfileMsg('❌ Branch cannot be empty');
      return;
    }
    if (!profileFormData.division.trim()) {
      setProfileMsg('❌ Division cannot be empty');
      return;
    }
    if (profileFormData.newPassword && !profileFormData.currentPassword) {
      setProfileMsg('❌ Current password is required to change password');
      return;
    }

    setProfileSaving(true);
    setProfileMsg('');
    try {
      const payload = {
        name: profileFormData.name.trim(),
        rollNo: profileFormData.rollNo.trim(),
        branch: profileFormData.branch.trim(),
        studentClass: profileFormData.studentClass,
        division: profileFormData.division.trim().toUpperCase()
      };
      if (profileFormData.newPassword) {
        payload.currentPassword = profileFormData.currentPassword;
        payload.newPassword = profileFormData.newPassword;
      }

      const { data } = await studentApi.put('/student-auth/profile', payload);
      setProfile(data.student);
      setEditingProfile(false);
      setProfileMsg('✅ Profile updated successfully!');
      setTimeout(() => setProfileMsg(''), 4000);

      // Refresh notifications in case class, division or branch targeting changed
      const notifRes = await studentApi.get('/notifications/my').catch(() => ({ data: [] }));
      setNotifications(notifRes.data || []);
    } catch (err) {
      setProfileMsg('❌ ' + (err?.response?.data?.message || 'Failed to update profile'));
    } finally {
      setProfileSaving(false);
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
        {selectedResponse ? (
          <AssessmentResultView
            response={selectedResponse}
            onBack={() => setSelectedResponse(null)}
            hasApiKey={!!profile?.hasApiKey}
            onNavigateToSettings={() => {
              setSelectedResponse(null);
              setTab('profile');
            }}
            onOpenPractice={(topic, subject, unit) => {
              setPracticeTopic(topic);
              setPracticeSubject(subject);
              setPracticeUnit(unit);
              setPracticeModalOpen(true);
            }}
            onPlanGenerated={(responseId, plan) => {
              setResponses(prev => prev.map(r => r._id === responseId ? { ...r, aiStudyPlan: plan } : r));
              setSelectedResponse(prev => prev?._id === responseId ? { ...prev, aiStudyPlan: plan } : prev);
            }}
          />
        ) : (
          <>
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
              {profile?.branch && <><strong>Branch:</strong> {profile.branch} · </>}
              {profile?.studentClass && <><strong>Class:</strong> {profile.studentClass} ({profile.division}) · </>}
              {profile?.rollNo && <><strong>Roll No:</strong> {profile.rollNo} · </>}
              <strong>Submissions:</strong> {responses.length} assessment{responses.length !== 1 ? 's' : ''} completed
              {profile?.hasApiKey && <> · <span style={{ color: '#22c55e' }}>✅ AI Key Active</span></>}
            </p>
          </div>
        </div>

        {/* Gemini API Key Warning Banner */}
        {!profile?.hasApiKey && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
              <span style={{ fontSize: 24 }}>🚀</span>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <strong style={{ color: '#d97706' }}>Unlock AI Study Plans & Interactive Practice:</strong>
                <span style={{ color: 'var(--text)', display: 'block', marginTop: 2 }}>
                  Connect your free Gemini API key to unlock <strong>Unit Diagnostic & Study Hours Planning</strong>, <strong>🎯 3-Question Practice on Weak Topics</strong>, and detailed AI feedback.
                </span>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setTab('profile')}
              style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
            >
              ⚙️ Connect Free API Key
            </button>
          </div>
        )}

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
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--card)', padding: 6, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content', flexWrap: 'wrap' }}>
          <button id="tab-assigned" style={tabStyle(activeTab === 'assigned')} onClick={() => setTab('assigned')}>
            🔔 Assigned Forms {notifications.filter(n => !n.isRead).length > 0 && (
              <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', fontSize: 11, padding: '1px 6px', borderRadius: 10 }}>
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
          <button id="tab-history" style={tabStyle(activeTab === 'history')} onClick={() => setTab('history')}>
            📋 My Assessments ({responses.length})
          </button>
          <button id="tab-profile" style={tabStyle(activeTab === 'profile')} onClick={() => setTab('profile')}>
            ⚙️ Profile &amp; API Key
          </button>
        </div>

        {/* ===================== ASSIGNED TAB ===================== */}
        {activeTab === 'assigned' && (
          <div>
            {notifications.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🔔</div>
                <h3 style={{ marginBottom: 8 }}>No assigned assessments yet</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 500, margin: '0 auto 16px', lineHeight: 1.6 }}>
                  Assessments published by your faculty for <strong>{profile?.studentClass || 'your class'} - Div {profile?.division || ''}</strong> will appear here automatically.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {notifications.map((n) => {
                  const form = n.form || {};
                  const pastAttempts = responses.filter(r => (r.form?._id || r.form) === form._id);
                  const latestAttempt = pastAttempts[0];
                  const reattemptDays = typeof form.reattemptDays === 'number' ? form.reattemptDays : 0;

                  let cooldownActive = false;
                  let remainingText = '';
                  if (latestAttempt && reattemptDays > 0) {
                    const elapsedMs = Date.now() - new Date(latestAttempt.submittedAt).getTime();
                    const requiredMs = reattemptDays * 24 * 60 * 60 * 1000;
                    if (elapsedMs < requiredMs) {
                      cooldownActive = true;
                      const remainingMs = requiredMs - elapsedMs;
                      const remDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
                      const remHours = Math.ceil(remainingMs / (60 * 60 * 1000));
                      remainingText = remDays > 1 ? `${remDays} days` : `${remHours} hrs`;
                    }
                  }

                  const hasCompletedSingle = latestAttempt && reattemptDays === 0;

                  return (
                    <div
                      key={n._id}
                      className="card"
                      style={{
                        padding: '18px 20px',
                        borderLeft: `4px solid ${!latestAttempt ? 'var(--accent)' : hasCompletedSingle ? '#22c55e' : cooldownActive ? '#f59e0b' : '#3b82f6'}`,
                        background: !n.isRead ? 'rgba(79,110,247,0.03)' : undefined
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>{n.title || form.title || 'Assessment'}</h3>
                            {!n.isRead && (
                              <span style={{ background: 'rgba(79,110,247,0.15)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                                NEW
                              </span>
                            )}
                            {form.allowAnonymous && (
                              <span style={{ background: 'rgba(107,114,128,0.1)', color: 'var(--muted)', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>
                                🎭 Anonymous Allowed
                              </span>
                            )}
                          </div>
                          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                            {n.subject || form.subject} · By {n.facultyName || form.faculty?.name || 'Faculty'} · Assigned {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {!latestAttempt ? (
                            <span style={{ background: 'rgba(79,110,247,0.12)', color: 'var(--accent)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                              🟢 Not Attempted
                            </span>
                          ) : hasCompletedSingle ? (
                            <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                              ✅ Completed ({latestAttempt.overallScore}%)
                            </span>
                          ) : cooldownActive ? (
                            <span style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                              ⏳ Cooldown ({remainingText} left)
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                              🔄 Retake Available (Attempt #{pastAttempts.length + 1})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer with Details & Action Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {pastAttempts.length > 0 ? (
                            <>
                              <strong>Past Attempts:</strong> {pastAttempts.length} · Best Score:{' '}
                              <strong>{Math.max(...pastAttempts.map(p => p.overallScore))}%</strong>
                              {reattemptDays > 0 ? ` · Retake allowed every ${reattemptDays}d` : ' · Single attempt only'}
                            </>
                          ) : (
                            <span>{reattemptDays > 0 ? `Allowed retakes every ${reattemptDays} days` : 'Single attempt only'}</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          {latestAttempt && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setSelectedResponse(latestAttempt)}
                              style={{ fontSize: 12, padding: '6px 14px' }}
                            >
                              👁️ View Past Result
                            </button>
                          )}

                          {!latestAttempt && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                markNotificationRead(n._id);
                                nav(`/f/${form.uniqueLink}`);
                              }}
                              style={{ fontSize: 12, padding: '6px 16px' }}
                            >
                              🚀 Start Assessment →
                            </button>
                          )}

                          {latestAttempt && !hasCompletedSingle && !cooldownActive && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => {
                                markNotificationRead(n._id);
                                nav(`/f/${form.uniqueLink}`);
                              }}
                              style={{ fontSize: 12, padding: '6px 16px', background: '#2563eb', borderColor: '#2563eb' }}
                            >
                              🔄 Re-attempt Assessment →
                            </button>
                          )}

                          {latestAttempt && cooldownActive && (
                            <button
                              type="button"
                              disabled
                              className="btn btn-secondary"
                              style={{ fontSize: 12, padding: '6px 14px', opacity: 0.6, cursor: 'not-allowed' }}
                              title={`Cooldown active. You can attempt this assessment again in ${remainingText}.`}
                            >
                              ⏳ In Cooldown ({remainingText})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== HISTORY TAB ===================== */}
        {activeTab === 'history' && (
          <div>
            {responses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📭</div>
                <h3 style={{ marginBottom: 8 }}>No assessments completed yet</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
                  You haven't submitted any assessments yet. Check the Assigned Forms tab above to start.
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>
                          {r.form?.title || 'Assessment'}
                        </h3>
                        {r.attemptNumber && (
                          <span style={{ fontSize: 11, background: 'rgba(79,110,247,0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                            Attempt #{r.attemptNumber}
                          </span>
                        )}
                        {r.isAnonymous && (
                          <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                            🎭 Anonymous
                          </span>
                        )}
                      </div>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ margin: 0 }}>👤 Profile Information</h3>
                {!editingProfile ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={startEditingProfile}
                    style={{ fontSize: 13, padding: '6px 14px' }}
                  >
                    ✏️ Edit Profile
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setEditingProfile(false); setProfileMsg(''); }}
                    style={{ fontSize: 13, padding: '6px 14px' }}
                  >
                    ✕ Cancel
                  </button>
                )}
              </div>

              {profileMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                  fontWeight: 500,
                  background: profileMsg.startsWith('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  color: profileMsg.startsWith('✅') ? '#22c55e' : '#ef4444',
                  border: `1px solid ${profileMsg.startsWith('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                }}>
                  {profileMsg}
                </div>
              )}

              {!editingProfile ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  {[
                    { label: 'Name', value: profile?.name },
                    { label: 'Email', value: profile?.email },
                    { label: 'Branch / Dept', value: profile?.branch || 'Computer Engineering' },
                    { label: 'Class', value: profile?.studentClass || '—' },
                    { label: 'Division', value: profile?.division || '—' },
                    { label: 'Roll Number', value: profile?.rollNo || '—' },
                    { label: 'Member Since', value: new Date(profile?.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }
                  ].map((f, i) => (
                    <div key={i} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{f.label}</div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileFormData.name}
                        onChange={e => setProfileFormData({ ...profileFormData, name: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                        Branch / Department *
                      </label>
                      <select
                        value={profileFormData.branch}
                        onChange={e => setProfileFormData({ ...profileFormData, branch: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      >
                        {[
                          'Computer Engineering',
                          'Information Technology',
                          'AI & Data Science',
                          'Electronics & Telecommunication',
                          'Mechanical Engineering',
                          'Civil Engineering',
                          'Electrical Engineering'
                        ].map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                        Roll Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileFormData.rollNo}
                        onChange={e => setProfileFormData({ ...profileFormData, rollNo: e.target.value })}
                        placeholder="e.g. 21CS001"
                        style={{ width: '100%', padding: '9px 12px', fontSize: 14 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                        Class *
                      </label>
                      <select
                        value={profileFormData.studentClass}
                        onChange={e => setProfileFormData({ ...profileFormData, studentClass: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      >
                        <option value="FY">FY (First Year)</option>
                        <option value="SY">SY (Second Year)</option>
                        <option value="TY">TY (Third Year)</option>
                        <option value="Final Year">Final Year</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                        Division *
                      </label>
                      <select
                        value={profileFormData.division}
                        onChange={e => setProfileFormData({ ...profileFormData, division: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      >
                        {['A', 'B', 'C', 'D', 'E'].map(d => (
                          <option key={d} value={d}>Division {d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                        Registered Email
                      </label>
                      <input
                        type="text"
                        disabled
                        value={profile?.email || ''}
                        style={{ width: '100%', padding: '9px 12px', fontSize: 14, opacity: 0.65, cursor: 'not-allowed' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Email is verified and cannot be changed</span>
                    </div>
                  </div>

                  {/* Change Password Sub-section */}
                  <div style={{
                    marginTop: 8,
                    padding: '16px',
                    borderRadius: 10,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      🔒 Change Password (Optional)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={profileFormData.currentPassword}
                          onChange={e => setProfileFormData({ ...profileFormData, currentPassword: e.target.value })}
                          placeholder="Required only to set new password"
                          style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                          New Password
                        </label>
                        <input
                          type="password"
                          value={profileFormData.newPassword}
                          onChange={e => setProfileFormData({ ...profileFormData, newPassword: e.target.value })}
                          placeholder="Min 6 characters"
                          style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setEditingProfile(false); setProfileMsg(''); }}
                      disabled={profileSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={profileSaving}
                      style={{ minWidth: 140 }}
                    >
                      {profileSaving ? 'Saving...' : '💾 Save Changes'}
                    </button>
                  </div>
                </form>
              )}
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

              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>
                Your personal Gemini API key unlocks exclusive study tools using <strong>your own free API quota</strong> — never using faculty tokens:
              </p>
              <ul style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, marginBottom: 18, paddingLeft: 20 }}>
                <li>📊 <strong>AI Unit Diagnostic & Study Hours Planner:</strong> Instant breakdown of strong/weak areas and estimated study hours needed.</li>
                <li>🎯 <strong>Targeted 3-Question Practice:</strong> On-demand interactive practice questions on your weak topics with explanations.</li>
                <li>✍️ <strong>AI Descriptive Answer Evaluation:</strong> Instant grading and detailed feedback on your written answers.</li>
              </ul>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
                Get a 100% free key from{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                  Google AI Studio →
                </a>
              </p>

              {profile?.hasApiKey && (
                <div style={{
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13
                }}>
                  ✅ You have an active API key. All AI diagnostic, practice questions, and descriptive grading tools are enabled!
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
          </>
        )}
      </div>

      {/* Interactive Practice Modal */}
      <PracticeModal
        isOpen={practiceModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        topic={practiceTopic}
        subject={practiceSubject}
        unit={practiceUnit}
        hasApiKey={!!profile?.hasApiKey}
        onNavigateToSettings={() => {
          setPracticeModalOpen(false);
          setTab('profile');
        }}
      />
    </>
  );
}
