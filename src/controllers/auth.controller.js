import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // --- NEW IP-BASED ABUSE PREVENTION ---

        // 1. Get the user's IP address from the request.
        // 'req.ip' is a common way, but relying on headers is more robust behind proxies.
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 2. Check how many accounts already exist with this IP.
        const existingAccountsFromIp = await User.countDocuments({ signupIpAddress: ipAddress });

        const IP_LIMIT = 2; // Allow a max of 2 free accounts per IP.

        if (existingAccountsFromIp >= IP_LIMIT) {
            return res.status(403).json({
                message: "Account creation limit for this network has been reached."
            });
        }
        // ------------------------------------

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            signupIpAddress: ipAddress, // Store the IP address
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                totalSessions: user.totalSessions,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            // Update last login
            user.lastLogin = new Date();
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                totalSessions: user.totalSessions,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Google Sign-In
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.AUTH_GOOGLE_ID,
        });

        const payload = ticket.getPayload();
        const { name, email, sub: googleId } = payload;

        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId });

        if (user) {
            // User exists, update last login and return user info
            user.lastLogin = new Date();
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                totalSessions: user.totalSessions,
                token: generateToken(user._id),
            });
        } else {
            // --- IP-BASED ABUSE PREVENTION FOR GOOGLE SIGN-UP ---
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const existingAccountsFromIp = await User.countDocuments({ signupIpAddress: ipAddress });
            const IP_LIMIT = 2;

            if (existingAccountsFromIp >= IP_LIMIT) {
                return res.status(403).json({
                    message: "Account creation limit for this network has been reached."
                });
            }
            // -------------------------------------------------------

            // User doesn't exist, create new user
            user = await User.create({
                name,
                email,
                googleId,
                emailVerified: true, // Google accounts are pre-verified
                signupIpAddress: ipAddress, // Store the IP address
            });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                totalSessions: user.totalSessions,
                token: generateToken(user._id),
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        // User is already attached to req.user by authMiddleware
        const user = req.user;

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            subscription: user.subscription,
            totalSessions: user.totalSessions,
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export { registerUser, loginUser, googleLogin, getMe };
