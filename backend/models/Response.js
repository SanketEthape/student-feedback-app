const mongoose = require('mongoose');

// ==========================================
// INDIVIDUAL QUESTION ANSWER
// ==========================================

const AnswerSchema = new mongoose.Schema({
    // Original question ID
    questionId: {
        type: mongoose.Schema.Types.ObjectId
    },

    // Topic
    topic: {
        type: String,
        default: ''
    },

    // Question text
    question: {
        type: String,
        default: ''
    },

    // Question type: mcq / scale / text
    questionType: {
        type: String,
        enum: ['mcq', 'scale', 'text'],
        default: 'mcq'
    },

    // Student answer
    answer: {
        type: String,
        default: ''
    },

    // MCQ correct/wrong
    isCorrect: {
        type: Boolean,
        default: null
    },

    // Correct answer for MCQ
    correctAnswer: {
        type: String,
        default: ''
    },

    // Explanation
    explanation: {
        type: String,
        default: ''
    },

    // Score for this question (0–100)
    score: {
        type: Number,
        default: 0
    },

    // Low / Average / Good
    level: {
        type: String,
        enum: ['Low', 'Average', 'Good', 'Not Evaluated'],
        default: 'Not Evaluated'
    },

    // AI feedback for descriptive answer
    feedback: {
        type: String,
        default: ''
    },

    // Missing points for descriptive answer
    missingPoints: {
        type: [String],
        default: []
    },

    // AI-generated notes for Average understanding
    notes: {
        type: String,
        default: ''
    },

    // Important points to study
    importantPoints: {
        type: [String],
        default: []
    },

    // YouTube search query for Low understanding
    youtubeSearch: {
        type: String,
        default: ''
    },

    // Action suggested to student
    action: {
        type: String,
        default: ''
    }
});


// ==========================================
// COMPLETE STUDENT RESPONSE
// ==========================================

const ResponseSchema = new mongoose.Schema({
    form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },

    studentName: {
        type: String,
        default: 'Anonymous'
    },

    rollNo: {
        type: String,
        default: ''
    },

    // All 10 question evaluations
    answers: {
        type: [AnswerSchema],
        default: []
    },

    // Personalized overall recommendation
    recommendation: {
        type: String,
        default: ''
    },

    // Overall score out of 100
    overallScore: {
        type: Number,
        default: 0
    },

    // Overall student understanding
    overallLevel: {
        type: String,
        enum: ['Needs Improvement', 'Average Understanding', 'Good Understanding'],
        default: 'Needs Improvement'
    },

    submittedAt: {
        type: Date,
        default: Date.now
    }
});


module.exports = mongoose.model('Response', ResponseSchema);