const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Faculty = require('../models/Faculty');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, department } = req.body;
        const exists = await Faculty.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email already registered' });
        const faculty = await Faculty.create({ name, email, password, department });
        const token = jwt.sign({ id: faculty._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, faculty: { id: faculty._id, name: faculty.name, email: faculty.email } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const faculty = await Faculty.findOne({ email });
        if (!faculty || !(await faculty.comparePassword(password)))
            return res.status(401).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: faculty._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, faculty: { id: faculty._id, name: faculty.name, email: faculty.email, department: faculty.department } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/me', auth, async (req, res) => {
    const faculty = await Faculty.findById(req.faculty.id).select('-password');
    res.json(faculty);
});

router.put('/api-key', auth, async (req, res) => {
    try {
        await Faculty.findByIdAndUpdate(req.faculty.id, { geminiApiKey: req.body.geminiApiKey });
        res.json({ message: 'API key saved' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;