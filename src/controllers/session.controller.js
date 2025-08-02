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
            .select('_id user topicText audioUrl durationInSeconds transcribedText analysis status createdAt updatedAt suggestedAudioUrl')
            .sort({ createdAt: -1 });

        res.status(200).json(sessions);
    } catch (error) {
        // Step 1: Always log the full, detailed error for our internal debugging.
        console.error('Get user sessions error:', error);

        // --- NEW: Sanitize the response sent to the user ---
        const isProduction = process.env.NODE_ENV === 'production';
        const errorMessage = isProduction
            ? "We're sorry, an unexpected error occurred. Please try again later."
            : 'Failed to retrieve sessions. Please try again later.'; // Only show detailed messages in development

        // Step 2: Send a generic, safe message in production.
        res.status(500).json({ message: errorMessage });
        // ---------------------------------------------
    }
};
