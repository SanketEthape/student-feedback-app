import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { studentApi } from "../api";

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
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                background: isAnonymous ? "rgba(239,68,68,0.08)" : "var(--bg)",
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${isAnonymous ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                transition: "all 0.15s"
              }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: isAnonymous ? "#ef4444" : "var(--text)" }}>
                  🎭 Submit Anonymously
                </span>
              </label>
            ) : (
              <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                Verified submission (Faculty disabled anonymous responses)
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

            {/* PERSONALIZED RECOMMENDATION */}

            {result.recommendation && (
              <div
                className="card"
                style={{
                  textAlign: "left",
                  background: "rgba(79,110,247,0.06)",
                  border: "1px solid rgba(79,110,247,0.15)",
                  borderRadius: 12,
                  padding: "20px 24px",
                  borderLeft: "3px solid var(--accent)",
                  marginBottom: 20,
                }}
              >
                <h3 style={{ marginBottom: 10 }}>
                  💡 Personalized Study Recommendation
                </h3>

                <p
                  style={{
                    lineHeight: 1.8,
                    color: "var(--text)",
                  }}
                >
                  {result.recommendation}
                </p>
              </div>
            )}

            {/* GEMINI API KEY NOTICE IF NO KEY PROVIDED */}
            {!result.hasStudentApiKey && (
              <div
                className="card"
                style={{
                  textAlign: "left",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 12,
                  padding: "18px 22px",
                  borderLeft: "4px solid #f59e0b",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>💡</span>
                  <h3 style={{ margin: 0, fontSize: 15, color: "#d97706" }}>
                    Personalized AI Evaluation Skipped
                  </h3>
                </div>
                <p style={{ margin: "4px 0 10px", lineHeight: 1.6, color: "var(--text)", fontSize: 13 }}>
                  Faculty API keys are protected and not used for student evaluations. To get instant AI descriptive evaluations and personalized learning recommendations on future attempts, add your free Gemini API key.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => nav("/student/dashboard")}
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  ⚙️ Add Gemini API Key in Dashboard →
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

            {/* LEARNING RESOURCES */}

            {result.learningResources &&
              result.learningResources.length > 0 && (
                <>
                  <h2
                    style={{
                      margin: "32px 0 16px",
                    }}
                  >
                    📚 Recommended Learning Resources
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: 16,
                    }}
                  >
                    {result.learningResources.map(
                      (resource, index) => (
                        <div
                          key={index}
                          className="card"
                          style={{
                            borderLeft:
                              "4px solid var(--accent)",
                          }}
                        >
                          <h3
                            style={{
                              marginBottom: 12,
                            }}
                          >
                            📖 {resource.topic}
                          </h3>

                          {/* NOTES */}

                          <div
                            style={{
                              marginBottom: 16,
                            }}
                          >
                            <strong>
                              Quick Notes
                            </strong>

                            <p
                              style={{
                                marginTop: 6,
                                lineHeight: 1.7,
                                color:
                                  "var(--muted)",
                              }}
                            >
                              {resource.notes}
                            </p>
                          </div>

                          {/* IMPORTANT POINTS */}

                          {resource.importantPoints &&
                            resource.importantPoints.length >
                            0 && (
                              <div
                                style={{
                                  marginBottom: 18,
                                }}
                              >
                                <strong>
                                  Important Points
                                </strong>

                                <ul
                                  style={{
                                    marginTop: 8,
                                    paddingLeft: 20,
                                    lineHeight: 1.8,
                                  }}
                                >
                                  {resource.importantPoints.map(
                                    (point, i) => (
                                      <li key={i}>
                                        {point}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {/* RECOMMENDED VIDEO - ONLY SHOWN IF FACULTY ADDED A VIDEO LINK */}
                          {resource.videoUrl ? (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                              <a
                                href={resource.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{
                                  display: "inline-block",
                                  textDecoration: "none",
                                  background: "#059669",
                                  borderColor: "#059669"
                                }}
                              >
                                🎥 Watch Faculty Recommended Video
                              </a>
                            </div>
                          ) : null}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}

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
      </div>
    </div>
  );
}