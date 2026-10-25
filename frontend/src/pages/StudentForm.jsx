import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { studentApi } from "../api";
import PracticeModal from "../components/PracticeModal";

export default function StudentForm() {
  const { link } = useParams();
  const nav = useNavigate();

  const [form, setForm] = useState(null);
  const [err, setErr] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [loadingAccess, setLoadingAccess] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [accessBlocked, setAccessBlocked] = useState(null);

  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  // Practice Modal State
  const [practiceTopic, setPracticeTopic] = useState("");
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState("results"); // 'results' | 'resources'

  const openPracticeModal = (topicName) => {
    setPracticeTopic(topicName);
    setPracticeModalOpen(true);
  };

  // form | done
  const [step, setStep] = useState("form");

  // Result data
  const [result, setResult] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('studentToken');
    if (!token) {
      setIsAuthRequired(true);
      setLoadingAccess(false);
      return;
    }

    setLoadingAccess(true);
    Promise.all([
      studentApi.get(`/responses/check-access/${link}`),
      studentApi.get(`/forms/link/${link}`)
    ]).then(([accessRes, formRes]) => {
      setForm(formRes.data);
      if (formRes.data.allowAnonymous) {
        setIsAnonymous(true);
      }
      setStudentInfo(accessRes.data.student);
      setAttemptNumber(accessRes.data.attemptNumber || 1);
    }).catch((error) => {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 401) {
        setIsAuthRequired(true);
      } else if (status === 403 || status === 404) {
        setAccessBlocked(data || { message: 'Access denied to this assessment.' });
      } else {
        setErr(data?.message || 'Failed to load assessment.');
      }
    }).finally(() => {
      setLoadingAccess(false);
    });
  }, [link]);

  const setAnswer = (qId, val) =>
    setAnswers((prev) => ({
      ...prev,
      [qId]: val,
    }));

  // ==========================
  // SUBMIT FORM
  // ==========================

  const submit = async () => {
    const answersArr = form.questions.map((q) => ({
      questionId: q._id,
      answer: answers[q._id] || "",
    }));

    setLoading(true);
    setErr("");

    try {
      const payload = {
        answers: answersArr,
        isAnonymous
      };

      const { data } = await studentApi.post(`/responses/submit/${link}`, payload);

      // Save complete result from backend
      setResult(data);

      // Show result page
      setStep("done");
    } catch (error) {
      console.error(error);
      setErr(
        error?.response?.data?.message ||
        "Submission failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // AUTH REQUIRED GATE
  // ==========================

  if (isAuthRequired) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        <div className="card" style={{ maxWidth: 460, width: "100%", textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Student Login Required</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Submitting this assessment requires a verified student registration. Please log in or register with your college class and division to continue.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", fontSize: 14 }}
              onClick={() => nav(`/student/login?redirect=/f/${link}`)}
            >
              🔑 Log In to Continue
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: "100%", padding: "12px", fontSize: 14 }}
              onClick={() => nav(`/student/register?redirect=/f/${link}`)}
            >
              📝 Register Student Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================
  // ACCESS BLOCKED (CLASS / DIVISION / COOLDOWN)
  // ==========================

  if (accessBlocked) {
    const isCooldown = accessBlocked.reason === "cooldown_active";
    const isCompleted = accessBlocked.reason === "single_attempt_completed";

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        <div className="card" style={{ maxWidth: 500, width: "100%", textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            {isCooldown ? "⏳" : isCompleted ? "✅" : "🚫"}
          </div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>
            {isCooldown ? "Assessment Cooldown Active" : isCompleted ? "Assessment Completed" : "Access Restricted"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            {accessBlocked.message}
          </p>

          {accessBlocked.lastSubmission && (
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: "1px solid var(--border)", textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Your Previous Submission</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>Score: {accessBlocked.lastSubmission.score}%</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(accessBlocked.lastSubmission.submittedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: 14 }}
            onClick={() => nav("/student/dashboard")}
          >
            📋 Go to My Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================
  // ERROR PAGE
  // ==========================

  if (err && !form)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="card" style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h3>{err}</h3>
        </div>
      </div>
    );

  // ==========================
  // LOADING FORM
  // ==========================

  if (loadingAccess || !form)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--muted)" }}>Verifying student enrollment &amp; loading assessment...</p>
      </div>
    );

  return (
    <div style={{ minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* HEADER */}

        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              color: "var(--accent)",
              fontFamily: "DM Serif Display",
              fontSize: 22,
              marginBottom: 4,
            }}
          >
            Smart Student Learning &amp; Feedback System
          </div>

          <h2 style={{ marginBottom: 4 }}>{form.title}</h2>

          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            {form.faculty?.name} · {form.faculty?.department} ·{" "}
            {form.subject}
          </p>

          {/* Logged-in student status bar & Anonymous option */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 16,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "14px 18px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🎓</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {studentInfo?.name}{" "}
                  {studentInfo?.rollNo && <span style={{ color: "var(--muted)", fontWeight: 400 }}>({studentInfo.rollNo})</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Class: <strong>{studentInfo?.studentClass || "Enrolled"}</strong> · Div: <strong>{studentInfo?.division || "—"}</strong> · Attempt <strong>#{attemptNumber}</strong>
                </div>
              </div>
            </div>

            {form.allowAnonymous ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(16,185,129,0.08)",
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(16,185,129,0.3)"
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>
                  🎭 Anonymous Submission Active (Identity Hidden from Faculty)
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                Verified submission (Faculty disabled anonymous responses — Name &amp; Roll No will be visible)
              </span>
            )}
          </div>
        </div>


        {/* ========================== */}
        {/* STEP: QUESTIONS */}
        {/* ========================== */}

        {step === "form" && (
          <div>
            <div style={{ display: "grid", gap: 16 }}>
              {form.questions.map((q, i) => (
                <div key={q._id} className="card">

                  {/* Question Number + Topic */}

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--accent)",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      Q{i + 1}
                    </span>

                    <span
                      className="tag"
                      style={{
                        background: "rgba(79,110,247,0.1)",
                        color: "var(--accent)",
                        fontSize: 11,
                      }}
                    >
                      {q.topic}
                    </span>
                  </div>

                  <p
                    style={{
                      marginBottom: 14,
                      fontSize: 15,
                      lineHeight: 1.6,
                    }}
                  >
                    {q.question}
                  </p>

                  {/* MCQ */}

                  {q.type === "mcq" && (
                    <div style={{ display: "grid", gap: 8 }}>
                      {q.options.map((opt, j) => (
                        <label
                          key={j}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            borderRadius: 8,
                            cursor: "pointer",

                            background:
                              answers[q._id] === opt
                                ? "rgba(79,110,247,0.1)"
                                : "#f9fafb",
                            border: `1px solid ${answers[q._id] === opt ? "var(--accent)" : "var(--border)"}`,
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="radio"
                            name={q._id}
                            value={opt}
                            checked={answers[q._id] === opt}
                            onChange={() =>
                              setAnswer(q._id, opt)
                            }
                            style={{ width: "auto" }}
                          />

                          <span style={{ fontSize: 14 }}>
                            {opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* SCALE */}

                  {q.type === "scale" && (
                    <div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {["1", "2", "3", "4", "5"].map((n) => (
                          <button
                            key={n}
                            onClick={() =>
                              setAnswer(q._id, n)
                            }
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              cursor: "pointer",
                              fontSize: 16,
                              fontWeight: 600,

                              background:
                                answers[q._id] === n
                                  ? "var(--accent)"
                                  : "var(--bg)",

                              color:
                                answers[q._id] === n
                                  ? "#fff"
                                  : "var(--muted)",

                              border: `1px solid ${answers[q._id] === n
                                ? "var(--accent)"
                                : "var(--border)"
                                }`,
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          Not at all
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          Completely
                        </span>
                      </div>
                    </div>
                  )}

                  {/* TEXT */}

                  {q.type === "text" && (
                    <textarea
                      rows={3}
                      value={answers[q._id] || ""}
                      onChange={(e) =>
                        setAnswer(q._id, e.target.value)
                      }
                      placeholder="Type your answer here..."
                    />
                  )}
                </div>
              ))}
            </div>

            {err && (
              <p
                style={{
                  color: "var(--danger)",
                  margin: "12px 0",
                  fontSize: 14,
                }}
              >
                {err}
              </p>
            )}

            <button
              className="btn btn-primary"
              style={{
                width: "100%",
                marginTop: 20,
                padding: 14,
                fontSize: 16,
              }}
              onClick={submit}
              disabled={loading}
            >
              {loading
                ? "⏳ Checking answers & preparing learning resources..."
                : "🚀 Submit & View Results"}
            </button>
          </div>
        )}

        {/* ========================== */}
        {/* STEP 3: RESULT PAGE */}
        {/* ========================== */}

        {step === "done" && result && (
          <div>

            {/* SUCCESS */}

            <div
              className="card"
              style={{
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 60, marginBottom: 12 }}>
                🎉
              </div>

              <h2 style={{ marginBottom: 8 }}>
                Assessment Completed!
              </h2>

              <p style={{ color: "var(--muted)" }}>
                Here is your learning result and personalized recommendations.
              </p>
            </div>

            {/* SCORE */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div
                className="card"
                style={{ textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {result.score?.percentage || 0}%
                </div>

                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  Score
                </div>
              </div>

              <div
                className="card"
                style={{ textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {result.score?.correct || 0} ✅
                </div>

                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  Correct
                </div>
              </div>

              <div
                className="card"
                style={{ textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {result.score?.wrong || 0} ❌
                </div>

                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  Wrong
                </div>
              </div>
            </div>

            {/* TAB NAVIGATION FOR POST-SUBMISSION RESULTS */}
            {(() => {
              const allFormTopics = [
                ...new Set([
                  ...(form?.topicResources || []).map(r => r.topic?.trim()).filter(Boolean),
                  ...(form?.questions || []).map(q => q.topic?.trim()).filter(Boolean),
                  ...(result?.answers || []).map(a => a.topic?.trim()).filter(Boolean)
                ])
              ];

              return (
                <div style={{
                  display: 'flex', gap: 10, borderBottom: '2px solid var(--border)',
                  paddingBottom: 0, marginBottom: 20
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
                      {allFormTopics.length}
                    </span>
                  </button>
                </div>
              );
            })()}

            {/* TAB 1: ASSESSMENT RESULTS & AI DIAGNOSTIC */}
            {activeResultTab === "results" && (
              <>
            {/* ====================================================== */}
            {/* FEATURE 1: AI UNIT STUDY PLAN & ESTIMATED STUDY HOURS   */}
            {/* (Exclusive for students with personal Gemini API key)    */}
            {/* ====================================================== */}
            {result.aiStudyPlan ? (
              <div
                className="card"
                style={{
                  textAlign: "left",
                  background: "linear-gradient(135deg, rgba(79,110,247,0.05) 0%, rgba(16,185,129,0.05) 100%)",
                  border: "1px solid rgba(79,110,247,0.2)",
                  borderRadius: 14,
                  padding: "22px 24px",
                  marginBottom: 20
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>🤖</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text)' }}>
                        AI Unit Diagnostic &amp; Study Hours Planner
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                        Unit: <strong>{form?.unit || form?.title}</strong> · Powered by your personal Gemini key
                      </p>
                    </div>
                  </div>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#047857',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 700
                  }}>
                    ⏱️ Total Study Required: ~{result.aiStudyPlan.totalEstimatedHours || 1} hrs
                  </span>
                </div>

                {/* Unit Understanding Summary */}
                {result.aiStudyPlan.unitSummary && (
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 16 }}>
                    {result.aiStudyPlan.unitSummary}
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  {/* Strong Areas in this Unit */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 10,
                    padding: '14px 16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#047857' }}>
                      <span>🟢</span> Strong Concepts in this Unit
                    </div>
                    {result.aiStudyPlan.strongTopics && result.aiStudyPlan.strongTopics.length > 0 ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {result.aiStudyPlan.strongTopics.map((st, i) => (
                          <span key={i} style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                            ✓ {st}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Keep practicing to develop strong mastery in this unit.</span>
                    )}
                  </div>

                  {/* Weak Areas & Study Hours Allocation */}
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 10,
                    padding: '14px 16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#b91c1c' }}>
                      <span>🔴</span> Weak Concepts &amp; Recommended Study Time
                    </div>
                    {result.aiStudyPlan.weakTopics && result.aiStudyPlan.weakTopics.length > 0 ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {result.aiStudyPlan.weakTopics.map((wt, i) => (
                          <div key={i} style={{ background: '#fff', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                              <strong style={{ fontSize: 13, color: '#b91c1c' }}>{wt.topic}</strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                                  ⏳ ~{wt.estimatedHours || 1} hr{wt.estimatedHours > 1 ? 's' : ''} study
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ fontSize: 11, padding: '3px 8px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                                  onClick={() => openPracticeModal(wt.topic)}
                                >
                                  🎯 Practice 3 Questions
                                </button>
                              </div>
                            </div>
                            {wt.advice && (
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                                {wt.advice}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>🎉 No weak concepts detected! You scored well across all unit topics.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* LOCKED PROMOTION IF STUDENT DOES NOT HAVE GEMINI API KEY */}
            {!result.hasStudentApiKey && (
              <div
                className="card"
                style={{
                  textAlign: "left",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 14,
                  padding: "20px 24px",
                  borderLeft: "4px solid #f59e0b",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>✨</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#d97706" }}>
                      Unlock AI Unit Diagnostics &amp; Interactive Practice Questions
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      Exclusive features available when you connect your free personal Gemini API key
                    </p>
                  </div>
                </div>
                <p style={{ margin: "6px 0 14px", lineHeight: 1.6, color: "var(--text)", fontSize: 13 }}>
                  Connect your personal Gemini API key to automatically calculate <strong>how many study hours</strong> you need to spend on weak topics, receive a clear breakdown of your <strong>Strong Areas vs. Weak Areas</strong> for this unit, and practice interactive AI questions on any concept you struggled with!
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => nav("/student/dashboard")}
                  style={{ fontSize: 13, padding: "8px 16px" }}
                >
                  🔑 Add Free Gemini API Key in Settings →
                </button>
              </div>
            )}

            {/* ANSWER REVIEW */}

            <h2
              style={{
                margin: "30px 0 16px",
              }}
            >
              📝 Answer Review
            </h2>

            <div style={{ display: "grid", gap: 16 }}>
              {result.answers
                ?.filter((a) => a.questionType === "mcq")
                .map((answer, index) => (
                  <div
                    key={answer.questionId}
                    className="card"
                    style={{
                      borderLeft: `4px solid ${answer.isCorrect
                        ? "#22c55e"
                        : "#ef4444"
                        }`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--accent)",
                          fontWeight: 700,
                        }}
                      >
                        Question {index + 1}
                      </span>

                      <span>
                        {answer.isCorrect
                          ? "✅ Correct"
                          : "❌ Wrong"}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: 16,
                        marginBottom: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {answer.question}
                    </p>

                    <div
                      style={{
                        marginBottom: 8,
                      }}
                    >
                      <strong>Your Answer: </strong>
                      {answer.answer || "Not Answered"}
                    </div>

                    {!answer.isCorrect && (
                      <div
                        style={{
                          marginBottom: 8,
                        }}
                      >
                        <strong>
                          Correct Answer:{" "}
                        </strong>

                        {answer.correctAnswer}
                      </div>
                    )}

                    {answer.explanation && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: 14,
                          borderRadius: 8,
                          background:
                            "rgba(124,106,247,0.08)",
                        }}
                      >
                        <strong>
                          💡 Explanation
                        </strong>

                        <p
                          style={{
                            marginTop: 6,
                            lineHeight: 1.6,
                            fontSize: 14,
                          }}
                        >
                          {answer.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
            </div>

                {/* Callout to Shared Resources Tab */}
                <div className="card" style={{
                  background: 'rgba(79,110,247,0.04)',
                  border: '1px dashed var(--accent)',
                  padding: '16px 20px',
                  marginTop: 24,
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
                    View Faculty Resources →
                  </button>
                </div>
              </>
            )}

            {/* TAB 2: FACULTY SHARED RESOURCES (FOR ALL STUDENTS) */}
            {activeResultTab === "resources" && (() => {
              const allFormTopics = [
                ...new Set([
                  ...(form?.topicResources || []).map(r => r.topic?.trim()).filter(Boolean),
                  ...(form?.questions || []).map(q => q.topic?.trim()).filter(Boolean),
                  ...(result?.answers || []).map(a => a.topic?.trim()).filter(Boolean)
                ])
              ];

              const getFormTopicStatus = (topic) => {
                const matchingAnswers = (result?.answers || []).filter(
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
                <div style={{ display: 'grid', gap: 16 }}>
                  <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(79,110,247,0.06), rgba(16,185,129,0.05))',
                    border: '1px solid rgba(79,110,247,0.2)', padding: '16px 20px'
                  }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>📚 Faculty Shared Learning Materials &amp; Lecture Videos</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                      All learning resources shared by faculty for <strong>{form?.subject}</strong> {form?.unit ? `(${form.unit})` : ''} are provided below for all students regardless of test score. Review the recommended lectures and practice any topic below with targeted questions!
                    </p>
                  </div>

                  {allFormTopics.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--muted)' }}>
                      No topic resources were found for this assessment.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 14 }}>
                      {allFormTopics.map((topic, i) => {
                        const matchedResource = (form?.topicResources || []).find(
                          tr => tr.topic && tr.topic.trim().toLowerCase() === topic.toLowerCase()
                        );
                        const matchedLearningRes = (result?.learningResources || []).find(
                          lr => lr.topic && lr.topic.trim().toLowerCase() === topic.toLowerCase()
                        );
                        const videoUrl = matchedResource?.videoUrl?.trim() || matchedLearningRes?.videoUrl?.trim();
                        const resourceTitle = matchedResource?.title?.trim();
                        const status = getFormTopicStatus(topic);

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
                                    No external video attached by faculty · Targeted AI practice available below
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
                                  onClick={() => openPracticeModal(topic)}
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

                            {/* Quick notes if available */}
                            {matchedLearningRes?.notes && (
                              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Quick Notes:</div>
                                <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.6 }}>{matchedLearningRes.notes}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* FOOTER */}

            <div
              style={{
                textAlign: "center",
                marginTop: 40,
                paddingBottom: 30,
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              Keep learning. Keep improving. 🚀
            </div>
          </div>
        )}

        {/* TARGETED AI PRACTICE MODAL */}
        <PracticeModal
          isOpen={practiceModalOpen}
          onClose={() => setPracticeModalOpen(false)}
          topic={practiceTopic}
          subject={form?.subject}
          unit={form?.unit || form?.title}
          hasApiKey={!!result?.hasStudentApiKey}
          onNavigateToSettings={() => nav("/student/dashboard")}
        />
      </div>
    </div>
  );
}