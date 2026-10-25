const router = require('express').Router();
const auth = require('../middleware/auth');
const studentAuth = require('../middleware/studentAuth');
const optionalStudentAuth = require('../middleware/optionalStudentAuth');
const Form = require('../models/Form');
const Response = require('../models/Response');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { decrypt } = require('../utils/encryption');
const { autoEvaluatePendingAnswers } = require('../utils/evaluateDescriptive');

/**
 * Generates an AI Unit Study Plan & Diagnostic with estimated study hours for weak topics.
 * Exclusively powered by the student's personal Gemini API key.
 */
async function generateUnitStudyPlan(studentModel, form, scoredAnswers, overallScore, overallLevel) {
    if (!studentModel || !Array.isArray(scoredAnswers)) return null;

    try {
        const topicMap = {};
        scoredAnswers.forEach(a => {
            const topic = a.topic && a.topic.trim() ? a.topic.trim() : 'General';
            if (!topicMap[topic]) {
                topicMap[topic] = { total: 0, scoreSum: 0 };
            }
            topicMap[topic].total++;
            topicMap[topic].scoreSum += (Number(a.score) || 0);
        });

        const topicStats = Object.entries(topicMap).map(([topic, stat]) => ({
            topic,
            avgScore: stat.total > 0 ? Math.round(stat.scoreSum / stat.total) : 0
        }));

        const strongTopics = topicStats.filter(t => t.avgScore >= 60).map(t => t.topic);
        const weakTopics = topicStats.filter(t => t.avgScore < 60).map(t => ({
            topic: t.topic,
            avgScore: t.avgScore
        }));

        const unitName = form.unit || form.title || 'this unit';
        const prompt = `
You are an expert college academic tutor evaluating a student's assessment performance in "${form.subject}" for the unit "${unitName}".
Overall Unit Understanding: ${overallScore}% (${overallLevel})

Topic-by-topic Performance in this Unit:
${topicStats.map(t => `- "${t.topic}": ${t.avgScore}% accuracy`).join('\n')}

Strong Topics (>= 60%): ${strongTopics.join(', ') || 'None identified yet'}
Weak Topics (< 60%): ${weakTopics.map(w => `"${w.topic}" (${w.avgScore}%)`).join(', ') || 'None identified'}

Instructions:
1. Provide a concise 2-sentence summary of the student's understanding of "${unitName}".
2. Identify their strongest areas in this unit.
3. For each weak topic (or all topics if none are weak), calculate realistic study hours (e.g. 0.5, 1.0, 1.5, 2.0 hrs) needed to achieve mastery, based on their score gap.
4. Give 1 practical, concrete revision action for each weak topic.
5. Provide the total estimated study hours.

Return ONLY valid JSON matching this exact structure:
{
  "unitSummary": "string",
  "strongTopics": ["topic1"],
  "weakTopics": [
    {
      "topic": "string",
      "estimatedHours": 1.5,
      "advice": "string"
    }
  ],
  "totalEstimatedHours": 2.5
}
`;
        const result = await studentModel.generateContent(prompt);
        const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(text);

        const weakList = Array.isArray(parsed.weakTopics) && parsed.weakTopics.length > 0
            ? parsed.weakTopics
            : weakTopics.map(w => ({
                topic: w.topic,
                estimatedHours: w.avgScore < 40 ? 2 : 1,
                advice: `Review the core concepts and solve practical questions for ${w.topic}.`
            }));

        const totalHours = typeof parsed.totalEstimatedHours === 'number'
            ? parsed.totalEstimatedHours
            : weakList.reduce((sum, w) => sum + (Number(w.estimatedHours) || 1), 0);

        return {
            unitSummary: parsed.unitSummary || `Assessment completed for ${unitName} with ${overallScore}% overall score.`,
            strongTopics: Array.isArray(parsed.strongTopics) ? parsed.strongTopics : strongTopics,
            weakTopics: weakList,
            totalEstimatedHours: Number(totalHours.toFixed(1)),
            generatedAt: new Date()
        };
    } catch (err) {
        console.warn('generateUnitStudyPlan error:', err.message);
        return null;
    }
}


