const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const FacultySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String },
    geminiApiKey: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

FacultySchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

FacultySchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Faculty', FacultySchema);