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
        const { name, email, password, rollNo, studentClass, class: bodyClass, division } = req.body;
        const targetClass = (studentClass || bodyClass || '').trim();
        const targetDiv = (division || '').trim().toUpperCase();
        const targetRoll = (rollNo || '').trim();

        if (!name || !email || !password || !targetClass || !targetDiv || !targetRoll) {
            return res.status(400).json({
                message: 'All fields (Name, Email, Password, Class, Division, and Roll Number) are required.'
            });
        }
        const exists = await Student.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email already registered' });

        const student = await Student.create({
            name: name.trim(),
            email: email.trim(),
            password,
            rollNo: targetRoll,
            studentClass: targetClass,
            division: targetDiv
        });

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
                studentClass: student.studentClass,
                division: student.division,
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
                studentClass: student.studentClass || '',
                division: student.division || '',
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
            studentClass: student.studentClass || '',
            division: student.division || '',
            hasApiKey: !!student.geminiApiKey,
            createdAt: student.createdAt
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// GET ALL DISTINCT CLASSES & DIVISIONS (Public/Faculty)
// ======================================================
router.get('/classes-divisions', async (req, res) => {
    try {
        const registeredClasses = await Student.distinct('studentClass');
        const registeredDivisions = await Student.distinct('division');

        const defaultClasses = ['FY', 'SY', 'TY', 'Final Year'];
        const defaultDivisions = ['A', 'B', 'C', 'D'];

        const allClasses = [...new Set([...defaultClasses, ...registeredClasses.filter(Boolean)])];
        const allDivisions = [...new Set([...defaultDivisions, ...registeredDivisions.filter(Boolean)])];

        res.json({
            classes: allClasses,
            divisions: allDivisions
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
