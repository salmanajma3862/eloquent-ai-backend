import express from 'express';
import { getAnalysis } from '../controllers/analysis.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// @route   GET /api/analysis/:sessionId
// @desc    Get AI analysis for a specific session
// @access  Private
router.get('/:sessionId', getAnalysis);

export default router;
