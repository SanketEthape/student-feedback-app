const router = require('express').Router();
const auth = require('../middleware/auth');
const Faculty = require('../models/Faculty');
const Form = require('../models/Form');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ======================================================
// Generate questions from syllabus using Gemini
// ======================================================

router.post('/generate', auth, async (req, res) => {
    try {
        const { title, subject, syllabus } = req.body;

        // Validate input
        if (!title || !subject || !syllabus) {
            return res.status(400).json({
                message: 'Title, subject and syllabus are required.'
            });
        }

        // Find logged-in faculty
        const faculty = await Faculty.findById(req.faculty.id);

        if (!faculty) {
            return res.status(404).json({
                message: 'Faculty not found.'
            });
        }

        // Check Gemini API key
        if (!faculty.geminiApiKey) {
            return res.status(400).json({
                message: 'Please add your Gemini API key in Settings first.'
            });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(faculty.geminiApiKey);

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite'
        });

        // ==================================================
        // Gemini Prompt
        // ==================================================

        const prompt = `
You are an expert educational assessment designer.

Based on the syllabus provided below, generate EXACTLY 10 unique assessment questions.

SYLLABUS:
${syllabus}

SUBJECT:
${subject}

==================================================
QUESTION DISTRIBUTION
==================================================

Generate exactly:

- 6 MCQ questions
- 2 Scale questions
- 2 Descriptive/Text questions

Total = EXACTLY 10 questions.

==================================================
GENERAL RULES
==================================================

1. All questions must be directly related to the provided syllabus.

2. Do not create questions outside the syllabus.

3. Do not use placeholders such as:
   - "Option A"
   - "Option B"
   - "Topic Name"
   - "Correct Answer"

4. Every question must have a meaningful and specific topic.

5. Questions should test actual student understanding.

6. Avoid duplicate or nearly identical questions.

7. Use simple and student-friendly language.

==================================================
MCQ RULES
==================================================

For exactly 6 questions:

"type": "mcq"

Each MCQ must contain:

- exactly 4 plausible options
- exactly 1 correct option
- correctOption
- short student-friendly explanation

Example:

{
    "topic": "Cloud Computing",
    "question": "Which characteristic allows a cloud system to handle increasing workload by adding resources?",
    "type": "mcq",
    "options": [
        "Scalability",
        "Encryption",
        "Latency",
        "Virtualization"
    ],
    "correctOption": "Scalability",
    "explanation": "Scalability allows a system to increase or decrease resources according to workload."
}

==================================================
SCALE RULES
==================================================

For exactly 2 questions:

"type": "scale"

Use exactly:

"options": ["1", "2", "3", "4", "5"]

The scale should measure the student's understanding or confidence about a syllabus topic.

Example:

{
    "topic": "Cloud Security",
    "question": "How confident are you in understanding basic cloud security concepts?",
    "type": "scale",
    "options": ["1", "2", "3", "4", "5"],
    "correctOption": "",
    "explanation": "",
    "expectedAnswer": ""
}

Scale meaning:

1 = Very Low Understanding
2 = Low Understanding
3 = Average Understanding
4 = Good Understanding
5 = Excellent Understanding

==================================================
DESCRIPTIVE / TEXT RULES
==================================================

For exactly 2 questions:

"type": "text"

These questions must require the student to explain a concept in their own words.

For every text question provide:

- topic
- question
- type = "text"
- options = []
- correctOption = ""
- explanation
- expectedAnswer

The expectedAnswer must contain the important concepts that a good student answer should include.

Example:

{
    "topic": "Database Management System",
    "question": "Explain DBMS and describe its major advantages.",
    "type": "text",
    "options": [],
    "correctOption": "",
    "explanation": "A good answer should define DBMS and explain important advantages such as security, reduced redundancy and data sharing.",
    "expectedAnswer": "DBMS is software used to create, store, organize and manage databases. Important advantages include data security, reduced data redundancy, data sharing, data integrity and backup/recovery."
}

==================================================
EXPECTED ANSWER RULES
==================================================

For text questions:

- expectedAnswer must be factually correct.
- It should contain the main concepts required in the answer.
- Do not make it excessively long.
- It will later be used by an AI evaluator to compare the student's answer.
- Include important keywords/concepts.
- Do not require exact wording from the student.

For MCQ:

- expectedAnswer should be an empty string.

For Scale:

- expectedAnswer should be an empty string.

==================================================
EXPLANATION RULES
==================================================

MCQ:
Provide a short explanation of why the correct option is correct.

Scale:
Use an empty string.

Text:
Explain what concepts a good answer should contain.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY a valid JSON array.

Do NOT return:
- Markdown
- Code fences
- Extra explanation
- "Here is your JSON"
- Any text before or after the JSON

The JSON array must contain exactly 10 objects.

The order should be:

1-6 = MCQ
7-8 = Scale
9-10 = Text

Use this exact structure:

[
    {
        "topic": "string",
        "question": "string",
        "type": "mcq",
        "options": ["string", "string", "string", "string"],
        "correctOption": "string",
        "explanation": "string",
        "expectedAnswer": ""
    },
    {
        "topic": "string",
        "question": "string",
        "type": "scale",
        "options": ["1", "2", "3", "4", "5"],
        "correctOption": "",
        "explanation": "",
        "expectedAnswer": ""
    },
    {
        "topic": "string",
        "question": "string",
        "type": "text",
        "options": [],
        "correctOption": "",
        "explanation": "string",
        "expectedAnswer": "string"
    }
]
`;

        // ==================================================
        // Generate Gemini response
        // ==================================================

        const result = await model.generateContent(prompt);

        let text = result.response.text();

        // Remove markdown code fences if Gemini adds them
        text = text
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        // Parse JSON
        let questions;

        try {
            questions = JSON.parse(text);
        } catch (jsonError) {
            console.error('Gemini returned invalid JSON:', text);

            return res.status(500).json({
                message: 'Gemini returned invalid question data. Please try again.'
            });
        }

        // ==================================================
        // Validate generated questions
        // ==================================================

        if (!Array.isArray(questions)) {
            return res.status(500).json({
                message: 'Invalid question format received from Gemini.'
            });
        }

        if (questions.length !== 10) {
            return res.status(500).json({
                message: `Gemini generated ${questions.length} questions instead of 10. Please try again.`
            });
        }

        // Count question types
        const mcqCount = questions.filter(q => q.type === 'mcq').length;
        const scaleCount = questions.filter(q => q.type === 'scale').length;
        const textCount = questions.filter(q => q.type === 'text').length;

        if (
            mcqCount !== 6 ||
            scaleCount !== 2 ||
            textCount !== 2
        ) {
            return res.status(500).json({
                message: 'Generated question distribution is incorrect. Please try again.'
            });
        }

        // ==================================================
        // Normalize / validate each question
        // ==================================================

        const validatedQuestions = questions.map((q, index) => {

            // Basic fields
            q.topic = q.topic || '';
            q.question = q.question || '';
            q.options = Array.isArray(q.options) ? q.options : [];
            q.correctOption = q.correctOption || '';
            q.explanation = q.explanation || '';
            q.expectedAnswer = q.expectedAnswer || '';

            // MCQ validation
            if (q.type === 'mcq') {

                if (q.options.length !== 4) {
                    throw new Error(
                        `MCQ question ${index + 1} does not contain exactly 4 options.`
                    );
                }

                if (!q.correctOption) {
                    throw new Error(
                        `MCQ question ${index + 1} is missing correctOption.`
                    );
                }

                if (!q.options.includes(q.correctOption)) {
                    throw new Error(
                        `MCQ question ${index + 1} has an invalid correctOption.`
                    );
                }

                // MCQ does not need expectedAnswer
                q.expectedAnswer = '';
            }

            // Scale validation
            if (q.type === 'scale') {

                q.options = ["1", "2", "3", "4", "5"];
                q.correctOption = '';
                q.explanation = '';
                q.expectedAnswer = '';
            }

            // Text validation
            if (q.type === 'text') {

                q.options = [];
                q.correctOption = '';

                if (!q.expectedAnswer) {
                    throw new Error(
                        `Text question ${index + 1} is missing expectedAnswer.`
                    );
                }

                if (!q.explanation) {
                    throw new Error(
                        `Text question ${index + 1} is missing explanation.`
                    );
                }
            }

            return q;
        });

        // ==================================================
        // Create Form
        // ==================================================

        const form = await Form.create({
            faculty: req.faculty.id,
            title,
            subject,
            syllabus,
            questions: validatedQuestions
        });

        // Return created form
        res.json(form);

    } catch (err) {

        console.error('Form generation error:', err);

        res.status(500).json({
            message: err.message || 'Failed to generate form.'
        });
    }
});


