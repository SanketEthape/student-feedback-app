const { GoogleGenerativeAI } = require('@google/generative-ai');
const { decrypt } = require('./encryption');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Form = require('../models/Form');

/**
 * Checks a response for any descriptive answers marked 'Not Evaluated'
 * and evaluates them using student's key (if available) or teacher's key.
 * Updates the response in MongoDB so past submissions are automatically healed.
 */
async function autoEvaluatePendingAnswers(response) {
    if (!response || !Array.isArray(response.answers)) return response;

    const pendingAnswers = response.answers.filter(
        a => a.questionType === 'text' && a.level === 'Not Evaluated' && a.answer && a.answer.trim().length > 0
    );

    if (pendingAnswers.length === 0) return response;

    // Fetch form with questions and faculty
    const formId = response.form?._id || response.form;
    const form = await Form.findById(formId).populate('faculty', 'name department geminiApiKey');
    if (!form) return response;

    // Determine API key (student first, then faculty)
    let model = null;
    if (response.student) {
        const studentId = response.student?._id || response.student;
        const student = await Student.findById(studentId).select('geminiApiKey');
        if (student?.geminiApiKey) {
            const dec = decrypt(student.geminiApiKey);
            if (dec) {
                try {
                    const genAI = new GoogleGenerativeAI(dec);
                    model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
                } catch (e) {
                    console.warn('Student Gemini key failed:', e.message);
                }
            }
        }
    }

    if (!model && form.faculty?.geminiApiKey) {
        const dec = decrypt(form.faculty.geminiApiKey);
        if (dec) {
            try {
                const genAI = new GoogleGenerativeAI(dec);
                model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
            } catch (e) {
                console.warn('Faculty Gemini key failed:', e.message);
            }
        }
    }

    if (!model) return response; // No key available

    let modified = false;

    for (const a of pendingAnswers) {
        const formQ = form.questions.id(a.questionId) || form.questions.find(q => q.question === a.question);
        try {
            const prompt = `
You are an expert educational evaluator.
Evaluate the following student's descriptive answer.

Subject: ${form.subject}
Topic: ${a.topic || formQ?.topic || ''}
Question: ${a.question || formQ?.question || ''}
Expected Answer: ${formQ?.expectedAnswer || formQ?.explanation || 'Evaluate based on correctness and relevance.'}
Student Answer: ${a.answer}

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

Return ONLY valid JSON:
{
    "score": 0,
    "level": "Low",
    "feedback": "Short feedback",
    "missingPoints": ["Point 1", "Point 2"],
    "importantPoints": ["Point 1", "Point 2", "Point 3"],
    "action": "Action recommendation"
}
`;
            const result = await model.generateContent(prompt);
            const aiText = result.response.text().replace(/```json|```/g, '').trim();
            const evaluation = JSON.parse(aiText);

            const score = Math.max(0, Math.min(10, Number(evaluation.score) || 0));
            a.score = score * 10;
            a.level = score <= 4 ? 'Low' : score <= 7 ? 'Average' : 'Good';
            a.feedback = evaluation.feedback || '';
            a.missingPoints = Array.isArray(evaluation.missingPoints) ? evaluation.missingPoints : [];
            a.importantPoints = Array.isArray(evaluation.importantPoints) ? evaluation.importantPoints : [];
            a.action = evaluation.action || '';
            if (a.level === 'Average') {
                a.notes = `Revise ${a.topic} and practice more descriptive questions.`;
            }
            modified = true;
        } catch (err) {
            console.error('Auto-evaluate error for question:', err.message);
        }
    }

    if (modified) {
        const totalScore = response.answers.reduce((sum, ans) => sum + (Number(ans.score) || 0), 0);
        response.overallScore = response.answers.length > 0 ? Math.round(totalScore / response.answers.length) : 0;
        if (response.overallScore >= 75) {
            response.overallLevel = 'Good Understanding';
        } else if (response.overallScore >= 50) {
            response.overallLevel = 'Average Understanding';
        } else {
            response.overallLevel = 'Needs Improvement';
        }
        await response.save();
        console.log(`Auto-evaluated and updated response ${response._id}. New score: ${response.overallScore}% (${response.overallLevel})`);
    }

    return response;
}

module.exports = { autoEvaluatePendingAnswers };
