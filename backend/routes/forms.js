const router = require('express').Router();
const auth = require('../middleware/auth');
const Faculty = require('../models/Faculty');
const Form = require('../models/Form');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Generate questions from syllabus using Gemini
router.post('/generate', auth, async (req, res) => {
    try {
        const { title, subject, syllabus } = req.body;
        const faculty = await Faculty.findById(req.faculty.id);
        if (!faculty.geminiApiKey)
            return res.status(400).json({ message: 'Please add your Gemini API key in Settings first.' });

        const genAI = new GoogleGenerativeAI(faculty.geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
You are an educational assessment expert. Based on the following syllabus, generate 10 feedback questions that check if students understood each topic conceptually (not technically). 
Avoid code or formula-based questions. Focus on understanding, application, and real-world relevance.

Syllabus:
${syllabus}

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "topic": "Topic Name",
    "question": "The question text",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": "Option A"
  }
]
Mix question types: 6 mcq, 2 scale (options: ["1","2","3","4","5"]), 2 text (options: []).
For scale and text types, correctOption should be "".
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        const questions = JSON.parse(text);

        const form = await Form.create({ faculty: req.faculty.id, title, subject, syllabus, questions });
        res.json(form);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Get all forms for logged-in faculty
router.get('/my', auth, async (req, res) => {
    const forms = await Form.find({ faculty: req.faculty.id }).sort({ createdAt: -1 });
    res.json(forms);
});

// Get form by unique link (public - for students)
router.get('/link/:link', async (req, res) => {
    const form = await Form.findOne({ uniqueLink: req.params.link, isActive: true })
        .populate('faculty', 'name department');
    if (!form) return res.status(404).json({ message: 'Form not found or inactive' });
    res.json(form);
});

// Get single form by ID (faculty)
router.get('/:id', auth, async (req, res) => {
    const form = await Form.findOne({ _id: req.params.id, faculty: req.faculty.id });
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json(form);
});

// Toggle form active status
router.patch('/:id/toggle', auth, async (req, res) => {
    const form = await Form.findOne({ _id: req.params.id, faculty: req.faculty.id });
    if (!form) return res.status(404).json({ message: 'Not found' });
    form.isActive = !form.isActive;
    await form.save();
    res.json(form);
});

// Delete form
router.delete('/:id', auth, async (req, res) => {
    await Form.findOneAndDelete({ _id: req.params.id, faculty: req.faculty.id });
    res.json({ message: 'Deleted' });
});

module.exports = router;