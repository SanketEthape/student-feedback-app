const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const Form = require('../models/Form');
const Response = require('../models/Response');

// ============================================================================
// ADMIN OVERVIEW SUMMARY STATS
// ============================================================================
router.get('/summary', adminAuth, async (req, res) => {
    try {
        const forms = await Form.find({}).select('subject unit title');
        const subjects = [...new Set(forms.map(f => f.subject).filter(Boolean))];
        const responsesCount = await Response.countDocuments({});

        // Calculate institution-wide average score
        const allResponses = await Response.find({}).select('overallScore');
        const avgScore = allResponses.length > 0
            ? Math.round(allResponses.reduce((acc, r) => acc + (r.overallScore || 0), 0) / allResponses.length)
            : 0;

        res.json({
            totalSubjects: subjects.length,
            totalUnits: forms.length,
            totalResponses: responsesCount,
            overallAverage: avgScore,
            classification: responsesCount > 0
                ? (avgScore >= 60 ? 'Easy to Understand' : 'Challenging to Understand')
                : 'No data'
        });
    } catch (err) {
        console.error('Admin summary error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ============================================================================
// LEVEL 1: ALL SUBJECTS OVERVIEW
// ============================================================================
router.get('/subjects', adminAuth, async (req, res) => {
    try {
        const forms = await Form.find({}).select('_id subject unit title createdAt');

        // Group forms by subject
        const subjectMap = {};
        forms.forEach(f => {
            const subj = f.subject ? f.subject.trim() : 'Uncategorized';
            if (!subjectMap[subj]) {
                subjectMap[subj] = {
                    formIds: [],
                    forms: []
                };
            }
            subjectMap[subj].formIds.push(f._id);
            subjectMap[subj].forms.push(f);
        });

        // For each subject, aggregate responses
        const subjectList = await Promise.all(
            Object.entries(subjectMap).map(async ([subject, data]) => {
                const responses = await Response.find({
                    form: { $in: data.formIds }
                }).select('overallScore');

                const totalResponses = responses.length;
                const avgScore = totalResponses > 0
                    ? Math.round(responses.reduce((sum, r) => sum + (r.overallScore || 0), 0) / totalResponses)
                    : 0;

                const classification = totalResponses > 0
                    ? (avgScore >= 60 ? 'Easy to Understand' : 'Challenging to Understand')
                    : 'No responses yet';

                return {
                    subject,
                    totalUnits: data.forms.length,
                    totalResponses,
                    avgUnderstanding: avgScore,
                    classification
                };
            })
        );

        // Sort alphabetically by subject name
        subjectList.sort((a, b) => a.subject.localeCompare(b.subject));

        res.json(subjectList);
    } catch (err) {
        console.error('Admin subjects error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ============================================================================
// LEVEL 2: UNIT-WISE UNDERSTANDING FOR A SUBJECT
// ============================================================================
router.get('/subjects/:subject/units', adminAuth, async (req, res) => {
    try {
        const subjectParam = decodeURIComponent(req.params.subject).trim();
        const forms = await Form.find({ subject: subjectParam })
            .select('_id title unit subject createdAt')
            .sort({ createdAt: 1 });

        if (!forms || forms.length === 0) {
            return res.json([]);
        }

        const unitList = await Promise.all(
            forms.map(async form => {
                const responses = await Response.find({ form: form._id }).select('overallScore');
                const totalResponses = responses.length;
                const avgScore = totalResponses > 0
                    ? Math.round(responses.reduce((sum, r) => sum + (r.overallScore || 0), 0) / totalResponses)
                    : 0;

                const classification = totalResponses > 0
                    ? (avgScore >= 60 ? 'Easy to Understand' : 'Challenging to Understand')
                    : 'No responses yet';

                return {
                    formId: form._id,
                    unitName: form.unit || form.title || 'Unit',
                    title: form.title,
                    totalResponses,
                    avgUnderstanding: avgScore,
                    classification,
                    createdAt: form.createdAt
                };
            })
        );

        res.json(unitList);
    } catch (err) {
        console.error('Admin units error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ============================================================================
// LEVEL 3: TOPIC-WISE UNDERSTANDING WITHIN A UNIT (FORM)
// ============================================================================
router.get('/units/:formId/topics', adminAuth, async (req, res) => {
    try {
        const form = await Form.findById(req.params.formId).select('_id title unit subject questions');
        if (!form) {
            return res.status(404).json({ message: 'Unit form not found' });
        }

        const responses = await Response.find({ form: form._id }).select('answers');

        const topicMap = {};

        // Pre-populate topics from form questions so even untaught/unanswered topics appear
        (form.questions || []).forEach(q => {
            const topicName = (q.topic && q.topic.trim()) ? q.topic.trim() : 'General';
            if (!topicMap[topicName]) {
                topicMap[topicName] = {
                    totalAnswers: 0,
                    totalScore: 0
                };
            }
        });

        // Tally answers for each topic
        responses.forEach(r => {
            (r.answers || []).forEach(a => {
                const topicName = (a.topic && a.topic.trim()) ? a.topic.trim() : 'General';
                if (!topicMap[topicName]) {
                    topicMap[topicName] = {
                        totalAnswers: 0,
                        totalScore: 0
                    };
                }
                const scoreVal = typeof a.score === 'number' ? a.score : (a.isCorrect ? 100 : 0);
                topicMap[topicName].totalScore += scoreVal;
                topicMap[topicName].totalAnswers++;
            });
        });

        const topics = Object.entries(topicMap).map(([topic, stat]) => {
            const avgScore = stat.totalAnswers > 0
                ? Math.round(stat.totalScore / stat.totalAnswers)
                : 0;

            const classification = stat.totalAnswers > 0
                ? (avgScore >= 60 ? 'Easy to Understand' : 'Challenging to Understand')
                : 'No responses yet';

            return {
                topic,
                totalAnswers: stat.totalAnswers,
                avgUnderstanding: avgScore,
                classification
            };
        });

        // Sort challenging topics first to help teachers immediately focus on what needs extra care
        topics.sort((a, b) => a.avgUnderstanding - b.avgUnderstanding);

        res.json({
            unitId: form._id,
            unitName: form.unit || form.title || 'Unit',
            subject: form.subject,
            totalResponses: responses.length,
            topics
        });
    } catch (err) {
        console.error('Admin topics error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
