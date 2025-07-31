import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Session from '../models/sessionModel.js';

const authMiddleware = async (req, res, next) => {
    try {
        let token;
        if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        try {
            const decoded = jwt.verify(token, process.env.AUTH_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }
            const isFreeUser = user.subscription?.plan === 'free';
            const hasUsedAllTests = user.totalSessions >= 3;
            if (isFreeUser && hasUsedAllTests) {
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
            req.user = user;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        const isProduction = process.env.NODE_ENV === 'production';
        const errorMessage = isProduction
            ? "We're sorry, an unexpected error occurred. Please try again later."
            : 'Server error in authentication';
        res.status(500).json({ message: errorMessage });
    }
};

export default authMiddleware;
