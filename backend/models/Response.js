const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
    questionId: mongoose.Schema.Types.ObjectId,
    topic: String,
    question: String,
    answer: String,
    isCorrect: Boolean
});

const ResponseSchema = new mongoose.Schema({
    form: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
    studentName: { type: String, default: 'Anonymous' },
    rollNo: { type: String, default: '' },
    answers: [AnswerSchema],
    recommendation: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Response', ResponseSchema);