import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// @desc    Generate temporary Deepgram API key
// @route   GET /api/test/deepgram-token
// @access  Private
export const getDeepgramToken = async (req, res) => {
  try {
    if (!process.env.DEEPGRAM_API_KEY || !process.env.DEEPGRAM_PROJECT_ID) {
      console.error("Deepgram API Key or Project ID is not configured.");
      return res.status(500).json({ message: 'Server configuration error.' });
    }

    const DG_API_KEY = process.env.DEEPGRAM_API_KEY;
    const DG_PROJECT_ID = process.env.DEEPGRAM_PROJECT_ID;

    // The URL for Deepgram's REST API to create a key for a project
    const url = `https://api.deepgram.com/v1/projects/${DG_PROJECT_ID}/keys`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DG_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comment: 'Temporary key for frontend',
        scopes: ['member'],
        timeToLive: 60 // in seconds
      })
    });

    const newKeyData = await response.json();

    if (!response.ok) {
      console.error("Deepgram API returned an error:", newKeyData);
      throw new Error(newKeyData.reason || 'Failed to create Deepgram key');
    }

    // Send the temporary key to the frontend
    res.json({ deepgramToken: newKeyData.key });

  } catch (error) {
    // Step 1: Always log the full, detailed error for our internal debugging.
    console.error("Fatal error in getDeepgramToken (manual fetch):", error);

    // --- NEW: Sanitize the response sent to the user ---
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = isProduction
        ? "We're sorry, an unexpected error occurred. Please try again later."
        : 'Fatal error generating Deepgram token'; // Only show detailed messages in development

    // Step 2: Send a generic, safe message in production.
    res.status(500).json({ message: errorMessage });
    // ---------------------------------------------
  }
};

// @desc    Generate presigned URL for Cloudflare R2 upload
// @route   GET /api/test/r2-upload-url
// @access  Private
const getPresignedR2Url = async (req, res) => {
    try {
        // Validate R2 configuration
        if (!process.env.R2_BUCKET_NAME || !process.env.R2_ACCESS_KEY_ID || 
            !process.env.R2_SECRET_ACCESS_KEY || !process.env.CLOUDFLARE_ACCOUNT_ID) {
            return res.status(500).json({ 
                message: 'R2 configuration incomplete. Please check environment variables.' 
            });
        }

        // Generate unique filename for the audio file
        const uniqueId = crypto.randomUUID();
        const fileName = `audio-recordings/${uniqueId}.webm`;

        // Create the PutObjectCommand
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            ContentType: 'audio/webm'
        });

        // Generate presigned URL with 60 seconds expiration
        const uploadUrl = await getSignedUrl(s3Client, command, { 
            expiresIn: 60 
        });

        // Construct the final public URL
        const publicUrl = process.env.R2_PUBLIC_URL 
            ? `${process.env.R2_PUBLIC_URL}/${fileName}`
            : `https://${process.env.R2_BUCKET_NAME}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`;

        res.json({
            uploadUrl,
            publicUrl,
            fileName,
            expiresIn: 60
        });
    } catch (error) {
        // Step 1: Always log the full, detailed error for our internal debugging.
        console.error('Get R2 presigned URL error:', error);

        // --- NEW: Sanitize the response sent to the user ---
        const isProduction = process.env.NODE_ENV === 'production';

        // Provide more specific error messages but sanitize for production
        if (error.name === 'CredentialsProviderError') {
            return res.status(500).json({
                message: isProduction
                    ? "We're sorry, an unexpected error occurred. Please try again later."
                    : 'Invalid R2 credentials. Please check your access keys.'
            });
        }

        if (error.name === 'NetworkingError') {
            return res.status(500).json({
                message: isProduction
                    ? "We're sorry, an unexpected error occurred. Please try again later."
                    : 'Network error connecting to R2. Please check your configuration.'
            });
        }

        // Step 2: Send a generic, safe message in production.
        const errorMessage = isProduction
            ? "We're sorry, an unexpected error occurred. Please try again later."
            : 'Error generating upload URL';

        res.status(500).json({
            message: errorMessage,
            ...(isProduction ? {} : { error: error.message })
        });
        // ---------------------------------------------
    }
};

export { getPresignedR2Url };
