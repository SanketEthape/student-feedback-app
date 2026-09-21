const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Accept tokens with role:'faculty' OR old tokens with no role (pre-update tokens are always faculty)
        // Only explicitly reject student tokens
        if (decoded.role === 'student') {
            return res.status(403).json({ message: 'Access denied. Faculty account required.' });
        }
        req.faculty = decoded;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};