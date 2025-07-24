import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

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
                req.user = await User.findById(decoded.id).select('-password');

                if (!req.user) {
                    return res.status(401).json({ message: 'User not found' });
                }

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
