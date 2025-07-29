import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import Session from '../models/sessionModel.js';

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
        let debugLog = [];
        debugLog.push({ step: 'start', sessionId });
        const session = await Session.findById(sessionId);
        debugLog.push({ step: 'session_fetched', session });

        // 1. Check if the audio URL already exists. If so, return 409 status
        if (session?.suggestedAudioUrl) {
            debugLog.push({ step: 'audio_exists', url: session.suggestedAudioUrl });
            return res.status(409).json({ message: 'Audio already generated.', debugLog });
        }

        if (!session || !session.analysis?.improvedText) {
            debugLog.push({ step: 'analysis_missing', session });
            return res.status(404).json({ message: 'Analysis text not found.', debugLog });
        }

        const suggestedText = session.analysis.improvedText;
        debugLog.push({ step: 'got_suggested_text', suggestedText });

        // 2. Generate audio using Unreal Speech API
        const UNREAL_API_KEY = process.env.UNREAL_API_KEY;
        let audioBuffer;

        try {
            debugLog.push({ step: 'calling_unreal_speech_api' });

            const response = await fetch("https://api.unrealspeech.com/stream", {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${UNREAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Text: suggestedText,
                    VoiceId: "Dan", // A standard, clear male voice
                    Bitrate: "192k",
                    Speed: "0",
                    Pitch: "1.0"
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                debugLog.push({ step: 'unreal_speech_error', status: response.status, error: errorText });
                console.error("Unreal Speech API returned an error:", errorText);
                return res.status(500).json({ message: 'Failed to generate audio from Unreal Speech.', debugLog });
            }

            // Convert response to buffer
            audioBuffer = Buffer.from(await response.arrayBuffer());
            debugLog.push({ step: 'audio_buffer_created', bufferLength: audioBuffer.length });

        } catch (err) {
            debugLog.push({ step: 'unreal_speech_api_error', error: err?.message || err });
            return res.status(500).json({ message: 'Failed to generate audio from Unreal Speech.', debugLog });
        }

        // 4. --- UPLOAD TO R2 (in the background) ---
        const audioKey = `suggested-audio/${crypto.randomUUID()}.mp3`;
        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: audioKey,
            Body: audioBuffer,
            ContentType: 'audio/mpeg',
        });

        s3Client.send(uploadCommand).then(async () => {
            const suggestedAudioUrl = `${process.env.R2_PUBLIC_URL}/${audioKey}`;
            session.suggestedAudioUrl = suggestedAudioUrl;
            await session.save();
            console.log(`Successfully saved suggested audio (Unreal Speech) for session ${sessionId}`);
            debugLog.push({ step: 'audio_uploaded', suggestedAudioUrl });
        }).catch(err => {
            console.error(`Failed to upload suggested audio for session ${sessionId}:`, err);
            debugLog.push({ step: 'r2_upload_error', error: err?.message || err });
        });

        // 5. --- STREAM TO USER (immediately) ---
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("X-Debug-Log", encodeURIComponent(JSON.stringify(debugLog)));
        res.send(audioBuffer); // Send the complete buffer at once.

    } catch (error) {
        console.error("On-demand TTS Error (Unreal Speech):", error);
        const debugLog = [{ step: 'catch_error', error: error?.message || error }];
        res.status(500).json({ message: "Failed to generate audio.", debugLog });
    }
};
