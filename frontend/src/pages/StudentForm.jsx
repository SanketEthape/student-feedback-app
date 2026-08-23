import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function StudentForm() {
  const { link } = useParams();

  const [form, setForm] = useState(null);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState({
    studentName: "",
    rollNo: "",
  });

  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  // info | form | done
  const [step, setStep] = useState("info");

  // Result data
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get(`/forms/link/${link}`)
      .then((r) => setForm(r.data))
      .catch(() =>
        setErr("This form does not exist or is no longer active.")
      );
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
      const { data } = await api.post(`/responses/submit/${link}`, {
        studentName: info.studentName || "Anonymous",
        rollNo: info.rollNo,
        answers: answersArr,
      });

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

  if (!form)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--muted)" }}>Loading form...</p>
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
            Smart Student Learning & Feedback System
          </div>

          <h2 style={{ marginBottom: 4 }}>{form.title}</h2>

          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            {form.faculty?.name} · {form.faculty?.department} ·{" "}
            {form.subject}
          </p>
        </div>

        {/* ========================== */}
        {/* STEP 1: STUDENT INFO */}
        {/* ========================== */}

        {step === "info" && (
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Before you begin</h3>

            <p
              style={{
                color: "var(--muted)",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              Enter your details and start the learning assessment.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Your Name (optional)
              </label>

              <input
                value={info.studentName}
                onChange={(e) =>
                  setInfo({
                    ...info,
                    studentName: e.target.value,
                  })
                }
                placeholder="Enter your name"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Roll Number (optional)
              </label>

              <input
                value={info.rollNo}
                onChange={(e) =>
                  setInfo({
                    ...info,
                    rollNo: e.target.value,
                  })
                }
                placeholder="Enter your roll number"
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setStep("form")}
            >
              Start Assessment →
            </button>
          </div>
        )}

        {/* ========================== */}
        {/* STEP 2: QUESTIONS */}
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
                        background: "rgba(124,106,247,0.15)",
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
                                ? "rgba(124,106,247,0.15)"
                                : "rgba(255,255,255,0.03)",

                            border: `1px solid ${answers[q._id] === opt
                              ? "var(--accent)"
                              : "var(--border)"
                              }`,
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
                  marginBottom: 20,
                  borderLeft:
                    "4px solid var(--accent)",
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

                          {/* YOUTUBE */}

                          {resource.youtubeSearch && (
                            <a
                              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                                resource.youtubeSearch
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary"
                              style={{
                                display:
                                  "inline-block",
                                textDecoration:
                                  "none",
                              }}
                            >
                              ▶️ Watch Recommended Videos
                            </a>
                          )}
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