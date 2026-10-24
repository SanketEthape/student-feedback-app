const router = require('express').Router();
const auth = require('../middleware/auth');
const Form = require('../models/Form');
const Response = require('../models/Response');
const Faculty = require('../models/Faculty');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { decrypt } = require('../utils/encryption');

router.get('/form/:formId', auth, async (req, res) => {
    try {
        const form = await Form.findOne({ _id: req.params.formId, faculty: req.faculty.id });
        if (!form) return res.status(403).json({ message: 'Unauthorized' });

        const responses = await Response.find({ form: req.params.formId });
        if (responses.length === 0) {
            return res.json({
                totalResponses: 0,
                summary: {},
                aiInsight: 'No student responses received yet.',
                classSummary: 'No student responses received yet.',
                topicStats: [],
                topicInsights: [],
                mostUnderstoodTopic: null,
                lowestUnderstoodTopic: null,
                topicResources: form.topicResources || []
            });
        }

        // ==================================================
        // Multi-Type Per-Topic Understanding Calculation
        // ==================================================
        const topicMap = {};
        responses.forEach(r => {
            r.answers.forEach(a => {
                const topicName = (a.topic && a.topic.trim()) ? a.topic.trim() : 'General';
                if (!topicMap[topicName]) {
                    topicMap[topicName] = {
                        totalAnswers: 0,
                        totalScore: 0,
                        correct: 0,
                        wrong: 0,
                        mcqCount: 0
                    };
                }
                const scoreVal = typeof a.score === 'number' ? a.score : (a.isCorrect ? 100 : 0);
                topicMap[topicName].totalScore += scoreVal;
                topicMap[topicName].totalAnswers++;

                if (a.questionType === 'mcq') {
                    topicMap[topicName].mcqCount++;
                    if (a.isCorrect === true) topicMap[topicName].correct++;
                    else if (a.isCorrect === false) topicMap[topicName].wrong++;
                }
            });
        });

        const topicStats = Object.entries(topicMap).map(([topic, s]) => {
            const avgPct = s.totalAnswers > 0 ? Math.round(s.totalScore / s.totalAnswers) : 0;
            let level = 'Average Understanding';
            if (avgPct >= 75) level = 'Good Understanding';
            else if (avgPct < 50) level = 'Needs Improvement';

            const matchedResource = (form.topicResources || []).find(
                tr => tr.topic && tr.topic.trim().toLowerCase() === topic.toLowerCase()
            );

            return {
                topic,
                avgScore: avgPct,
                pct: avgPct, // for compatibility with recharts
                totalAnswers: s.totalAnswers,
                correct: s.correct,
                wrong: s.wrong,
                mcqCount: s.mcqCount,
                level,
                videoUrl: matchedResource?.videoUrl || ''
            };
        });

        // ==================================================
        // Most & Lowest Understood Topics
        // ==================================================
        let mostUnderstoodTopic = null;
        let lowestUnderstoodTopic = null;

        if (topicStats.length > 0) {
            const sorted = [...topicStats].sort((a, b) => b.avgScore - a.avgScore);
            mostUnderstoodTopic = sorted[0];
            lowestUnderstoodTopic = sorted[sorted.length - 1];
        }

        // ==================================================
        // Rule-based Fallback Topic Insights & Solutions
        // ==================================================
        const fallbackTopicInsights = topicStats.map(t => {
            let insight = '';
            let solution = '';
            if (t.avgScore >= 75) {
                insight = `Students demonstrated strong grasp of core ${t.topic} principles with consistent accuracy.`;
                solution = `Reinforce with higher-order application challenges and peer-teaching activities.`;
            } else if (t.avgScore >= 50) {
                insight = `Students have foundational grasp of ${t.topic}, but struggle with edge cases and detailed explanations.`;
                solution = `Conduct a 15-minute targeted review focusing on problem-solving drills and common pitfalls.`;
            } else {
                insight = `Critical knowledge gaps detected in ${t.topic}. Students struggled with basic concepts.`;
                solution = `Reteach fundamental principles with visual aids, real-world analogies, and step-by-step demonstrations.`;
            }
            return {
                topic: t.topic,
                understandingLevel: t.level,
                insight,
                solution
            };
        });

        let classSummary = 'Analysis based on student responses across all syllabus topics.';
        let topicInsights = fallbackTopicInsights;

        // ==================================================
        // AI Topic Insights & Solutions using Gemini
        // ==================================================
        const faculty = await Faculty.findById(req.faculty.id);
        const apiKey = faculty?.geminiApiKey ? decrypt(faculty.geminiApiKey) : '';

        if (apiKey && topicStats.length > 0) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

                const prompt = `
You are an expert educational data analyst evaluating class comprehension in "${form.subject}".
Total students evaluated: ${responses.length}

TOPIC PERFORMANCE DATA:
${topicStats.map(t => `- Topic: "${t.topic}" | Average Understanding: ${t.avgScore}% (${t.level}) | Total Responses: ${t.totalAnswers}`).join('\n')}

INSTRUCTIONS:
1. Provide a concise 2-sentence class-wide summary.
2. For EVERY single topic listed above, provide:
   - "topic": exact topic name
   - "understandingLevel": "${topicStats.map(t => t.level).join(' / ')}"
   - "insight": 1-2 sentence diagnosis of why students are at this level or where confusion lies.
   - "solution": 1-2 concrete, actionable teaching solutions or classroom activities the faculty can execute to improve understanding for this specific topic.

Return ONLY valid JSON matching this exact structure:
{
  "classSummary": "string",
  "topicInsights": [
    {
      "topic": "string",
      "understandingLevel": "string",
      "insight": "string",
      "solution": "string"
    }
  ]
}
`;
                const result = await model.generateContent(prompt);
                const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(text);

                if (parsed.classSummary) classSummary = parsed.classSummary;
                if (Array.isArray(parsed.topicInsights) && parsed.topicInsights.length > 0) {
                    // Match and merge
                    topicInsights = topicStats.map(ts => {
                        const found = parsed.topicInsights.find(
                            ti => ti.topic && ti.topic.trim().toLowerCase() === ts.topic.trim().toLowerCase()
                        );
                        if (found) {
                            return {
                                topic: ts.topic,
                                understandingLevel: found.understandingLevel || ts.level,
                                insight: found.insight || '',
                                solution: found.solution || ''
                            };
                        }
                        return fallbackTopicInsights.find(f => f.topic === ts.topic) || {
                            topic: ts.topic,
                            understandingLevel: ts.level,
                            insight: `Students scored ${ts.avgScore}% on ${ts.topic}.`,
                            solution: `Review key concepts of ${ts.topic} in upcoming classes.`
                        };
                    });
                }
            } catch (aiErr) {
                console.warn('Gemini topic insights generation error (using fallback):', aiErr.message);
                // Keep fallbackTopicInsights
            }
        }

        res.json({
            totalResponses: responses.length,
            topicStats,
            mostUnderstoodTopic,
            lowestUnderstoodTopic,
            aiInsight: classSummary, // backward compatibility
            classSummary,
            topicInsights,
            topicResources: form.topicResources || []
        });

    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;