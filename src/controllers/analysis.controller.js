import Anthropic from '@anthropic-ai/sdk';
import Session from '../models/sessionModel.js';

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// @desc    Get AI analysis for a session
// @route   GET /api/analysis/:sessionId
// @access  Private
export const getAnalysis = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get session from database
        const session = await Session.findById(sessionId);
        
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Check if the session belongs to the authenticated user
        if (session.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to access this session' });
        }

        // Check for existing analysis to save time and API costs
        if (session.analysis) {
            return res.json(session);
        }

        // Check if we have transcribed text to analyze
        if (!session.transcribedText || session.transcribedText.trim() === '') {
            return res.status(400).json({ message: 'No transcribed text available for analysis' });
        }

        // Engineer the prompt for Claude
        const userTranscript = session.transcribedText;

        const prompt = `You are an expert, friendly, and encouraging IELTS examiner. Your task is to analyze the following speech transcript from a student practicing for the IELTS speaking test.

The student's response is:
---
${userTranscript}
---

Please provide a detailed analysis based on the official IELTS band descriptors. Your response MUST be in a structured JSON format. Do not include any text or explanations outside of the JSON object.

The JSON object must have the following structure:
{
  "overallBandScore": <A number between 1 and 9, calculated as the average of the three scores below, rounded to the nearest 0.5>,
  "fluencyAndCoherence": {
    "score": <A number between 1 and 9>,
    "feedback": "<Provide specific, constructive feedback on fluency, coherence, use of discourse markers, and self-correction. Be encouraging.>"
  },
  "lexicalResource": {
    "score": <A number between 1 and 9>,
    "feedback": "<Provide specific, constructive feedback on the range of vocabulary, use of idiomatic language, and word choice. Point out both good usage and areas for improvement.>"
  },
  "grammaticalRangeAndAccuracy": {
    "score": <A number between 1 and 9>,
    "feedback": "<Provide specific, constructive feedback on the variety of grammatical structures, sentence complexity, and accuracy. Identify specific grammatical errors if any.>"
  },
  "improvedText": "<Rewrite the user's original transcript to be a more fluent, natural, and grammatically correct version, as if a Band 9 candidate had said it. Retain the user's core ideas.>"
}`;

        // Call the Claude API
        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }]
        });

        // Extract and parse the JSON response
        const responseText = msg.content[0].text;
        let analysisData;

        try {
            analysisData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse Claude response as JSON:', parseError);
            console.error('Claude response:', responseText);
            return res.status(500).json({ 
                message: 'Failed to parse AI analysis response' 
            });
        }

        // Calculate additional metrics
        const wordCount = userTranscript.trim().split(/\s+/).length;
        const durationInMinutes = session.durationInSeconds / 60;
        const wordsPerMinute = Math.round(wordCount / durationInMinutes);

        // Add calculated metrics to analysis
        analysisData.wordCount = wordCount;
        analysisData.wordsPerMinute = wordsPerMinute;

        // Update the session with the analysis and mark as completed
        session.analysis = analysisData;
        session.status = 'completed';
        await session.save();

        // Return the full session object
        res.json(session);

    } catch (error) {
        console.error('Analysis error:', error);
        
        // Handle specific Anthropic API errors
        if (error.status === 401) {
            return res.status(500).json({ 
                message: 'AI service authentication failed. Please check API configuration.' 
            });
        } else if (error.status === 429) {
            return res.status(429).json({ 
                message: 'AI service rate limit exceeded. Please try again later.' 
            });
        } else if (error.status >= 400 && error.status < 500) {
            return res.status(500).json({ 
                message: 'AI service request failed. Please try again.' 
            });
        }

        res.status(500).json({ 
            message: 'Failed to generate analysis. Please try again later.' 
        });
    }
};
