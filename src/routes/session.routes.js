import express from 'express';
import { getUserSessions } from '../controllers/session.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// @route   GET /api/sessions
// @desc    Get all sessions for the authenticated user
// @access  Private
router.get('/', getUserSessions);

export default router;
