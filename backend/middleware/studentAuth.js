const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Student login required' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Ensure this is a student token, not a faculty token
        if (decoded.role !== 'student') {
            return res.status(403).json({ message: 'Access denied. Student account required.' });
        }
        req.student = decoded;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }
};
