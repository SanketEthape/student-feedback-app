import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { DEPARTMENTS, DEPARTMENT_SUBJECTS } from '../data/curriculum';

export default function CreateForm() {
    const faculty = JSON.parse(localStorage.getItem('faculty') || '{}');
    const defaultDept = DEPARTMENTS.includes(faculty.department) ? faculty.department : 'Computer Engineering';
    
    const [selectedDept, setSelectedDept] = useState(defaultDept);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [unit, setUnit] = useState('Unit 1');
    const [form, setForm] = useState({
        title: `${DEPARTMENT_SUBJECTS[defaultDept]?.[0] || 'Subject'} - Unit 1`,
        subject: DEPARTMENT_SUBJECTS[defaultDept]?.[0] || '',
        unit: 'Unit 1',
        syllabus: ''
    });

    const [mcqCount, setMcqCount] = useState(6);
    const [textCount, setTextCount] = useState(2);
    const [scaleCount, setScaleCount] = useState(2);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const navigate = useNavigate();

    // Filter subjects for the selected department
    const deptSubjects = DEPARTMENT_SUBJECTS[selectedDept] || [];
    const filteredSubjects = deptSubjects.filter(s =>
        s.toLowerCase().includes(subjectSearch.toLowerCase())
    );

    const onDepartmentChange = (dept) => {
        setSelectedDept(dept);
        const firstSubject = DEPARTMENT_SUBJECTS[dept]?.[0] || '';
        setForm(prev => ({
            ...prev,
            subject: firstSubject,
            title: `${firstSubject} - ${unit}`
        }));
        setSubjectSearch('');
    };

    const onSubjectSelect = (subj) => {
        setForm(prev => ({
            ...prev,
            subject: subj,
            title: `${subj} - ${unit}`
        }));
    };

    const onUnitChange = (u) => {
        setUnit(u);
        setForm(prev => ({
            ...prev,
            unit: u,
            title: `${prev.subject || 'Subject'} - ${u}`
        }));
    };

    const totalQuestions = (parseInt(mcqCount) || 0) + (parseInt(textCount) || 0) + (parseInt(scaleCount) || 0);

    const applyPreset = (mcq, text, scale) => {
        setMcqCount(mcq);
        setTextCount(text);
        setScaleCount(scale);
    };

    const submit = async e => {
        e.preventDefault();
        setErr('');

        if (!form.subject) {
            setErr('Please select a subject from the list.');
            return;
        }

        if (totalQuestions <= 0) {
            setErr('Please select at least 1 question to generate.');
            return;
        }

        if (totalQuestions > 20) {
            setErr('Maximum 20 questions can be generated at once for optimal AI quality.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...form,
                unit: unit.trim(),
                mcqCount: parseInt(mcqCount) || 0,
                textCount: parseInt(textCount) || 0,
                scaleCount: parseInt(scaleCount) || 0
            };
            const { data } = await api.post('/forms/generate', payload);
            navigate(`/analytics/${data._id}`);
        } catch (e) {
            setErr(e.response?.data?.message || 'Failed to generate form');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 760 }}>
            <h2 style={{ marginBottom: 8 }}>Create Assessment & Feedback Form</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>
                Select your subject and unit, paste the syllabus topics covered, and customize the question distribution.
            </p>

            {err && (
                <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid var(--danger)',
                    borderRadius: 8, padding: '12px 16px', marginBottom: 20,
                    color: 'var(--danger)', fontSize: 14
                }}>
                    {err}
                </div>
            )}

            <div className="card">
                <form onSubmit={submit}>
                    {/* Department and Standard Subject Selection */}
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '16px 18px',
                        marginBottom: 20
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                                    🏛️ Department *
                                </label>
                                <select
                                    value={selectedDept}
                                    onChange={e => onDepartmentChange(e.target.value)}
                                    style={{ background: '#fff', fontSize: 13, width: '100%' }}
                                >
                                    {DEPARTMENTS.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                                    📖 Unit / Module *
                                </label>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <select
                                        value={unit.startsWith('Unit ') ? unit : 'Custom'}
                                        onChange={e => {
                                            if (e.target.value !== 'Custom') onUnitChange(e.target.value);
                                        }}
                                        style={{ background: '#fff', fontSize: 13, minWidth: 100 }}
                                    >
                                        <option value="Unit 1">Unit 1</option>
                                        <option value="Unit 2">Unit 2</option>
                                        <option value="Unit 3">Unit 3</option>
                                        <option value="Unit 4">Unit 4</option>
                                        <option value="Unit 5">Unit 5</option>
                                        <option value="Unit 6">Unit 6</option>
                                        <option value="Custom">Custom</option>
                                    </select>
                                    <input
                                        value={unit}
                                        onChange={e => onUnitChange(e.target.value)}
                                        placeholder="e.g. Unit 1: Introduction"
                                        required
                                        style={{ fontSize: 13, flex: 1 }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Standardized Subject Selection */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    📚 Standardized Subject *
                                </label>
                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                                    Curriculum list prevents spelling variations
                                </span>
                            </div>

                            <div style={{ marginBottom: 8 }}>
                                <input
                                    type="text"
                                    value={subjectSearch}
                                    onChange={e => setSubjectSearch(e.target.value)}
                                    placeholder="🔍 Search or filter subjects in this department..."
                                    style={{ fontSize: 13, background: '#fff', marginBottom: 6 }}
                                />
                            </div>

                            <select
                                value={form.subject}
                                onChange={e => onSubjectSelect(e.target.value)}
                                required
                                style={{ background: '#fff', fontSize: 13, width: '100%', fontWeight: 500 }}
                            >
                                <option value="" disabled>-- Select a Subject --</option>
                                {filteredSubjects.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            {filteredSubjects.length === 0 && (
                                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                                    No subjects match &quot;{subjectSearch}&quot;. Please clear search or select from department list.
                                </p>
                            )}
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Form Title</label>
                        <input
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Data Structures - Unit 1"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Unit Syllabus</label>
                        <textarea
                            value={form.syllabus}
                            onChange={e => setForm({ ...form, syllabus: e.target.value })}
                            placeholder={`Paste the topics covered in this unit. e.g.:
- Arrays and Dynamic Arrays
- Linked Lists: Singly, Doubly
- Stacks and Queues
- Binary Trees and BST
- Graph Traversal: BFS, DFS`}
                            rows={8}
                            required
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    {/* Question Count Customization */}
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '18px 20px',
                        marginBottom: 24
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <strong style={{ fontSize: 14, color: 'var(--text)' }}>
                                ⚙️ Question Distribution & Breakdown
                            </strong>
                            <span style={{
                                background: totalQuestions > 0 ? 'rgba(79,110,247,0.1)' : 'rgba(239,68,68,0.1)',
                                color: totalQuestions > 0 ? 'var(--accent)' : 'var(--danger)',
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 700
                            }}>
                                Total: {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Presets */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>Presets:</span>
                            <button
                                type="button"
                                onClick={() => applyPreset(6, 2, 2)}
                                style={{
                                    fontSize: 12, padding: '4px 10px', borderRadius: 6,
                                    background: (mcqCount === 6 && textCount === 2 && scaleCount === 2) ? 'var(--accent)' : '#fff',
                                    color: (mcqCount === 6 && textCount === 2 && scaleCount === 2) ? '#fff' : 'var(--text)',
                                    border: '1px solid var(--border)', cursor: 'pointer'
                                }}
                            >
                                Standard (6 MCQ, 2 Desc, 2 Scale)
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset(10, 0, 0)}
                                style={{
                                    fontSize: 12, padding: '4px 10px', borderRadius: 6,
                                    background: (mcqCount === 10 && textCount === 0 && scaleCount === 0) ? 'var(--accent)' : '#fff',
                                    color: (mcqCount === 10 && textCount === 0 && scaleCount === 0) ? '#fff' : 'var(--text)',
                                    border: '1px solid var(--border)', cursor: 'pointer'
                                }}
                            >
                                MCQ Only (10)
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset(5, 5, 0)}
                                style={{
                                    fontSize: 12, padding: '4px 10px', borderRadius: 6,
                                    background: (mcqCount === 5 && textCount === 5 && scaleCount === 0) ? 'var(--accent)' : '#fff',
                                    color: (mcqCount === 5 && textCount === 5 && scaleCount === 0) ? '#fff' : 'var(--text)',
                                    border: '1px solid var(--border)', cursor: 'pointer'
                                }}
                            >
                                Balanced (5 MCQ, 5 Desc)
                            </button>
                        </div>

                        {/* Counter Inputs Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                            {/* Objective / MCQ */}
                            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
                                    🔘 Objective (MCQ)
                                </label>
                                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px' }}>Multiple choice questions</p>
                                <input
                                    type="number"
                                    min="0"
                                    max="15"
                                    value={mcqCount}
                                    onChange={e => setMcqCount(Math.max(0, parseInt(e.target.value) || 0))}
                                    style={{ width: '100%', padding: '8px', fontSize: 14, fontWeight: 600 }}
                                />
                            </div>

                            {/* Descriptive / Subjective */}
                            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
                                    ✍️ Descriptive / Subjective
                                </label>
                                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px' }}>In-depth conceptual answers</p>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={textCount}
                                    onChange={e => setTextCount(Math.max(0, parseInt(e.target.value) || 0))}
                                    style={{ width: '100%', padding: '8px', fontSize: 14, fontWeight: 600 }}
                                />
                            </div>

                            {/* Scale / Confidence */}
                            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
                                    📊 Self-Rating / Scale (1-5)
                                </label>
                                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px' }}>Confidence rating items</p>
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    value={scaleCount}
                                    onChange={e => setScaleCount(Math.max(0, parseInt(e.target.value) || 0))}
                                    style={{ width: '100%', padding: '8px', fontSize: 14, fontWeight: 600 }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '12px', fontSize: 15 }}
                        disabled={loading || totalQuestions <= 0}
                    >
                        {loading
                            ? `⏳ Generating ${totalQuestions} questions with AI...`
                            : `✨ Generate Feedback Form (${totalQuestions} Questions)`}
                    </button>
                </form>
            </div>
        </div>
    );
}