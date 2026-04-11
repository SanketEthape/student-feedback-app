const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const QuestionSchema = new mongoose.Schema({
    topic: String,
    question: String,
    type: { type: String, enum: ['mcq', 'scale', 'text'], default: 'mcq' },
    options: [String],
    correctOption: String
});

const FormSchema = new mongoose.Schema({
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    syllabus: { type: String, required: true },
    questions: [QuestionSchema],
    uniqueLink: { type: String, default: uuidv4, unique: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Form', FormSchema);