// ======================================================
// CHECK ACCESS & COOLDOWN STATUS (Student Only)
// ======================================================
router.get('/check-access/:link', studentAuth, async (req, res) => {
    try {
        const form = await Form.findOne({ uniqueLink: req.params.link, isActive: true })
            .populate('faculty', 'name department');

        if (!form) {
            return res.status(404).json({
                allowed: false,
                reason: 'not_found',
                message: 'This form does not exist or has been deactivated.'
            });
        }

        const student = await Student.findById(req.student.id);
        if (!student) {
            return res.status(401).json({
                allowed: false,
                reason: 'unauthorized',
                message: 'Student account not found. Please log in.'
            });
        }

        // Check if form is published
        if (!form.isPublished) {
            return res.status(403).json({
                allowed: false,
                reason: 'not_published',
                message: 'This assessment has not been published by the faculty yet.'
            });
        }

        // Check class targeting
        if (form.targetClasses && form.targetClasses.length > 0) {
            if (!form.targetClasses.includes(student.studentClass)) {
                return res.status(403).json({
                    allowed: false,
                    reason: 'class_mismatch',
                    message: `This assessment is restricted to class: ${form.targetClasses.join(', ')}. Your registered class is ${student.studentClass}.`
                });
            }
        }

        // Check division targeting
        if (form.targetDivisions && form.targetDivisions.length > 0) {
            if (!form.targetDivisions.includes(student.division)) {
                return res.status(403).json({
                    allowed: false,
                    reason: 'division_mismatch',
                    message: `This assessment is restricted to division: ${form.targetDivisions.join(', ')}. Your registered division is ${student.division}.`
                });
            }
        }

        // Check branch targeting
        if (form.targetBranches && form.targetBranches.length > 0) {
            if (!form.targetBranches.includes(student.branch)) {
                return res.status(403).json({
                    allowed: false,
                    reason: 'branch_mismatch',
                    message: `This assessment is restricted to branch: ${form.targetBranches.join(', ')}. Your registered branch is ${student.branch || 'Not Specified'}.`
                });
            }
        }

        // Check past submissions & retake cooldown
        const pastResponses = await Response.find({
            form: form._id,
            student: student._id
        }).sort({ submittedAt: -1 });

        let cooldownActive = false;
        let remainingDays = 0;
        let remainingHours = 0;
        let nextAvailableDate = null;

        if (pastResponses.length > 0) {
            const reattemptDays = typeof form.reattemptDays === 'number' ? form.reattemptDays : 0;
            const lastSubmission = pastResponses[0];

            if (reattemptDays === 0) {
                return res.status(403).json({
                    allowed: false,
                    reason: 'single_attempt_completed',
                    message: 'You have already completed this assessment. Re-attempts are not allowed for this form.',
                    lastSubmission: {
                        score: lastSubmission.overallScore,
                        level: lastSubmission.overallLevel,
                        submittedAt: lastSubmission.submittedAt
                    }
                });
            }

            const now = new Date();
            const elapsedMs = now - new Date(lastSubmission.submittedAt);
            const requiredMs = reattemptDays * 24 * 60 * 60 * 1000;

            if (elapsedMs < requiredMs) {
                cooldownActive = true;
                const remainingMs = requiredMs - elapsedMs;
                remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
                remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
                nextAvailableDate = new Date(new Date(lastSubmission.submittedAt).getTime() + requiredMs);

                return res.status(403).json({
                    allowed: false,
                    reason: 'cooldown_active',
                    cooldownActive: true,
                    remainingDays,
                    remainingHours,
                    nextAvailableDate,
                    message: `Cooldown active: You can re-attempt this assessment in ${remainingDays > 1 ? remainingDays + ' days' : remainingHours + ' hours'}.`,
                    lastSubmission: {
                        score: lastSubmission.overallScore,
                        level: lastSubmission.overallLevel,
                        submittedAt: lastSubmission.submittedAt
                    }
                });
            }
        }

        res.json({
            allowed: true,
            form: {
                id: form._id,
                title: form.title,
                subject: form.subject,
                allowAnonymous: form.allowAnonymous,
                reattemptDays: form.reattemptDays,
                facultyName: form.faculty?.name || 'Faculty'
            },
            student: {
                id: student._id,
                name: student.name,
                rollNo: student.rollNo,
                studentClass: student.studentClass,
                division: student.division,
                branch: student.branch || 'Computer Engineering',
                hasApiKey: !!student.geminiApiKey
            },
            attemptNumber: pastResponses.length + 1
        });
    } catch (err) {
        console.error('Check access error:', err);
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// SUBMIT RESPONSE — Mandatory Student Authentication
// ======================================================
router.post('/submit/:link', studentAuth, async (req, res) => {
    try {
        const { answers, isAnonymous: bodyAnonymous } = req.body;

        // --------------------------------------------------
        // FIND FORM
        // --------------------------------------------------
        const form = await Form.findOne({
            uniqueLink: req.params.link,
            isActive: true
        }).populate('faculty', 'name department geminiApiKey');

        if (!form) {
            return res.status(404).json({
                message: 'Form not found or inactive'
            });
        }

        if (!form.isPublished) {
            return res.status(403).json({
                message: 'This assessment has not been published yet.'
            });
        }

        // --------------------------------------------------
        // FETCH VERIFIED STUDENT DETAILS
        // --------------------------------------------------
        const student = await Student.findById(req.student.id);
        if (!student) {
            return res.status(401).json({
                message: 'Student account not found. Please register or log in first.'
            });
        }

        // Class & Division Restriction Verification
        if (form.targetClasses && form.targetClasses.length > 0) {
            if (!form.targetClasses.includes(student.studentClass)) {
                return res.status(403).json({
                    message: `This assessment is restricted to class: ${form.targetClasses.join(', ')}. Your registered class is ${student.studentClass}.`
                });
            }
        }

        if (form.targetDivisions && form.targetDivisions.length > 0) {
            if (!form.targetDivisions.includes(student.division)) {
                return res.status(403).json({
                    message: `This assessment is restricted to division: ${form.targetDivisions.join(', ')}. Your registered division is ${student.division}.`
                });
            }
        }

        if (form.targetBranches && form.targetBranches.length > 0) {
            if (!form.targetBranches.includes(student.branch)) {
                return res.status(403).json({
                    message: `This assessment is restricted to branch: ${form.targetBranches.join(', ')}. Your registered branch is ${student.branch || 'Not Specified'}.`
                });
            }
        }

        // Reattempt Cooldown Verification
        const pastResponses = await Response.find({
            form: form._id,
            student: student._id
        }).sort({ submittedAt: -1 });

        const attemptNumber = pastResponses.length + 1;

        if (pastResponses.length > 0) {
            const reattemptDays = typeof form.reattemptDays === 'number' ? form.reattemptDays : 0;
            const lastSubmission = pastResponses[0];

            if (reattemptDays === 0) {
                return res.status(403).json({
                    message: 'You have already completed this assessment. Re-attempts are not allowed for this form.'
                });
            }

            const now = new Date();
            const elapsedMs = now - new Date(lastSubmission.submittedAt);
            const requiredMs = reattemptDays * 24 * 60 * 60 * 1000;

            if (elapsedMs < requiredMs) {
                const remainingMs = requiredMs - elapsedMs;
                const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
                const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
                return res.status(403).json({
                    message: `Cooldown active: You can re-attempt this form in ${remainingDays > 1 ? remainingDays + ' days' : remainingHours + ' hours'}.`
                });
            }
        }

        // Anonymity Handling
        // If form.allowAnonymous is true, response is submitted anonymously to faculty.
        // If form.allowAnonymous is false, anonymous submissions are rejected if requested.
        const wantsAnonymous = !!bodyAnonymous;
        if (wantsAnonymous && !form.allowAnonymous) {
            return res.status(400).json({
                message: 'Anonymous submissions are not allowed for this assessment.'
            });
        }

        const isAnonymous = !!form.allowAnonymous || wantsAnonymous;
        const studentName = isAnonymous ? 'Anonymous Student' : (student.name || 'Anonymous Student');
        const rollNo = isAnonymous ? 'Hidden' : (student.rollNo || '');

        // --------------------------------------------------
        // GEMINI SETUP FOR DESCRIPTIVE QUESTIONS ONLY
        // 1. Primary: Student's own Gemini API key (saves faculty quota)
        // 2. Fallback: Teacher's (Faculty's) Gemini API key (ensures descriptive answers are evaluated if student has not entered theirs)
        // Note: Used ONLY for evaluating student's descriptive questions!
        // --------------------------------------------------
        let model = null;
        let aiKeySource = 'none';

        if (student.geminiApiKey) {
            const decryptedStudentKey = decrypt(student.geminiApiKey);
            if (decryptedStudentKey) {
                try {
                    const genAI = new GoogleGenerativeAI(decryptedStudentKey);
                    model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
                    aiKeySource = 'student';
                } catch (e) {
                    console.warn('Student Gemini API key initialization failed:', e.message);
                    model = null;
                }
            }
        }

        // If student does not have an API key, fallback to teacher's Gemini key for descriptive questions
        if (!model) {
            let facultyKey = form.faculty?.geminiApiKey;
            if (!facultyKey && form.faculty?._id) {
                const facDoc = await Faculty.findById(form.faculty._id).select('geminiApiKey');
                facultyKey = facDoc?.geminiApiKey;
            }
            if (facultyKey) {
                const decryptedFacultyKey = decrypt(facultyKey);
                if (decryptedFacultyKey) {
                    try {
                        const genAI = new GoogleGenerativeAI(decryptedFacultyKey);
                        model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
                        aiKeySource = 'faculty';
                    } catch (e) {
                        console.warn('Faculty Gemini API key initialization failed:', e.message);
                        model = null;
                    }
                }
            }
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
                        'AI evaluation is unavailable. Add your Gemini API key in your profile for personalised evaluation.';
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
                // Check if faculty provided a recommended video link for this topic
                const matchedTopicResource = (form.topicResources || []).find(
                    tr => tr.topic && tr.topic.trim().toLowerCase() === a.topic.trim().toLowerCase()
                );
                const facultyVideoUrl = matchedTopicResource?.videoUrl?.trim() || '';

                learningResources.push({
                    topic: a.topic,

                    notes:
                        a.notes ||
                        a.feedback ||
                        `Review the important concepts of ${a.topic}.`,

                    importantPoints:
                        a.importantPoints || [],

                    videoUrl: facultyVideoUrl
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
        // OVERALL RECOMMENDATION (disabled - no unnecessary text/tokens)
        // ======================================================

        const recommendation = '';

        // ======================================================
        // AI UNIT STUDY PLAN & ESTIMATED STUDY HOURS
        // (Exclusively generated when student has configured their personal Gemini API key)
        // ======================================================
        let aiStudyPlan = null;
        if (aiKeySource === 'student' && model) {
            aiStudyPlan = await generateUnitStudyPlan(model, form, scored, overallScore, overallLevel);
        }

        // ======================================================
        // SAVE RESPONSE (linked to student account)
        // ======================================================

        const response =
            await Response.create({

                form: form._id,

                student: student ? student._id : null,

                studentName,

                rollNo,

                isAnonymous,

                attemptNumber,

                answers: scored,

                recommendation,

                overallScore,

                overallLevel,

                aiStudyPlan
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

            isAnonymous,

            attemptNumber,

            answers: scored,

            weakTopics,

            recommendation,

            aiStudyPlan,

            learningResources:
                uniqueResources,

            responseId:
                response._id,

            hasStudentApiKey: aiKeySource === 'student',

            apiKeyNotice: aiKeySource !== 'student'
                ? '💡 Add your personal Gemini API key in Student Dashboard Settings to unlock AI Unit Study Plans, study hour estimations, and interactive practice questions on weak topics.'
                : ''
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
// GET STUDENT'S OWN RESPONSE HISTORY
// ======================================================

router.get('/my-responses', studentAuth, async (req, res) => {
    try {
        const responses = await Response.find({ student: req.student.id })
            .sort({ submittedAt: -1 })
            .populate({
                path: 'form',
                select: 'title subject unit topicResources questions faculty',
                populate: {
                    path: 'faculty',
                    select: 'name department geminiApiKey'
                }
            });

        // Auto-evaluate any pending unevaluated descriptive answers
        for (const r of responses) {
            await autoEvaluatePendingAnswers(r);
        }

        res.json(responses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// GET SINGLE RESPONSE BY ID (student's own)
// ======================================================

router.get('/my-responses/:id', studentAuth, async (req, res) => {
    try {
        const response = await Response.findOne({
            _id: req.params.id,
            student: req.student.id
        }).populate({
            path: 'form',
            select: 'title subject unit topicResources questions faculty',
            populate: {
                path: 'faculty',
                select: 'name department geminiApiKey'
            }
        });

        if (!response) {
            return res.status(404).json({ message: 'Response not found' });
        }

        await autoEvaluatePendingAnswers(response);

        res.json(response);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// GENERATE / REGENERATE AI UNIT STUDY PLAN ON DEMAND (student's own)
// Requires student's personal Gemini API key
// ======================================================
router.post('/my-responses/:id/study-plan', studentAuth, async (req, res) => {
    try {
        const student = await Student.findById(req.student.id);
        if (!student || !student.geminiApiKey) {
            return res.status(403).json({
                message: 'Personal Gemini API key required. Please configure your key in Dashboard Settings to unlock AI unit study plans.'
            });
        }

        const decKey = decrypt(student.geminiApiKey);
        if (!decKey) {
            return res.status(400).json({ message: 'Invalid or corrupted Gemini API key.' });
        }

        const genAI = new GoogleGenerativeAI(decKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

        const response = await Response.findOne({
            _id: req.params.id,
            student: req.student.id
        }).populate('form');

        if (!response) {
            return res.status(404).json({ message: 'Response not found' });
        }

        const studyPlan = await generateUnitStudyPlan(
            model,
            response.form,
            response.answers,
            response.overallScore,
            response.overallLevel
        );

        if (!studyPlan) {
            return res.status(500).json({ message: 'Failed to generate study plan. Please verify your Gemini API key.' });
        }

        response.aiStudyPlan = studyPlan;
        await response.save();

        res.json({
            message: 'Study plan generated successfully!',
            aiStudyPlan: studyPlan
        });
    } catch (err) {
        console.error('Study plan generation error:', err);
        res.status(500).json({ message: err.message });
    }
});


// ======================================================
// GENERATE 3 TARGETED PRACTICE MCQs ON WEAK TOPIC (student only)
// Requires student's personal Gemini API key
// ======================================================
router.post('/practice-questions', studentAuth, async (req, res) => {
    try {
        const { topic, subject, unit } = req.body;
        if (!topic || !String(topic).trim()) {
            return res.status(400).json({ message: 'Topic is required to generate practice questions' });
        }

        const student = await Student.findById(req.student.id);
        if (!student || !student.geminiApiKey) {
            return res.status(403).json({
                message: 'Personal Gemini API key required. Add your free Gemini API key in Student Dashboard Settings to unlock targeted AI practice questions.'
            });
        }

        const decKey = decrypt(student.geminiApiKey);
        if (!decKey) {
            return res.status(400).json({ message: 'Invalid or corrupted Gemini API key.' });
        }

        const genAI = new GoogleGenerativeAI(decKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

        const cleanTopic = String(topic).trim();
        const prompt = `
You are an expert university professor creating practice exercises for undergraduate engineering students.
Subject: ${subject || 'Engineering'}
Unit: ${unit || 'Curriculum Unit'}
Topic to strengthen: "${cleanTopic}"

Generate exactly 3 educational multiple-choice practice questions (MCQs) designed specifically to test and reinforce conceptual understanding of "${cleanTopic}".
For each question:
- Make the question clear, engaging, and directly focused on ${cleanTopic}.
- Provide exactly 4 options.
- Indicate the 0-based index of the correct option (0, 1, 2, or 3).
- Provide a clear, educational explanation of why the correct answer is right and common pitfalls to avoid.
- Provide a 1-sentence "keyTakeaway".

Return ONLY valid JSON matching this exact structure:
{
  "topic": "${cleanTopic}",
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctIndex": 0,
      "explanation": "string",
      "keyTakeaway": "string"
    }
  ]
}
`;
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
            return res.status(500).json({ message: 'AI returned an invalid question format. Please try again.' });
        }

        res.json({
            topic: cleanTopic,
            subject: subject || '',
            unit: unit || '',
            questions: parsed.questions
        });
    } catch (err) {
        console.error('Practice questions error:', err);
        res.status(500).json({ message: err.message || 'Failed to generate practice questions' });
    }
});


// ======================================================
// GET ALL RESPONSES FOR FACULTY (faculty protected)
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

            for (const r of responses) {
                await autoEvaluatePendingAnswers(r);
            }

            // Enforce anonymity policy:
            // When form.allowAnonymous is true, student identity (Name & Roll No) MUST be hidden from faculty.
            // Student identity is revealed if and only if form.allowAnonymous is false.
            const sanitizedResponses = responses.map(r => {
                const doc = r.toObject ? r.toObject() : { ...r };
                // Strip recommendations from faculty response view
                doc.recommendation = '';
                if (form.allowAnonymous || doc.isAnonymous) {
                    doc.studentName = 'Anonymous Student';
                    doc.rollNo = '';
                    doc.student = null;
                    doc.isAnonymous = true;
                }
                return doc;
            });

            res.json(sanitizedResponses);

        }

        catch (err) {

            res.status(500).json({
                message: err.message
            });
        }
    }
);


module.exports = router;