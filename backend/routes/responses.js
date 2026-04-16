const router = require('express').Router();
const auth = require('../middleware/auth');
const Form = require('../models/Form');
const Response = require('../models/Response');
const Faculty = require('../models/Faculty');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Submit response (public - students)
router.post('/submit/:link', async (req, res) => {
    try {
        const { studentName, rollNo, answers } = req.body;
        const form = await Form.findOne({ uniqueLink: req.params.link, isActive: true })
            .populate('faculty', 'geminiApiKey');
        if (!form) return res.status(404).json({ message: 'Form not found' });

        // Score MCQ answers
        const scored = answers.map(a => {
            const q = form.questions.id(a.questionId);
            return {
                ...a,
                topic: q?.topic || '',
                question: q?.question || '',
                isCorrect: q?.type === 'mcq' ? a.answer === q.correctOption : null
            };
        });

        // Generate study recommendation
        let recommendation = '';
        if (form.faculty.geminiApiKey) {
            try {
                const genAI = new GoogleGenerativeAI(form.faculty.geminiApiKey);
                const model = genAI.getGenerativeModel({ model: 'gemma-3-1b-it' });
                const weak = scored.filter(a => a.isCorrect === false).map(a => a.topic);
                const strong = scored.filter(a => a.isCorrect === true).map(a => a.topic);
                const textAnswers = scored.filter(a => a.isCorrect === null);

                const prompt = `
A student submitted a feedback form for the subject "${form.subject}".
Strong topics: ${[...new Set(strong)].join(', ') || 'None identified'}
Weak topics (wrong MCQ answers): ${[...new Set(weak)].join(', ') || 'None identified'}
Open-ended answers: ${textAnswers.map(a => `Q: ${a.question} A: ${a.answer}`).join(' | ')}

Write a personalized, friendly study recommendation (150 words max) for this student. 
Suggest what to review, how to approach weak areas, and encourage them. Use simple language.
`;
                const result = await model.generateContent(prompt);
                recommendation = result.response.text();
            } catch (e) {
                recommendation = 'Keep reviewing your weak topics and practice regularly!';
            }
        }

        const response = await Response.create({
            form: form._id,
            studentName: studentName || 'Anonymous',
            rollNo: rollNo || '',
            answers: scored,
            recommendation
        });

        res.json({ message: 'Submitted successfully!', recommendation, responseId: response._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all responses for a form (faculty only)
router.get('/form/:formId', auth, async (req, res) => {
    const form = await Form.findOne({ _id: req.params.formId, faculty: req.faculty.id });
    if (!form) return res.status(403).json({ message: 'Unauthorized' });
    const responses = await Response.find({ form: req.params.formId }).sort({ submittedAt: -1 });
    res.json(responses);
});

module.exports = router;