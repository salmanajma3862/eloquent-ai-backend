import Session from '../models/sessionModel.js';
import { sendError } from '../utils/error.util.js';

// @desc    Get all sessions for the authenticated user
// @route   GET /api/sessions
// @access  Private
export const getUserSessions = async (req, res) => {
    try {
        // Find all sessions for the authenticated user
        // Sort by createdAt in descending order (most recent first)
        // Select fields needed for dashboard and progress tracking
        const sessions = await Session.find({ user: req.user._id })
            .select('_id user topicText audioUrl durationInSeconds transcribedText analysis status createdAt updatedAt suggestedAudioUrl')
            .sort({ createdAt: -1 });

        res.status(200).json(sessions);
    } catch (error) {
        console.error('Get user sessions error:', error);
        return sendError(res, error, { context: 'db' });
    }
};
