import { useState, useEffect } from 'react';
import { studentApi } from '../api';

export default function PracticeModal({
  isOpen,
  onClose,
  topic,
  subject,
  unit,
  hasApiKey,
  onNavigateToSettings
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [qIdx]: optionIdx }
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen && topic && hasApiKey) {
      loadPracticeQuestions();
    } else if (isOpen) {
      resetState();
    }
  }, [isOpen, topic, hasApiKey]);

  const resetState = () => {
    setQuestions([]);
    setCurrentIdx(0);
    setSelectedAnswers({});
    setIsCompleted(false);
    setError('');
  };

  const loadPracticeQuestions = async () => {
    resetState();
    setLoading(true);
    try {
      const { data } = await studentApi.post('/responses/practice-questions', {
        topic,
        subject,
        unit
      });
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate practice questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentQ = questions[currentIdx];
  const totalQ = questions.length;
  const isAnswered = selectedAnswers[currentIdx] !== undefined;
  const selectedOpt = selectedAnswers[currentIdx];
  const isCorrect = isAnswered && selectedOpt === currentQ?.correctIndex;

  const correctCount = Object.entries(selectedAnswers).filter(
    ([idx, opt]) => questions[idx] && opt === questions[idx].correctIndex
  ).length;

  const handleSelectOption = (optIdx) => {
    if (isAnswered) return; // Prevent changing answer after selection
    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
  };

  const handleNext = () => {
    if (currentIdx + 1 < totalQ) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 620,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 28,
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>
                Targeted AI Practice
              </h3>
              <span
                style={{
                  background: 'rgba(79, 110, 247, 0.1)',
                  color: 'var(--accent)',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {topic}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              {subject ? `${subject} · ` : ''}{unit ? `${unit} · ` : ''}Powered by your personal Gemini key
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* LOCKED STATE IF NO API KEY */}
        {!hasApiKey ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
            <h4 style={{ fontSize: 17, marginBottom: 8 }}>
              Unlock Interactive AI Practice
            </h4>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 440, margin: '0 auto 20px' }}>
              Targeted practice questions are powered directly by your free personal Gemini API key. Add your key in settings to practice any weak topic anytime with instant explanations!
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  if (onNavigateToSettings) onNavigateToSettings();
                }}
                style={{ fontSize: 13, padding: '10px 18px' }}
              >
                🔑 Add Gemini API Key Now →
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                style={{ fontSize: 13, padding: '10px 16px' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 14, animation: 'pulse 1.5s infinite' }}>🤖</div>
            <h4 style={{ fontSize: 16, marginBottom: 6 }}>Generating 3 Targeted Questions...</h4>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Gemini is creating practice exercises tailored to strengthen <strong>"{topic}"</strong>.
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '28px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</p>
            <button className="btn btn-primary" onClick={loadPracticeQuestions} style={{ fontSize: 13 }}>
              🔄 Try Again
            </button>
          </div>
        ) : isCompleted ? (
          /* COMPLETION SCREEN */
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {correctCount === totalQ ? '🏆' : correctCount >= 2 ? '🎉' : '📚'}
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 6 }}>
              Practice Completed!
            </h3>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: correctCount === totalQ ? '#10b981' : correctCount >= 2 ? 'var(--accent)' : '#f59e0b',
                marginBottom: 10
              }}
            >
              {correctCount} / {totalQ} Correct
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 440, margin: '0 auto 24px' }}>
              {correctCount === totalQ
                ? `Outstanding! You demonstrated 100% mastery of "${topic}".`
                : correctCount >= 2
                ? `Good progress! You strengthened your core concepts in "${topic}".`
                : `Keep going! Review the explanations and key takeaways to master "${topic}".`}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={loadPracticeQuestions}
                style={{ fontSize: 13, padding: '10px 18px' }}
              >
                🔄 Practice 3 New Questions
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                style={{ fontSize: 13, padding: '10px 18px' }}
              >
                ✓ Done
              </button>
            </div>
          </div>
        ) : currentQ ? (
          /* QUESTION CARD */
          <div>
            {/* Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                Question {currentIdx + 1} of {totalQ}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Score: {correctCount} / {currentIdx + (isAnswered ? 1 : 0)}
              </span>
            </div>

            <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((currentIdx + 1) / totalQ) * 100}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* Question Text */}
            <h4 style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 18, color: 'var(--text)' }}>
              {currentQ.question}
            </h4>

            {/* Options */}
            <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              {currentQ.options?.map((opt, optIdx) => {
                let border = '1px solid var(--border)';
                let bg = 'var(--bg)';
                let textColor = 'var(--text)';

                if (isAnswered) {
                  if (optIdx === currentQ.correctIndex) {
                    border = '2px solid #10b981';
                    bg = 'rgba(16, 185, 129, 0.08)';
                    textColor = '#047857';
                  } else if (optIdx === selectedOpt) {
                    border = '2px solid #ef4444';
                    bg = 'rgba(239, 68, 68, 0.08)';
                    textColor = '#b91c1c';
                  }
                }

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    style={{
                      border,
                      background: bg,
                      color: textColor,
                      padding: '12px 16px',
                      borderRadius: 10,
                      cursor: isAnswered ? 'default' : 'pointer',
                      fontSize: 14,
                      lineHeight: 1.5,
                      fontWeight: optIdx === selectedOpt || (isAnswered && optIdx === currentQ.correctIndex) ? 600 : 400,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{opt}</span>
                    {isAnswered && optIdx === currentQ.correctIndex && (
                      <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>✅ Correct</span>
                    )}
                    {isAnswered && optIdx === selectedOpt && optIdx !== currentQ.correctIndex && (
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>❌ Incorrect</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation & Key Takeaway (Shown after answer) */}
            {isAnswered && (
              <div
                style={{
                  background: isCorrect ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                  border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 20
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: isCorrect ? '#047857' : '#b91c1c', marginBottom: 6 }}>
                  {isCorrect ? '💡 Great explanation:' : '💡 Conceptual Explanation:'}
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
                  {currentQ.explanation}
                </p>
                {currentQ.keyTakeaway && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', borderTop: '1px dashed var(--border)', paddingTop: 6, marginTop: 6 }}>
                    <strong>⭐ Key Takeaway:</strong> {currentQ.keyTakeaway}
                  </div>
                )}
              </div>
            )}

            {/* Next / Finish Button */}
            {isAnswered && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  style={{ fontSize: 13, padding: '10px 22px' }}
                >
                  {currentIdx + 1 < totalQ ? 'Next Question →' : 'View Practice Score →'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
