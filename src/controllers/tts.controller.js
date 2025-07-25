import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ElevenLabsClient } from 'elevenlabs';
import crypto from 'crypto';
import Session from '../models/sessionModel.js';

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

export const generateAndStreamAudio = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findById(sessionId);

        // 1. Check if the audio URL already exists. If so, redirect to R2 URL
        if (session?.suggestedAudioUrl) {
            console.log(`Audio already exists for session ${sessionId}, redirecting to R2`);
            return res.redirect(session.suggestedAudioUrl);
        }

        if (!session || !session.analysis?.improvedText) {
            return res.status(404).json({ message: 'Analysis text not found.' });
        }

        const suggestedText = session.analysis.improvedText;

        // 2. Generate the audio stream from ElevenLabs
        const audioStream = await elevenlabs.textToSpeech.convert("21m00Tcm4TlvDq8ikWAM", {
            text: suggestedText,
            model_id: "eleven_multilingual_v2"
        });

        // 3. Convert the stream into a buffer for both streaming and uploading
        // --- NEW, ROBUST BUFFER CONSTRUCTION LOGIC ---
        const chunks = [];
        for await (const chunk of audioStream) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);
        // ------------------------------------------

        // 4. --- UPLOAD TO R2 (in the background) ---
        const audioKey = `suggested-audio/${crypto.randomUUID()}.mp3`;
        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: audioKey,
            Body: audioBuffer,
            ContentType: 'audio/mpeg',
        });

        // We start the upload but don't wait for it to finish before streaming to the user.
        // We will update the database after the upload is done.
        s3Client.send(uploadCommand).then(async () => {
            const suggestedAudioUrl = `${process.env.R2_PUBLIC_URL}/${audioKey}`;
            session.suggestedAudioUrl = suggestedAudioUrl;
            await session.save();
            console.log(`Successfully saved suggested audio for session ${sessionId}`);
        }).catch(err => {
            console.error(`Failed to upload suggested audio for session ${sessionId}:`, err);
        });
        // ------------------------------------------

        // 5. --- STREAM TO USER (immediately) ---
        res.setHeader("Content-Type", "audio/mpeg");
        res.send(audioBuffer); // Send the complete buffer at once.

    } catch (error) {
        console.error("On-demand TTS Error:", error);
        res.status(500).json({ message: "Failed to generate audio." });
    }
};
