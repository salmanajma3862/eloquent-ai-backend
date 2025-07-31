import express from 'express';
import { param } from 'express-validator';
import { generateAndStreamAudio } from '../controllers/tts.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// --- NEW: Validation Chain ---
const sessionIdValidation = [
    param('sessionId')
        .isMongoId()
        .withMessage('Invalid session ID format')
];
// ---------------------------

router.get('/:sessionId', authMiddleware, sessionIdValidation, handleValidationErrors, generateAndStreamAudio);

export default router;
