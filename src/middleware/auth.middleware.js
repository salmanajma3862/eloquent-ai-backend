import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Session from '../models/sessionModel.js';

// @desc    Protect routes - verify JWT token and attach user to request
// @access  Private
const authMiddleware = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                // Get token from header (format: "Bearer TOKEN")
                token = req.headers.authorization.split(' ')[1];

                // Verify token
                const decoded = jwt.verify(token, process.env.AUTH_SECRET);

                // Get user from token payload (excluding password)
                const user = await User.findById(decoded.id).select('-password');

                if (!user) {
                    return res.status(401).json({ message: 'User not found' });
                }

                // --- JUST-IN-TIME RESET LOGIC ---
                const isFreeUser = user.subscription?.plan === 'free';
                const hasUsedAllTests = user.totalSessions >= 3;

                if (isFreeUser && hasUsedAllTests) {
                    // Find the user's most recent session
                    const lastSession = await Session.findOne({ user: user._id })
                        .sort({ createdAt: -1 })
                        .select('createdAt');

                    if (lastSession) {
                        const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
                        const timeSinceLastSession = new Date().getTime() - lastSession.createdAt.getTime();

                        if (timeSinceLastSession > sevenDaysInMillis) {
                            console.log(`Resetting session count for user: ${user.email}`);
                            user.totalSessions = 0;
                            await user.save();
                        }
                    }
                }

                // Re-assign the potentially updated user object to the request
                req.user = user;
                next();
            } catch (error) {
                console.error('Token verification error:', error);
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Server error in authentication' });
    }
};

export default authMiddleware;
