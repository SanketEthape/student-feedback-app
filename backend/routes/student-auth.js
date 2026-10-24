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
// UPDATE PROFILE (protected)
// ======================================================
router.put('/profile', studentAuth, async (req, res) => {
    try {
        const { name, rollNo, studentClass, division, currentPassword, newPassword } = req.body;
        const student = await Student.findById(req.student.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (name !== undefined) {
            const trimmedName = String(name).trim();
            if (!trimmedName) return res.status(400).json({ message: 'Name cannot be empty' });
            student.name = trimmedName;
        }

        if (rollNo !== undefined) {
            const trimmedRoll = String(rollNo).trim();
            if (!trimmedRoll) return res.status(400).json({ message: 'Roll number cannot be empty' });
            student.rollNo = trimmedRoll;
        }

        if (studentClass !== undefined) {
            const validClasses = ['FY', 'SY', 'TY', 'Final Year'];
            const trimmedClass = String(studentClass).trim();
            if (!validClasses.includes(trimmedClass)) {
                return res.status(400).json({ message: `Class must be one of: ${validClasses.join(', ')}` });
            }
            student.studentClass = trimmedClass;
        }

        if (division !== undefined) {
            const trimmedDiv = String(division).trim().toUpperCase();
            if (!trimmedDiv) return res.status(400).json({ message: 'Division cannot be empty' });
            student.division = trimmedDiv;
        }

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to change password' });
            }
            const isMatch = await student.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters' });
            }
            student.password = newPassword;
        }

        await student.save();

        res.json({
            message: 'Profile updated successfully',
            student: {
                id: student._id,
                name: student.name,
                email: student.email,
                rollNo: student.rollNo,
                studentClass: student.studentClass,
                division: student.division,
                hasApiKey: !!student.geminiApiKey,
                createdAt: student.createdAt
            }
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
