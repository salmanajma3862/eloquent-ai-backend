import express from 'express';
import { registerUser, loginUser, googleLogin, getMe } from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   POST /api/auth/register
router.post('/register', registerUser);

// @route   POST /api/auth/login
router.post('/login', loginUser);

// @route   POST /api/auth/google
router.post('/google', googleLogin);

// @route   GET /api/auth/me
router.get('/me', authMiddleware, getMe);

export default router;
