import { useState, useEffect } from 'react';
import { adminApi } from '../api';

export default function AdminDashboard() {
    // Navigation / drilldown state:
    // level: 'subjects' (Level 1) | 'units' (Level 2) | 'topics' (Level 3)
    const [level, setLevel] = useState('subjects');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);

    // Data state
    const [summary, setSummary] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [units, setUnits] = useState([]);
    const [topicsData, setTopicsData] = useState(null);

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedReport, setCopiedReport] = useState(false);

    // Load initial subjects overview and summary
    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        setLoading(true);
        setErr('');
        try {
            const [sumRes, subRes] = await Promise.all([
                adminApi.get('/admin/summary'),
                adminApi.get('/admin/subjects')
            ]);
            setSummary(sumRes.data);
            setSubjects(subRes.data);
            setLevel('subjects');
            setSelectedSubject(null);
            setSelectedUnit(null);
            setSearchQuery('');
        } catch (e) {
            setErr(e.response?.data?.message || 'Failed to load curriculum overview');
        } finally {
            setLoading(false);
        }
    };

    // Drill down to Level 2: Units for a subject
    const drillIntoSubject = async (subjectName) => {
        setLoading(true);
        setErr('');
        setSelectedSubject(subjectName);
        setSearchQuery('');
        try {
            const { data } = await adminApi.get(`/admin/subjects/${encodeURIComponent(subjectName)}/units`);
            setUnits(data);
            setLevel('units');
            setSelectedUnit(null);
        } catch (e) {
            setErr(e.response?.data?.message || `Failed to load units for ${subjectName}`);
        } finally {
            setLoading(false);
        }
    };

    // Drill down to Level 3: Topics for a unit
    const drillIntoUnit = async (unitObj) => {
        setLoading(true);
        setErr('');
        setSelectedUnit(unitObj);
        setSearchQuery('');
        try {
            const { data } = await adminApi.get(`/admin/units/${unitObj.formId}/topics`);
            setTopicsData(data);
            setLevel('topics');
        } catch (e) {
            setErr(e.response?.data?.message || `Failed to load topics for ${unitObj.unitName}`);
        } finally {
            setLoading(false);
        }
    };

    // Helper for badge color & label
    const getBadge = (score, total) => {
        if (!total || total === 0) {
            return (
                <span style={{
                    background: '#f1f5f9',
                    color: '#64748b',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600
                }}>
                    ⚪ No Data Yet
                </span>
            );
        }
        if (score >= 60) {
            return (
                <span style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700
                }}>
                    🟢 Easy to Understand ({score}%)
                </span>
            );
        }
        return (
            <span style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700
            }}>
                🔴 Challenging to Understand ({score}%)
            </span>
        );
    };

    // ==============================================================
    // CSV / EXCEL HANDOVER REPORT DOWNLOAD UTILITY
    // ==============================================================
    const downloadCSV = (filename, headers, rows) => {
        const escapeCell = (cell) => {
            if (cell === null || cell === undefined) return '""';
            const str = String(cell).replace(/"/g, '""');
            return `"${str}"`;
        };

        // UTF-8 BOM (\uFEFF) ensures Excel opens special characters, accents & symbols properly
        const csvContent = '\uFEFF' + [
            headers.map(escapeCell).join(','),
            ...rows.map(row => row.map(escapeCell).join(','))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Export Handover Report as CSV / Excel at any level (Subject, Unit, Topic)
    const exportHandoverCSV = () => {
        const dateStr = new Date().toISOString().slice(0, 10);

        if (level === 'subjects') {
            if (!subjects || subjects.length === 0) return;
            const headers = [
                'Subject Name',
                'Units (Forms) Count',
                'Evaluated Student Responses',
                'Average Understanding (%)',
                'Classification',
                'Next-Batch Faculty Handover Recommendation'
            ];
            const rows = subjects.map(s => {
                const hasData = s.totalResponses > 0;
                const isEasy = s.avgUnderstanding >= 60;
                const classification = !hasData ? 'No Data Yet' : isEasy ? 'Easy to Understand' : 'Challenging to Understand';
                const recommendation = !hasData
                    ? 'No assessment data recorded yet.'
                    : isEasy
                    ? 'Strong overall understanding (>=60%). Proceed with standard curriculum pacing.'
                    : 'Challenging curriculum areas detected (<60%). Recommend scheduling foundation review lectures for next batch.';
                return [
                    s.subject,
                    s.totalUnits,
                    s.totalResponses,
                    hasData ? `${s.avgUnderstanding}%` : '—',
                    classification,
                    recommendation
                ];
            });
            downloadCSV(`Academic_Handover_Subjects_Overall_${dateStr}.csv`, headers, rows);
        } else if (level === 'units') {
            if (!units || units.length === 0) return;
            const headers = [
                'Subject',
                'Unit / Module',
                'Assessment Form Title',
                'Student Evaluations',
                'Average Understanding (%)',
                'Classification',
                'Next-Batch Faculty Handover Recommendation'
            ];
            const rows = units.map(u => {
                const hasData = u.totalResponses > 0;
                const isEasy = u.avgUnderstanding >= 60;
                const classification = !hasData ? 'No Data Yet' : isEasy ? 'Easy to Understand' : 'Challenging to Understand';
                const recommendation = !hasData
                    ? 'No responses submitted yet.'
                    : isEasy
                    ? 'Unit concepts well understood (>=60%). Proceed with standard lecture allocation.'
                    : 'Unit identified as challenging (<60%). Next batch teachers should allocate extra revision and practical problem-solving.';
                return [
                    selectedSubject || 'Subject',
                    u.unitName,
                    u.title,
                    u.totalResponses,
                    hasData ? `${u.avgUnderstanding}%` : '—',
                    classification,
                    recommendation
                ];
            });
            const safeSub = (selectedSubject || 'Subject').replace(/[^a-zA-Z0-9_-]/g, '_');
            downloadCSV(`Academic_Handover_${safeSub}_Units_${dateStr}.csv`, headers, rows);
        } else if (level === 'topics') {
            if (!topicsData || !topicsData.topics || topicsData.topics.length === 0) return;
            const headers = [
                'Subject',
                'Unit / Module',
                'Topic Name',
                'Evaluated Answers',
                'Average Understanding (%)',
                'Classification',
                'Next-Batch Teacher Handover Note'
            ];
            const rows = topicsData.topics.map(t => {
                const hasData = t.totalAnswers > 0;
                const isEasy = t.avgUnderstanding >= 60;
                const classification = !hasData ? 'No Data Yet' : isEasy ? 'Easy to Understand' : 'Challenging to Understand';
                const recommendation = !hasData
                    ? 'No responses recorded yet.'
                    : isEasy
                    ? 'Concepts well understood (>=60%). Proceed as standard curriculum.'
                    : 'High confusion rate detected (<60%). Recommend early remedial lectures, visual aids, and focused practice.';
                return [
                    topicsData.subject || selectedSubject || 'Subject',
                    topicsData.unitName || selectedUnit?.unitName || 'Unit',
                    t.topic,
                    t.totalAnswers,
                    hasData ? `${t.avgUnderstanding}%` : '—',
                    classification,
                    recommendation
                ];
            });
            const safeSub = (topicsData.subject || selectedSubject || 'Subject').replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeUnit = (topicsData.unitName || selectedUnit?.unitName || 'Unit').replace(/[^a-zA-Z0-9_-]/g, '_');
            downloadCSV(`Academic_Handover_${safeSub}_${safeUnit}_Topics_${dateStr}.csv`, headers, rows);
        }
    };

    // Copy text handover report for next batch teachers at any level
    const copyHandoverReportText = () => {
        let report = `========================================================\n`;
        report += `ACADEMIC HANDOVER REPORT FOR NEXT BATCH FACULTY\n`;

        if (level === 'subjects') {
            report += `Level:   Overall Curriculum (All Subjects)\n`;
            report += `Monitored Subjects: ${subjects.length}\n`;
            report += `========================================================\n\n`;

            const easySubs = subjects.filter(s => s.totalResponses > 0 && s.avgUnderstanding >= 60);
            const hardSubs = subjects.filter(s => s.totalResponses > 0 && s.avgUnderstanding < 60);
            const unattempted = subjects.filter(s => s.totalResponses === 0);

            report += `🔴 CHALLENGING SUBJECTS (<60% Avg — Needs Extra Support):\n`;
            if (hardSubs.length === 0) {
                report += `  - None. All assessed subjects scored 60% or higher.\n`;
            } else {
                hardSubs.forEach(s => {
                    report += `  • ${s.subject}: ${s.avgUnderstanding}% Avg (${s.totalUnits} units, ${s.totalResponses} evaluations)\n`;
                });
            }

            report += `\n🟢 EASY TO UNDERSTAND SUBJECTS (>=60% Avg — Good Grasp):\n`;
            if (easySubs.length === 0) {
                report += `  - None scored 60% or higher.\n`;
            } else {
                easySubs.forEach(s => {
                    report += `  • ${s.subject}: ${s.avgUnderstanding}% Avg (${s.totalUnits} units, ${s.totalResponses} evaluations)\n`;
                });
            }

            if (unattempted.length > 0) {
                report += `\n⚪ PENDING SUBJECTS (No Evaluations):\n`;
                unattempted.forEach(s => {
                    report += `  • ${s.subject}: ${s.totalUnits} units (no responses yet)\n`;
                });
            }
        } else if (level === 'units') {
            report += `Subject: ${selectedSubject}\n`;
            report += `Level:   Unit-Wise Breakdown\n`;
            report += `Total Units: ${units.length}\n`;
            report += `========================================================\n\n`;

            const easyUnits = units.filter(u => u.totalResponses > 0 && u.avgUnderstanding >= 60);
            const hardUnits = units.filter(u => u.totalResponses > 0 && u.avgUnderstanding < 60);
            const unattempted = units.filter(u => u.totalResponses === 0);

            report += `🔴 CHALLENGING UNITS (<60% Avg — Next Batch Focus):\n`;
            if (hardUnits.length === 0) {
                report += `  - None. Students grasped all units above 60%.\n`;
            } else {
                hardUnits.forEach(u => {
                    report += `  • ${u.unitName} (${u.title}): ${u.avgUnderstanding}% Avg (${u.totalResponses} evaluations)\n`;
                });
            }

            report += `\n🟢 EASY TO UNDERSTAND UNITS (>=60% Avg):\n`;
            if (easyUnits.length === 0) {
                report += `  - None scored 60% or higher.\n`;
            } else {
                easyUnits.forEach(u => {
                    report += `  • ${u.unitName} (${u.title}): ${u.avgUnderstanding}% Avg (${u.totalResponses} evaluations)\n`;
                });
            }

            if (unattempted.length > 0) {
                report += `\n⚪ PENDING UNITS (No Evaluations):\n`;
                unattempted.forEach(u => {
                    report += `  • ${u.unitName} (${u.title})\n`;
                });
            }
        } else if (level === 'topics') {
            if (!topicsData) return;
            report += `Subject: ${topicsData.subject}\n`;
            report += `Unit:    ${topicsData.unitName}\n`;
            report += `Evaluated Student Responses: ${topicsData.totalResponses}\n`;
            report += `========================================================\n\n`;

            const easyTopics = topicsData.topics.filter(t => t.totalAnswers > 0 && t.avgUnderstanding >= 60);
            const hardTopics = topicsData.topics.filter(t => t.totalAnswers > 0 && t.avgUnderstanding < 60);
            const unattempted = topicsData.topics.filter(t => t.totalAnswers === 0);

            report += `🔴 CHALLENGING TOPICS (Requires focused revision & drills):\n`;
            if (hardTopics.length === 0) {
                report += `  - None. Students grasped all topics above 60%.\n`;
            } else {
                hardTopics.forEach(t => {
                    report += `  • ${t.topic}: Avg Understanding ${t.avgUnderstanding}% (${t.totalAnswers} evaluations)\n`;
                });
            }

            report += `\n🟢 EASY TO UNDERSTAND TOPICS (Strong baseline understanding):\n`;
            if (easyTopics.length === 0) {
                report += `  - None scored 60% or higher.\n`;
            } else {
                easyTopics.forEach(t => {
                    report += `  • ${t.topic}: Avg Understanding ${t.avgUnderstanding}% (${t.totalAnswers} evaluations)\n`;
                });
            }

            if (unattempted.length > 0) {
                report += `\n⚪ UNTESTED / PENDING TOPICS:\n`;
                unattempted.forEach(t => {
                    report += `  • ${t.topic} (No student responses recorded yet)\n`;
                });
            }
        }

        report += `\nGenerated via EduPulse Academic Administration.`;

        navigator.clipboard.writeText(report);
        setCopiedReport(true);
        setTimeout(() => setCopiedReport(false), 3000);
    };

    return (
        <div>
            {/* Header & Breadcrumbs */}
            <div style={{ marginBottom: 24 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--muted)',
                    marginBottom: 10
                }}>
                    <span
                        style={{ cursor: 'pointer', color: level === 'subjects' ? 'var(--text)' : 'var(--accent)', fontWeight: 600 }}
                        onClick={loadSubjects}
                    >
                        🏫 Subjects
                    </span>
                    {selectedSubject && (
                        <>
                            <span>/</span>
                            <span
                                style={{
                                    cursor: level === 'topics' ? 'pointer' : 'default',
                                    color: level === 'units' ? 'var(--text)' : 'var(--accent)',
                                    fontWeight: 600
                                }}
                                onClick={() => drillIntoSubject(selectedSubject)}
                            >
                                {selectedSubject}
                            </span>
                        </>
                    )}
                    {selectedUnit && (
                        <>
                            <span>/</span>
                            <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                                {selectedUnit.unitName}
                            </span>
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
                            {level === 'subjects' && '🏛️ Overall Subject Understanding'}
                            {level === 'units' && `📖 Units in ${selectedSubject}`}
                            {level === 'topics' && `🎯 Topic Comprehension — ${topicsData?.unitName || selectedUnit?.unitName}`}
                        </h2>
                        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>
                            {level === 'subjects' && 'Aggregated curriculum comprehension across all faculties and student assessments.'}
                            {level === 'units' && `Unit-wise understanding for ${selectedSubject}. Click any unit to see topic-level mastery.`}
                            {level === 'topics' && `Topic difficulty analysis for ${selectedSubject} (${topicsData?.unitName}) for teacher handover.`}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        {level !== 'subjects' && (
                            <button
                                className="btn btn-secondary"
                                style={{ fontSize: 13 }}
                                onClick={() => {
                                    if (level === 'topics') drillIntoSubject(selectedSubject);
                                    else loadSubjects();
                                }}
                            >
                                ← Back to {level === 'topics' ? 'Units' : 'Subjects'}
                            </button>
                        )}
                        <button
                            className="btn btn-primary"
                            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={exportHandoverCSV}
                            title="Download formatted CSV spreadsheet compatible with Excel / Google Sheets"
                        >
                            <span>📥</span>
                            <span>Download {level === 'subjects' ? 'Subjects' : level === 'units' ? 'Units' : 'Topics'} CSV / Excel</span>
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={copyHandoverReportText}
                            title="Copy text summary to clipboard"
                        >
                            <span>{copiedReport ? '✓' : '📋'}</span>
                            <span>{copiedReport ? 'Report Copied!' : 'Copy Summary'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {err && (
                <div style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid var(--danger)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 20,
                    color: 'var(--danger)',
                    fontSize: 14
                }}>
                    {err}
                </div>
            )}

            {/* LEVEL 1: SUMMARY KPI CARDS */}
            {level === 'subjects' && summary && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 16,
                    marginBottom: 28
                }}>
                    <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent)' }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Subjects Monitored</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{summary.totalSubjects}</div>
                    </div>
                    <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Units (Forms)</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{summary.totalUnits}</div>
                    </div>
                    <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #06b6d4' }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Student Responses</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{summary.totalResponses}</div>
                    </div>
                    <div className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${summary.overallAverage >= 60 ? '#10b981' : '#ef4444'}` }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Institution Avg Understanding</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: summary.overallAverage >= 60 ? '#059669' : '#dc2626' }}>
                            {summary.overallAverage}%
                        </div>
                    </div>
                </div>
            )}

            {/* Search filter */}
            <div style={{ marginBottom: 18 }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={
                        level === 'subjects'
                            ? '🔍 Filter subjects by name...'
                            : level === 'units'
                            ? '🔍 Filter units by name...'
                            : '🔍 Filter topics by name...'
                    }
                    style={{
                        maxWidth: 400,
                        fontSize: 13,
                        background: '#fff',
                        padding: '10px 14px'
                    }}
                />
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
                    Loading data...
                </div>
            ) : (
                <>
                    {/* ============================================================== */}
                    {/* LEVEL 1: SUBJECTS OVERVIEW TABLE                               */}
                    {/* ============================================================== */}
                    {level === 'subjects' && (
                        subjects.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
                                <h3>No Subjects Recorded Yet</h3>
                                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                                    When faculties generate assessment forms for their units, subjects will appear here automatically.
                                </p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Subject</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Units (Forms)</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Evaluations</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Avg Understanding</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Status / Classification</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)', textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjects
                                            .filter(s => s.subject.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map((s, idx) => (
                                                <tr
                                                    key={s.subject}
                                                    style={{
                                                        borderBottom: idx === subjects.length - 1 ? 'none' : '1px solid var(--border)',
                                                        transition: 'background 0.15s'
                                                    }}
                                                >
                                                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text)' }}>
                                                        {s.subject}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', fontSize: 14 }}>
                                                        {s.totalUnits} {s.totalUnits === 1 ? 'Unit' : 'Units'}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', fontSize: 14 }}>
                                                        {s.totalResponses}
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                flex: 1,
                                                                maxWidth: 100,
                                                                height: 8,
                                                                background: '#e2e8f0',
                                                                borderRadius: 4,
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    width: `${Math.min(s.avgUnderstanding, 100)}%`,
                                                                    height: '100%',
                                                                    background: s.avgUnderstanding >= 60 ? '#10b981' : '#ef4444'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontSize: 13, fontWeight: 700 }}>
                                                                {s.totalResponses > 0 ? `${s.avgUnderstanding}%` : '—'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        {getBadge(s.avgUnderstanding, s.totalResponses)}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: 12, padding: '6px 12px' }}
                                                            onClick={() => drillIntoSubject(s.subject)}
                                                        >
                                                            View Units →
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* ============================================================== */}
                    {/* LEVEL 2: UNIT-WISE UNDERSTANDING TABLE                         */}
                    {/* ============================================================== */}
                    {level === 'units' && (
                        units.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
                                <h3>No Units Found for {selectedSubject}</h3>
                                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                                    No assessment forms have been created under this subject yet.
                                </p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{
                                    padding: '14px 20px',
                                    background: '#f8fafc',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                        Units / Forms Created ({units.length})
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                        Rule: ≥ 60% = Easy, &lt; 60% = Challenging
                                    </span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#ffffff', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Unit / Module</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Form Title</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Responses</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Avg Understanding</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Classification</th>
                                            <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)', textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {units
                                            .filter(u =>
                                                u.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                u.title.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map((u, idx) => (
                                                <tr
                                                    key={u.formId}
                                                    style={{
                                                        borderBottom: idx === units.length - 1 ? 'none' : '1px solid var(--border)',
                                                        transition: 'background 0.15s'
                                                    }}
                                                >
                                                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text)' }}>
                                                        {u.unitName}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--muted)' }}>
                                                        {u.title}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', fontSize: 14 }}>
                                                        {u.totalResponses}
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                flex: 1,
                                                                maxWidth: 100,
                                                                height: 8,
                                                                background: '#e2e8f0',
                                                                borderRadius: 4,
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    width: `${Math.min(u.avgUnderstanding, 100)}%`,
                                                                    height: '100%',
                                                                    background: u.avgUnderstanding >= 60 ? '#10b981' : '#ef4444'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontSize: 13, fontWeight: 700 }}>
                                                                {u.totalResponses > 0 ? `${u.avgUnderstanding}%` : '—'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        {getBadge(u.avgUnderstanding, u.totalResponses)}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: 12, padding: '6px 12px' }}
                                                            onClick={() => drillIntoUnit(u)}
                                                        >
                                                            View Topics →
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* ============================================================== */}
                    {/* LEVEL 3: TOPIC-WISE UNDERSTANDING TABLE                        */}
                    {/* ============================================================== */}
                    {level === 'topics' && topicsData && (
                        <div>
                            {/* Handover notification banner */}
                            <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
                                border: '1px solid #bbf7d0',
                                borderRadius: 10,
                                padding: '16px 20px',
                                marginBottom: 20
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 18 }}>💡</span>
                                    <strong style={{ fontSize: 14, color: '#166534' }}>
                                        Next-Batch Teacher Handover Advisory
                                    </strong>
                                </div>
                                <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5 }}>
                                    Topics marked 🔴 <strong>Challenging</strong> (under 60%) represent concepts where students struggled. Share this breakdown with the next batch instructors in advance so they can schedule additional foundation lectures and practice drills.
                                </p>
                            </div>

                            {/* Easy vs Challenging quick counts */}
                            <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
                                <div style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    borderRadius: 8,
                                    padding: '8px 14px',
                                    fontSize: 13,
                                    color: '#b91c1c',
                                    fontWeight: 600
                                }}>
                                    🔴 Challenging Topics: {topicsData.topics.filter(t => t.totalAnswers > 0 && t.avgUnderstanding < 60).length}
                                </div>
                                <div style={{
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                    borderRadius: 8,
                                    padding: '8px 14px',
                                    fontSize: 13,
                                    color: '#047857',
                                    fontWeight: 600
                                }}>
                                    🟢 Easy to Understand Topics: {topicsData.topics.filter(t => t.totalAnswers > 0 && t.avgUnderstanding >= 60).length}
                                </div>
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    padding: '8px 14px',
                                    fontSize: 13,
                                    color: 'var(--muted)',
                                    fontWeight: 500
                                }}>
                                    Total Topics: {topicsData.topics.length}
                                </div>
                            </div>

                            {topicsData.topics.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                                    <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
                                    <h3>No Topics Found</h3>
                                    <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                                        Questions in this unit did not have specific topic tags.
                                    </p>
                                </div>
                            ) : (
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Topic Name</th>
                                                <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Evaluations</th>
                                                <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Average Understanding</th>
                                                <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Classification</th>
                                                <th style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)' }}>Teacher Handover Note</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topicsData.topics
                                                .filter(t => t.topic.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .map((t, idx) => (
                                                    <tr
                                                        key={t.topic}
                                                        style={{
                                                            borderBottom: idx === topicsData.topics.length - 1 ? 'none' : '1px solid var(--border)',
                                                            background: t.totalAnswers > 0 && t.avgUnderstanding < 60 ? 'rgba(254, 242, 242, 0.5)' : '#fff'
                                                        }}
                                                    >
                                                        <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text)' }}>
                                                            {t.topic}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', fontSize: 14 }}>
                                                            {t.totalAnswers} {t.totalAnswers === 1 ? 'answer' : 'answers'}
                                                        </td>
                                                        <td style={{ padding: '16px 20px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{
                                                                    flex: 1,
                                                                    maxWidth: 100,
                                                                    height: 8,
                                                                    background: '#e2e8f0',
                                                                    borderRadius: 4,
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    <div style={{
                                                                        width: `${Math.min(t.avgUnderstanding, 100)}%`,
                                                                        height: '100%',
                                                                        background: t.avgUnderstanding >= 60 ? '#10b981' : '#ef4444'
                                                                    }} />
                                                                </div>
                                                                <span style={{ fontSize: 13, fontWeight: 700 }}>
                                                                    {t.totalAnswers > 0 ? `${t.avgUnderstanding}%` : '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px 20px' }}>
                                                            {getBadge(t.avgUnderstanding, t.totalAnswers)}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', fontSize: 12 }}>
                                                            {t.totalAnswers === 0 ? (
                                                                <span style={{ color: 'var(--muted)' }}>No responses received yet</span>
                                                            ) : t.avgUnderstanding >= 60 ? (
                                                                <span style={{ color: '#047857', fontWeight: 500 }}>
                                                                    ✓ Concepts well understood. Proceed as standard curriculum.
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                                                                    ⚠️ High confusion rate. Recommend early remedial lectures and revision.
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
