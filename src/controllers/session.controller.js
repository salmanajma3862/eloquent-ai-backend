import Session from '../models/sessionModel.js';

// @desc    Get all sessions for the authenticated user
// @route   GET /api/sessions
// @access  Private
export const getUserSessions = async (req, res) => {
    try {
        // Find all sessions for the authenticated user
        // Sort by createdAt in descending order (most recent first)
        // Select fields needed for dashboard and progress tracking
        const sessions = await Session.find({ user: req.user._id })
            .select('_id topicText createdAt analysis status audioUrl suggestedAudioUrl')
            .sort({ createdAt: -1 });

        res.status(200).json(sessions);
    } catch (error) {
        console.error('Get user sessions error:', error);
        res.status(500).json({ 
            message: 'Failed to retrieve sessions. Please try again later.' 
        });
    }
};
