import express from 'express';
import { generateAndStreamAudio } from '../controllers/tts.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/:sessionId', authMiddleware, generateAndStreamAudio);

export default router;
