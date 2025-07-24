import express from 'express';
import { registerUser, loginUser, googleLogin } from '../controllers/auth.controller.js';

const router = express.Router();

// @route   POST /api/auth/register
router.post('/register', registerUser);

// @route   POST /api/auth/login
router.post('/login', loginUser);

// @route   POST /api/auth/google
router.post('/google', googleLogin);

export default router;
