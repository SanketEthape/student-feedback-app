const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // Compulsory student class, division, and branch
    studentClass: {
        type: String,
        required: [true, 'Class is required'],
        trim: true
    },

    division: {
        type: String,
        required: [true, 'Division is required'],
        trim: true,
        uppercase: true
    },

    branch: {
        type: String,
        required: [true, 'Branch is required'],
        trim: true,
        default: 'Computer Engineering'
    },

    // Compulsory roll number
    rollNo: {
        type: String,
        required: [true, 'Roll number is required'],
        trim: true
    },

    // Gemini API key stored AES-256 encrypted (iv:ciphertext)
    geminiApiKey: { type: String, default: '' },

    createdAt: { type: Date, default: Date.now }
});

StudentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

StudentSchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Student', StudentSchema);
