const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        req.student = null;
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.role === 'student') {
            req.student = decoded;
        } else {
            req.student = null;
        }
    } catch {
        req.student = null;
    }
    next();
};
