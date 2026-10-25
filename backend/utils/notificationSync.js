const Form = require('../models/Form');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Notification = require('../models/Notification');

/**
 * Synchronizes notifications for a student against all currently active & published forms
 * that match their branch, class, and division.
 * Ensures students who register or update their profile after a form is published
 * still receive their assigned form notifications.
 */
async function syncNotificationsForStudent(studentId) {
    try {
        const student = await Student.findById(studentId);
        if (!student || !student.studentClass || !student.division) return;

        const studentBranch = (student.branch || 'Computer Engineering').trim();
        const studentClass = student.studentClass.trim();
        const studentDiv = student.division.trim().toUpperCase();

        // Escape regex characters for safe matching
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const branchRegex = new RegExp(`^${escapeRegex(studentBranch)}$`, 'i');
        const classRegex = new RegExp(`^${escapeRegex(studentClass)}$`, 'i');
        const divRegex = new RegExp(`^${escapeRegex(studentDiv)}$`, 'i');

        const formQuery = {
            isActive: true,
            isPublished: true,
            $and: [
                {
                    $or: [
                        { targetClasses: { $size: 0 } },
                        { targetClasses: classRegex }
                    ]
                },
                {
                    $or: [
                        { targetDivisions: { $size: 0 } },
                        { targetDivisions: divRegex }
                    ]
                },
                {
                    $or: [
                        { targetBranches: { $size: 0 } },
                        { targetBranches: branchRegex }
                    ]
                }
            ]
        };

        const matchingForms = await Form.find(formQuery).populate('faculty', 'name department');
        if (!matchingForms || matchingForms.length === 0) return;

        const existingNotifs = await Notification.find({ student: student._id }).select('form');
        const existingFormIds = new Set(
            existingNotifs
                .filter(n => n.form)
                .map(n => n.form.toString())
        );

        const newDocs = matchingForms
            .filter(f => !existingFormIds.has(f._id.toString()))
            .map(f => ({
                student: student._id,
                form: f._id,
                title: `New Assessment: ${f.title}`,
                subject: f.subject,
                facultyName: f.faculty?.name || 'Faculty',
                isRead: false
            }));

        if (newDocs.length > 0) {
            await Notification.insertMany(newDocs);
            console.log(`Synced ${newDocs.length} new notification(s) for student ${student.email}`);
        }
    } catch (err) {
        console.error('Error syncing notifications for student:', err.message);
    }
}

module.exports = { syncNotificationsForStudent };
