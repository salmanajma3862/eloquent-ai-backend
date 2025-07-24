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

// @desc    Get Deepgram API token
// @route   GET /api/test/deepgram-token
// @access  Private
const getDeepgramToken = async (req, res) => {
    try {
        // Check if Deepgram API key is configured
        if (!process.env.DEEPGRAM_API_KEY) {
            return res.status(500).json({ 
                message: 'Deepgram API key not configured' 
            });
        }

        res.json({
            deepgramToken: process.env.DEEPGRAM_API_KEY
        });
    } catch (error) {
        console.error('Get Deepgram token error:', error);
        res.status(500).json({ message: 'Error retrieving Deepgram token' });
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
        console.error('Get R2 presigned URL error:', error);
        
        // Provide more specific error messages
        if (error.name === 'CredentialsProviderError') {
            return res.status(500).json({ 
                message: 'Invalid R2 credentials. Please check your access keys.' 
            });
        }
        
        if (error.name === 'NetworkingError') {
            return res.status(500).json({ 
                message: 'Network error connecting to R2. Please check your configuration.' 
            });
        }

        res.status(500).json({ 
            message: 'Error generating upload URL',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export { getDeepgramToken, getPresignedR2Url };
