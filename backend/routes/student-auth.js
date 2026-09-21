const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const studentAuth = require('../middleware/studentAuth');
const { encrypt, decrypt } = require('../utils/encryption');

// ======================================================
// REGISTER
// ======================================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, rollNo } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }
        const exists = await Student.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email already registered' });

        const student = await Student.create({ name, email, password, rollNo: rollNo || '' });
        const token = jwt.sign(
            { id: student._id, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            token,
            student: {
                id: student._id,
                name: student.name,
                email: student.email,
                rollNo: student.rollNo,
                hasApiKey: false
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// LOGIN
// ======================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const student = await Student.findOne({ email });
        if (!student || !(await student.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = jwt.sign(
            { id: student._id, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({
            token,
            student: {
                id: student._id,
                name: student.name,
                email: student.email,
                rollNo: student.rollNo,
                hasApiKey: !!student.geminiApiKey
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// GET PROFILE (protected)
// ======================================================
router.get('/me', studentAuth, async (req, res) => {
    try {
        const student = await Student.findById(req.student.id).select('-password');
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({
            id: student._id,
            name: student.name,
            email: student.email,
            rollNo: student.rollNo,
            hasApiKey: !!student.geminiApiKey,
            createdAt: student.createdAt
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// SAVE / UPDATE GEMINI API KEY (protected)
// Encrypts the key before saving
// ======================================================
router.put('/api-key', studentAuth, async (req, res) => {
    try {
        const { geminiApiKey } = req.body;
        const encryptedKey = geminiApiKey ? encrypt(geminiApiKey) : '';
        await Student.findByIdAndUpdate(req.student.id, { geminiApiKey: encryptedKey });
        res.json({ message: 'API key saved securely', hasApiKey: !!geminiApiKey });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// DELETE API KEY (protected)
// ======================================================
router.delete('/api-key', studentAuth, async (req, res) => {
    try {
        await Student.findByIdAndUpdate(req.student.id, { geminiApiKey: '' });
        res.json({ message: 'API key removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
