const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../utils/encryption');

const FacultySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String },
    // Stored AES-256 encrypted (iv:ciphertext)
    geminiApiKey: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

FacultySchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    if (this.isModified('geminiApiKey') && this.geminiApiKey) {
        // Only encrypt if it's not already encrypted (iv:ciphertext format)
        if (!this.geminiApiKey.includes(':')) {
            this.geminiApiKey = encrypt(this.geminiApiKey);
        }
    }
    next();
});

FacultySchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Faculty', FacultySchema);