// ======================================================
// Get all forms for logged-in faculty
// ======================================================

router.get('/my', auth, async (req, res) => {
    try {

        const forms = await Form.find({
            faculty: req.faculty.id
        }).sort({
            createdAt: -1
        });

        res.json(forms);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });
    }
});


// ======================================================
// Get form by unique link
// Public route for students
// ======================================================

router.get('/link/:link', async (req, res) => {

    try {

        const form = await Form.findOne({
            uniqueLink: req.params.link,
            isActive: true
        }).populate(
            'faculty',
            'name department'
        );

        if (!form) {
            return res.status(404).json({
                message: 'Form not found or inactive'
            });
        }

        res.json(form);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });
    }
});


// ======================================================
// Get single form by ID
// Faculty only
// ======================================================

router.get('/:id', auth, async (req, res) => {

    try {

        const form = await Form.findOne({
            _id: req.params.id,
            faculty: req.faculty.id
        });

        if (!form) {
            return res.status(404).json({
                message: 'Form not found'
            });
        }

        res.json(form);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });
    }
});


// ======================================================
// Toggle form active status
// ======================================================

router.patch('/:id/toggle', auth, async (req, res) => {

    try {

        const form = await Form.findOne({
            _id: req.params.id,
            faculty: req.faculty.id
        });

        if (!form) {
            return res.status(404).json({
                message: 'Not found'
            });
        }

        form.isActive = !form.isActive;

        await form.save();

        res.json(form);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });
    }
});


// ======================================================
// Delete form
// ======================================================

router.delete('/:id', auth, async (req, res) => {

    try {

        const form = await Form.findOneAndDelete({
            _id: req.params.id,
            faculty: req.faculty.id
        });

        if (!form) {
            return res.status(404).json({
                message: 'Form not found'
            });
        }

        res.json({
            message: 'Deleted'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });
    }
});


module.exports = router;

