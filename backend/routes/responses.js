const router = require('express').Router();
const auth = require('../middleware/auth');
const Form = require('../models/Form');
const Response = require('../models/Response');
const { GoogleGenerativeAI } = require('@google/generative-ai');


// ======================================================
// SUBMIT RESPONSE
// ======================================================

router.post('/submit/:link', async (req, res) => {
    try {
        const { studentName, rollNo, answers } = req.body;

        // --------------------------------------------------
        // FIND FORM
        // --------------------------------------------------

        const form = await Form.findOne({
            uniqueLink: req.params.link,
            isActive: true
        }).populate('faculty', 'geminiApiKey');

        if (!form) {
            return res.status(404).json({
                message: 'Form not found or inactive'
            });
        }

        // --------------------------------------------------
        // GEMINI SETUP
        // --------------------------------------------------

        let model = null;

        if (form.faculty?.geminiApiKey) {
            const genAI = new GoogleGenerativeAI(
                form.faculty.geminiApiKey
            );

            model = genAI.getGenerativeModel({
                model: 'gemini-3.1-flash-lite'
            });
        }

        // --------------------------------------------------
        // CREATE BASE ANSWERS
        // --------------------------------------------------

        const scored = [];

        for (const a of answers || []) {

            const q = form.questions.id(a.questionId);

            if (!q) {
                continue;
            }

            const baseAnswer = {
                questionId: q._id,
                topic: q.topic || '',
                question: q.question || '',
                questionType: q.type || 'mcq',
                answer: a.answer || '',

                isCorrect: null,

                correctAnswer: q.correctOption || '',

                explanation: q.explanation || '',

                score: 0,

                level: 'Not Evaluated',

                feedback: '',

                missingPoints: [],

                notes: '',

                importantPoints: [],

                youtubeSearch: '',

                action: ''
            };

            // ==================================================
            // MCQ EVALUATION
            // ==================================================

            if (q.type === 'mcq') {

                const correct =
                    a.answer === q.correctOption;

                baseAnswer.isCorrect = correct;

                baseAnswer.score = correct ? 100 : 0;

                baseAnswer.level =
                    correct ? 'Good' : 'Low';

                baseAnswer.action =
                    correct
                        ? 'Good understanding of this concept.'
                        : `Review ${q.topic} and practice similar MCQs.`;

                if (!correct) {
                    baseAnswer.youtubeSearch =
                        `${q.topic} complete tutorial for beginners`;
                }
            }


            // ==================================================
            // SCALE EVALUATION
            // ==================================================

            else if (q.type === 'scale') {

                const value = Number(a.answer);

                if (value >= 1 && value <= 5) {

                    baseAnswer.score =
                        Math.round((value / 5) * 100);

                    if (value <= 2) {

                        baseAnswer.level = 'Low';

                        baseAnswer.feedback =
                            `Your confidence in ${q.topic} appears low. Review the basic concepts and practice more questions.`;

                        baseAnswer.action =
                            `Focus on understanding the fundamentals of ${q.topic}.`;

                        baseAnswer.youtubeSearch =
                            `${q.topic} complete tutorial for beginners`;
                    }

                    else if (value === 3) {

                        baseAnswer.level = 'Average';

                        baseAnswer.feedback =
                            `You have some understanding of ${q.topic}, but more practice is recommended.`;

                        baseAnswer.notes =
                            `Review the important concepts of ${q.topic} and practice application-based questions.`;

                        baseAnswer.importantPoints = [
                            `Understand the basic concepts of ${q.topic}`,
                            `Practice questions related to ${q.topic}`,
                            `Review areas where you feel less confident`
                        ];

                        baseAnswer.action =
                            `Revise ${q.topic} and practice more questions.`;
                    }

                    else {

                        baseAnswer.level = 'Good';

                        baseAnswer.feedback =
                            `You show good confidence in ${q.topic}. Continue practicing to maintain your understanding.`;

                        baseAnswer.action =
                            'Good understanding. Keep practicing.';
                    }
                }
            }


            // ==================================================
            // DESCRIPTIVE / TEXT EVALUATION
            // ==================================================

            else if (q.type === 'text') {

                if (!a.answer || a.answer.trim().length === 0) {

                    baseAnswer.score = 0;

                    baseAnswer.level = 'Low';

                    baseAnswer.feedback =
                        'No answer was provided for this question.';

                    baseAnswer.missingPoints = [
                        'Attempt the question',
                        'Explain the main concept',
                        'Include important points related to the topic'
                    ];

                    baseAnswer.action =
                        `Study ${q.topic} and attempt the question again.`;

                    baseAnswer.youtubeSearch =
                        `${q.topic} complete tutorial for beginners`;
                }

                else if (model) {

                    try {

                        const prompt = `
You are an expert educational evaluator.

Evaluate the following student's descriptive answer.

Subject:
${form.subject}

Topic:
${q.topic}

Question:
${q.question}

Expected Answer:
${q.expectedAnswer || q.explanation || 'Evaluate based on the correctness and relevance of the answer.'}

Student Answer:
${a.answer}

Evaluate the answer fairly.

Give:
1. Score from 0 to 10
2. Level:
   0-4 = Low
   5-7 = Average
   8-10 = Good
3. Short constructive feedback
4. Missing important points
5. Three important points to study
6. A useful YouTube search query only if the answer is Low or Average

Return ONLY valid JSON.

Use exactly this format:

{
    "score": 0,
    "level": "Low",
    "feedback": "Short feedback",
    "missingPoints": [
        "Missing point 1",
        "Missing point 2"
    ],
    "importantPoints": [
        "Important point 1",
        "Important point 2",
        "Important point 3"
    ],
    "youtubeSearch": "topic complete tutorial for beginners",
    "action": "What the student should do next"
}
`;

                        const result =
                            await model.generateContent(prompt);

                        const aiText =
                            result.response
                                .text()
                                .replace(/```json|```/g, '')
                                .trim();

                        const evaluation =
                            JSON.parse(aiText);

                        const score =
                            Math.max(
                                0,
                                Math.min(
                                    10,
                                    Number(evaluation.score) || 0
                                )
                            );

                        baseAnswer.score =
                            score * 10;

                        if (score <= 4) {
                            baseAnswer.level = 'Low';
                        }
                        else if (score <= 7) {
                            baseAnswer.level = 'Average';
                        }
                        else {
                            baseAnswer.level = 'Good';
                        }

                        baseAnswer.feedback =
                            evaluation.feedback || '';

                        baseAnswer.missingPoints =
                            Array.isArray(
                                evaluation.missingPoints
                            )
                                ? evaluation.missingPoints
                                : [];

                        baseAnswer.importantPoints =
                            Array.isArray(
                                evaluation.importantPoints
                            )
                                ? evaluation.importantPoints
                                : [];

                        baseAnswer.youtubeSearch =
                            baseAnswer.level !== 'Good'
                                ? (
                                    evaluation.youtubeSearch ||
                                    `${q.topic} complete tutorial for beginners`
                                )
                                : '';

                        baseAnswer.action =
                            evaluation.action || '';

                        baseAnswer.notes =
                            baseAnswer.level === 'Average'
                                ? `Revise ${q.topic} and practice more descriptive questions.`
                                : '';

                    }

                    catch (aiError) {

                        console.error(
                            'Descriptive AI evaluation error:',
                            aiError
                        );

                        baseAnswer.level =
                            'Not Evaluated';

                        baseAnswer.feedback =
                            'AI evaluation could not be completed. Please review the expected answer manually.';

                        baseAnswer.action =
                            `Review ${q.topic} and compare your answer with the expected concepts.`;
                    }
                }

                else {

                    baseAnswer.level =
                        'Not Evaluated';

                    baseAnswer.feedback =
                        'AI evaluation is unavailable because the Gemini API key is not configured.';
                }
            }

            scored.push(baseAnswer);
        }


        // ======================================================
        // OVERALL SCORE
        // ======================================================

        const totalQuestions = scored.length;

        const totalScore =
            scored.reduce(
                (sum, a) => sum + (Number(a.score) || 0),
                0
            );

        const overallScore =
            totalQuestions > 0
                ? Math.round(totalScore / totalQuestions)
                : 0;


        // ======================================================
        // OVERALL LEVEL
        // ======================================================

        let overallLevel = 'Needs Improvement';

        if (overallScore >= 75) {
            overallLevel = 'Good Understanding';
        }
        else if (overallScore >= 50) {
            overallLevel = 'Average Understanding';
        }


        // ======================================================
        // WEAK TOPICS
        // ======================================================

        const weakTopics = [
            ...new Set(
                scored
                    .filter(
                        a =>
                            a.level === 'Low' ||
                            a.level === 'Average'
                    )
                    .map(a => a.topic)
                    .filter(Boolean)
            )
        ];


        // ======================================================
        // LEARNING RESOURCES
        // ======================================================

        const learningResources = [];

        scored.forEach(a => {

            if (
                (a.level === 'Low' ||
                    a.level === 'Average') &&
                a.topic
            ) {

                learningResources.push({
                    topic: a.topic,

                    notes:
                        a.notes ||
                        a.feedback ||
                        `Review the important concepts of ${a.topic}.`,

                    importantPoints:
                        a.importantPoints || [],

                    youtubeSearch:
                        a.youtubeSearch ||
                        `${a.topic} complete tutorial for beginners`
                });
            }
        });


        // Remove duplicate resources

        const uniqueResources = [];

        const resourceTopics = new Set();

        learningResources.forEach(resource => {

            if (!resourceTopics.has(resource.topic)) {

                resourceTopics.add(resource.topic);

                uniqueResources.push(resource);
            }
        });


        // ======================================================
        // OVERALL RECOMMENDATION
        // ======================================================

        let recommendation = '';

        if (overallLevel === 'Good Understanding') {

            recommendation =
                `Great work! You have demonstrated good overall understanding of ${form.subject}. Continue practicing and focus on strengthening the few areas where your confidence or answers were weaker.`;
        }

        else if (overallLevel === 'Average Understanding') {

            recommendation =
                `You have a basic understanding of ${form.subject}, but some concepts need more practice. Focus on the weak topics, review the recommended resources, and attempt similar questions again.`;
        }

        else {

            recommendation =
                `You need more practice in ${form.subject}. Start with the basic concepts, review the recommended learning resources, and practice questions topic by topic before attempting another assessment.`;
        }


        // ======================================================
        // SAVE RESPONSE
        // ======================================================

        const response =
            await Response.create({

                form: form._id,

                studentName:
                    studentName || 'Anonymous',

                rollNo:
                    rollNo || '',

                answers: scored,

                recommendation,

                overallScore,

                overallLevel
            });


        // ======================================================
        // SEND RESULT TO FRONTEND
        // ======================================================

        res.json({

            message:
                'Submitted successfully!',

            score: {

                total:
                    totalQuestions,

                correct:
                    scored.filter(
                        a => a.isCorrect === true
                    ).length,

                wrong:
                    scored.filter(
                        a => a.isCorrect === false
                    ).length,

                percentage:
                    overallScore
            },

            overallScore,

            overallLevel,

            answers: scored,

            weakTopics,

            recommendation,

            learningResources:
                uniqueResources,

            responseId:
                response._id
        });

    }

    catch (err) {

        console.error(
            'Submit response error:',
            err
        );

        res.status(500).json({
            message: err.message
        });
    }
});


// ======================================================
// GET ALL RESPONSES FOR FACULTY
// ======================================================

router.get(
    '/form/:formId',
    auth,
    async (req, res) => {

        try {

            const form =
                await Form.findOne({
                    _id: req.params.formId,
                    faculty: req.faculty.id
                });

            if (!form) {

                return res.status(403).json({
                    message: 'Unauthorized'
                });
            }

            const responses =
                await Response.find({
                    form: req.params.formId
                })
                    .sort({
                        submittedAt: -1
                    });

            res.json(responses);

        }

        catch (err) {

            res.status(500).json({
                message: err.message
            });
        }
    }
);


module.exports = router;