import express from 'express';
import { param } from 'express-validator';
import { getAnalysis } from '../controllers/analysis.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// --- NEW: Validation Chain ---
const sessionIdValidation = [
    param('sessionId')
        .isMongoId()
        .withMessage('Invalid session ID format')
];
// ---------------------------

// @route   GET /api/analysis/:sessionId
// @desc    Get AI analysis for a specific session
// @access  Private
router.get('/:sessionId', sessionIdValidation, handleValidationErrors, getAnalysis);

export default router;
