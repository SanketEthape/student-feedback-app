const router = require('express').Router();
const auth = require('../middleware/auth');
const Form = require('../models/Form');
const Response = require('../models/Response');
const Faculty = require('../models/Faculty');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.get('/form/:formId', auth, async (req, res) => {
    try {
        const form = await Form.findOne({ _id: req.params.formId, faculty: req.faculty.id });
        if (!form) return res.status(403).json({ message: 'Unauthorized' });

        const responses = await Response.find({ form: req.params.formId });
        if (responses.length === 0) return res.json({ summary: {}, aiInsight: '', topicStats: [] });

        // Per-topic stats
        const topicMap = {};
        responses.forEach(r => {
            r.answers.forEach(a => {
                if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, wrong: 0, total: 0 };
                if (a.isCorrect === true) topicMap[a.topic].correct++;
                else if (a.isCorrect === false) topicMap[a.topic].wrong++;
                topicMap[a.topic].total++;
            });
        });

        const topicStats = Object.entries(topicMap).map(([topic, s]) => ({
            topic,
            correct: s.correct,
            wrong: s.wrong,
            total: s.total,
            pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
        }));

        // AI class-level insight
        let aiInsight = '';
        const faculty = await Faculty.findById(req.faculty.id);
        if (faculty.geminiApiKey) {
            const genAI = new GoogleGenerativeAI(faculty.geminiApiKey);
            const model = genAI.getGenerativeModel({ model: 'gemma-3-1b-it' });
            const weakTopics = topicStats.filter(t => t.pct < 50).map(t => t.topic);
            const strongTopics = topicStats.filter(t => t.pct >= 75).map(t => t.topic);
            const prompt = `
You are an academic advisor analyzing class performance for "${form.subject}".
Total students: ${responses.length}
Weak topics (< 50% correct): ${weakTopics.join(', ') || 'None'}
Strong topics (>= 75% correct): ${strongTopics.join(', ') || 'None'}

Give a concise 3-4 line teaching suggestion to the faculty on what to re-teach and how to improve student outcomes.
`;
            try {
                const result = await model.generateContent(prompt);
                aiInsight = result.response.text();
            } catch (e) {
                aiInsight = 'Focus extra class time on topics where less than 50% of students answered correctly.';
            }
        }

        res.json({
            totalResponses: responses.length,
            topicStats,
            aiInsight
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;