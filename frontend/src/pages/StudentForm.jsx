import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import axios from 'axios';

export default function StudentForm() {
    const { link } = useParams();
    const [form, setForm] = useState(null);
    const [err, setErr] = useState('');
    const [info, setInfo] = useState({ studentName: '', rollNo: '' });
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [recommendation, setRecommendation] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('info'); // info | form | done

    useEffect(() => {
        axios.get(`http://localhost:5000/api/forms/link/${link}`)
            .then(r => setForm(r.data))
            .catch(() => setErr('This form does not exist or is no longer active.'));
    }, [link]);

    const setAnswer = (qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }));

    const submit = async () => {
        const answersArr = form.questions.map(q => ({
            questionId: q._id,
            answer: answers[q._id] || ''
        }));
        setLoading(true);
        try {
            const { data } = await axios.post(`http://localhost:5000/api/responses/submit/${link}`, {
                studentName: info.studentName || 'Anonymous',
                rollNo: info.rollNo,
                answers: answersArr
            });
            setRecommendation(data.recommendation);
            setStep('done');
        } catch { setErr('Submission failed. Please try again.'); }
        finally { setLoading(false); }
    };

    if (err) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                <h3>{err}</h3>
            </div>
        </div>
    );

    if (!form) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--muted)' }}>Loading form...</p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', padding: '32px 16px' }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <div style={{ marginBottom: 28 }}>
                    <div style={{ color: 'var(--accent)', fontFamily: 'DM Serif Display', fontSize: 22, marginBottom: 4 }}>EduPulse</div>
                    <h2 style={{ marginBottom: 4 }}>{form.title}</h2>
                    <p style={{ color: 'var(--muted)', fontSize: 14 }}>{form.faculty?.name} · {form.faculty?.department} · {form.subject}</p>
                </div>

                {step === 'info' && (
                    <div className="card">
                        <h3 style={{ marginBottom: 8 }}>Before you begin</h3>
                        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Your name and roll number are optional. This helps your faculty track progress.</p>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Your Name (optional)</label>
                            <input value={info.studentName} onChange={e => setInfo({ ...info, studentName: e.target.value })} placeholder="Enter your name" />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Roll Number (optional)</label>
                            <input value={info.rollNo} onChange={e => setInfo({ ...info, rollNo: e.target.value })} placeholder="e.g. CS2021045" />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep('form')}>Start Feedback Form →</button>
                    </div>
                )}

                {step === 'form' && (
                    <div>
                        <div style={{ display: 'grid', gap: 16 }}>
                            {form.questions.map((q, i) => (
                                <div key={q._id} className="card">
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>Q{i + 1}</span>
                                        <span className="tag" style={{ background: 'rgba(124,106,247,0.15)', color: 'var(--accent)', fontSize: 11 }}>{q.topic}</span>
                                    </div>
                                    <p style={{ marginBottom: 14, fontSize: 15, lineHeight: 1.6 }}>{q.question}</p>

                                    {q.type === 'mcq' && (
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            {q.options.map((opt, j) => (
                                                <label key={j} style={{
                                                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                                    borderRadius: 8, cursor: 'pointer',
                                                    background: answers[q._id] === opt ? 'rgba(124,106,247,0.15)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${answers[q._id] === opt ? 'var(--accent)' : 'var(--border)'}`,
                                                    transition: 'all 0.15s'
                                                }}>
                                                    <input type="radio" name={q._id} value={opt} checked={answers[q._id] === opt}
                                                        onChange={() => setAnswer(q._id, opt)} style={{ width: 'auto' }} />
                                                    <span style={{ fontSize: 14 }}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'scale' && (
                                        <div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {['1', '2', '3', '4', '5'].map(n => (
                                                    <button key={n} onClick={() => setAnswer(q._id, n)} style={{
                                                        width: 44, height: 44, borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600,
                                                        background: answers[q._id] === n ? 'var(--accent)' : 'var(--bg)',
                                                        color: answers[q._id] === n ? '#fff' : 'var(--muted)',
                                                        border: `1px solid ${answers[q._id] === n ? 'var(--accent)' : 'var(--border)'}`
                                                    }}>{n}</button>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Not at all</span>
                                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Completely</span>
                                            </div>
                                        </div>
                                    )}

                                    {q.type === 'text' && (
                                        <textarea rows={3} value={answers[q._id] || ''} onChange={e => setAnswer(q._id, e.target.value)}
                                            placeholder="Type your answer here..." />
                                    )}
                                </div>
                            ))}
                        </div>
                        {err && <p style={{ color: 'var(--danger)', margin: '12px 0', fontSize: 14 }}>{err}</p>}
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 20, padding: 14, fontSize: 16 }}
                            onClick={submit} disabled={loading}>
                            {loading ? '⏳ Submitting & generating your recommendation...' : '✅ Submit Feedback'}
                        </button>
                    </div>
                )}

                {step === 'done' && (
                    <div className="card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
                        <h2 style={{ marginBottom: 8 }}>Thank you!</h2>
                        <p style={{ color: 'var(--muted)', marginBottom: recommendation ? 28 : 0, fontSize: 14 }}>Your feedback has been submitted successfully.</p>
                        {recommendation && (
                            <div style={{ textAlign: 'left', background: 'rgba(124,106,247,0.08)', borderRadius: 12, padding: '20px 24px', borderLeft: '3px solid var(--accent)' }}>
                                <h3 style={{ marginBottom: 10, fontSize: 17 }}>💡 Your Personalized Study Recommendation</h3>
                                <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)' }}>{recommendation}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}