import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.middleware.js';
import { getTestTopic, createTestSession, transcribePrerecorded } from '../controllers/test.controller.js';
import { getDeepgramToken, getPresignedR2Url } from '../controllers/services.controller.js';

const router = express.Router();

// Configure multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// @route   GET /api/test/topic
// @desc    Get a random IELTS speaking topic
// @access  Private
router.get('/topic', getTestTopic);

// @route   GET /api/test/deepgram-token
// @desc    Get Deepgram API token for speech recognition
// @access  Private
router.get('/deepgram-token', getDeepgramToken);

// @route   GET /api/test/r2-upload-url
// @desc    Get presigned URL for uploading audio to Cloudflare R2
// @access  Private
router.get('/r2-upload-url', getPresignedR2Url);

// @route   POST /api/test/transcribe
// @desc    Transcribe uploaded audio file using Deepgram prerecorded API
// @access  Private
router.post(
  '/transcribe',
  authMiddleware,
  upload.single('audio'), // Expects a single file on the 'audio' field
  transcribePrerecorded
);

// @route   POST /api/test/session
// @desc    Create a new test session with results
// @access  Private
router.post('/session', createTestSession);

export default router;
