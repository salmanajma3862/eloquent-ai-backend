// src/middleware/validation.middleware.js
import { validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Log validation errors for debugging (include IP for security monitoring)
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        console.log(`Validation errors from IP ${clientIP}:`, errors.array());

        // Return sanitized error response
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction) {
            // In production, return generic error message
            return res.status(400).json({
                message: 'Invalid input data provided. Please check your request and try again.',
                errors: errors.array().map(error => ({
                    field: error.path,
                    message: 'Invalid value provided'
                }))
            });
        } else {
            // In development, return detailed errors
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array()
            });
        }
    }
    next();
};

// Additional security middleware for file uploads
export const validateFileUpload = (req, res, next) => {
    if (req.file) {
        // Check file size (already handled by multer, but double-check)
        if (req.file.size > 50 * 1024 * 1024) { // 50MB
            return res.status(400).json({
                message: 'File size too large. Maximum size is 50MB.'
            });
        }

        // Check file type
        if (!req.file.mimetype.startsWith('audio/')) {
            return res.status(400).json({
                message: 'Invalid file type. Only audio files are allowed.'
            });
        }

        // Check for potentially malicious file names
        const fileName = req.file.originalname;
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            return res.status(400).json({
                message: 'Invalid file name.'
            });
        }
    }
    next();
};
