import express from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, googleLogin, getMe, logoutUser } from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// --- NEW: Validation Chains ---
const registerValidation = [
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .trim()
        .escape(),
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email must not exceed 100 characters'),
    body('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Password must be between 6 and 128 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email must not exceed 100 characters'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ max: 128 })
        .withMessage('Password must not exceed 128 characters')
];

const googleLoginValidation = [
    body('credential')
        .notEmpty()
        .withMessage('Google credential is required')
        .isLength({ max: 2048 })
        .withMessage('Invalid credential format')
];
// ----------------------------

// @route   POST /api/auth/register
router.post('/register', registerValidation, handleValidationErrors, registerUser);

// @route   POST /api/auth/login
router.post('/login', loginValidation, handleValidationErrors, loginUser);

// @route   POST /api/auth/google
router.post('/google', googleLoginValidation, handleValidationErrors, googleLogin);

// @route   GET /api/auth/me
router.get('/me', authMiddleware, getMe);

// @route   POST /api/auth/logout
router.post('/logout', logoutUser);

export default router;
