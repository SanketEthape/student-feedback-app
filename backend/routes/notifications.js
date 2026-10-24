const router = require('express').Router();
const studentAuth = require('../middleware/studentAuth');
const Notification = require('../models/Notification');

// ======================================================
// GET ALL NOTIFICATIONS FOR LOGGED-IN STUDENT
// ======================================================
router.get('/my', studentAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ student: req.student.id })
            .populate({
                path: 'form',
                select: 'title subject uniqueLink isPublished isActive reattemptDays allowAnonymous faculty',
                populate: {
                    path: 'faculty',
                    select: 'name department'
                }
            })
            .sort({ createdAt: -1 });

        res.json(notifications);
    } catch (err) {
        console.error('Fetch notifications error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ======================================================
// MARK NOTIFICATION AS READ
// ======================================================
router.patch('/:id/read', studentAuth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, student: req.student.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
