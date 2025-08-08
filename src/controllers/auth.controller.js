import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/userModel.js';
import { generateToken } from '../utils/generateToken.js';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/error.util.js';

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
                code: 'SIGNUP_IP_LIMIT',
                message: "Account creation limit for this network has been reached."
            });
        }
        // ------------------------------------

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ code: 'USER_EXISTS', message: 'User already exists' });
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
            // Generate single token
            const token = generateToken(user._id);

            // Set single jwt cookie
            res.cookie('jwt', token, { // Name the cookie 'jwt'
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            // The JSON response now only sends the user info, NOT the tokens.
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                sessionsTaken: user.sessionsTaken,
                sessionsRemaining: user.sessionsRemaining,
                totalSessions: user.totalSessions,
            });
        } else {
            res.status(400).json({ code: 'INVALID_USER_DATA', message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Register user error:', error);
        return sendError(res, error, { context: 'db' });
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

            // Generate single token
            const token = generateToken(user._id);

            res.cookie('jwt', token, { // Name the cookie 'jwt'
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            // The JSON response now only sends the user info, NOT the tokens.
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                sessionsTaken: user.sessionsTaken,
                sessionsRemaining: user.sessionsRemaining,
                totalSessions: user.totalSessions,
            });
        } else {
            res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login user error:', error);
        return sendError(res, error);
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

            // Generate single token
            const token = generateToken(user._id);

            res.cookie('jwt', token, { // Name the cookie 'jwt'
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            // The JSON response now only sends the user info, NOT the tokens.
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                sessionsTaken: user.sessionsTaken,
                sessionsRemaining: user.sessionsRemaining,
                totalSessions: user.totalSessions,
            });
        } else {
            // --- IP-BASED ABUSE PREVENTION FOR GOOGLE SIGN-UP ---
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const existingAccountsFromIp = await User.countDocuments({ signupIpAddress: ipAddress });
            const IP_LIMIT = 2;

            if (existingAccountsFromIp >= IP_LIMIT) {
                return res.status(403).json({
                    code: 'SIGNUP_IP_LIMIT',
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

            // Generate single token
            const token = generateToken(user._id);

            res.cookie('jwt', token, { // Name the cookie 'jwt'
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            // The JSON response now only sends the user info, NOT the tokens.
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                sessionsTaken: user.sessionsTaken,
                sessionsRemaining: user.sessionsRemaining,
                totalSessions: user.totalSessions,
            });
        }
    } catch (error) {
        console.error('Google login error:', error);
        return sendError(res, error);
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
            sessionsTaken: user.sessionsTaken,
            sessionsRemaining: user.sessionsRemaining,
            totalSessions: user.totalSessions,
        });
    } catch (error) {
    console.error('Get user profile error:', error);
    return sendError(res, error);
    }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
    try {
        // Clear the jwt cookie
        res.cookie('jwt', '', { // Clear the cookie
            httpOnly: true,
            expires: new Date(0)
        });
        res.status(200).json({ message: 'User logged out' });
    } catch (error) {
    console.error('Logout error:', error);
    return sendError(res, error);
    }
};

export { registerUser, loginUser, googleLogin, getMe, logoutUser };
