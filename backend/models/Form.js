const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const QuestionSchema = new mongoose.Schema({
    // Question topic
    topic: {
        type: String,
        default: ''
    },

    // Actual question
    question: {
        type: String,
        required: true
    },

    // Question type
    type: {
        type: String,
        enum: ['mcq', 'scale', 'text'],
        default: 'mcq'
    },

    // MCQ options
    options: {
        type: [String],
        default: []
    },

    // Correct answer for MCQ
    correctOption: {
        type: String,
        default: ''
    },

    // Simple explanation of the concept
    explanation: {
        type: String,
        default: ''
    },

    // Expected answer / important concepts for descriptive questions
    expectedAnswer: {
        type: String,
        default: ''
    }
});

const FormSchema = new mongoose.Schema({
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true
    },

    title: {
        type: String,
        required: true
    },

    subject: {
        type: String,
        required: true
    },

    syllabus: {
        type: String,
        required: true
    },

    questions: {
        type: [QuestionSchema],
        default: []
    },

    uniqueLink: {
        type: String,
        default: uuidv4,
        unique: true
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Form', FormSchema);