import express from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import authMiddleware from '../middleware/auth.middleware.js';
import { handleValidationErrors, validateFileUpload } from '../middleware/validation.middleware.js';
import { getTestTopic, createTestSession, transcribePrerecorded } from '../controllers/test.controller.js';
import { getDeepgramToken, getPresignedR2Url } from '../controllers/services.controller.js';

const router = express.Router();

// Configure multer for in-memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        fieldSize: 1024 * 1024 // 1MB field size limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow audio files
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    }
});

// --- NEW: Validation Chains ---
const transcribeValidation = [
    body('topicText')
        .notEmpty()
        .withMessage('Topic text is required')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Topic text must be between 10 and 1000 characters')
        .trim()
        .escape(),
    body('durationInSeconds')
        .isInt({ min: 1, max: 300 })
        .withMessage('Duration must be a valid number between 1 and 300 seconds')
        .toInt()
];

const createSessionValidation = [
    body('topicText')
        .notEmpty()
        .withMessage('Topic text is required')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Topic text must be between 10 and 1000 characters')
        .trim()
        .escape()
];
// ---------------------------

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
// @desc    Transcribe uploaded audio file and create session (CEO's new strategy)
// @access  Private
router.post(
  '/transcribe',
  authMiddleware,
  upload.single('audio'), // 1. Multer runs first to parse the form and file
  transcribeValidation,   // 2. Validation runs second on the now-populated req.body
  handleValidationErrors, // 3. The error handler runs third
  validateFileUpload,     // 4. Additional file validation
  transcribePrerecorded   // 5. The controller runs last
);

// @route   POST /api/test/session
// @desc    Create a new test session with results
// @access  Private
router.post('/session', createSessionValidation, handleValidationErrors, createTestSession);

export default router;
