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
        let debugLog = [];
        debugLog.push({ step: 'start', sessionId });
        const session = await Session.findById(sessionId);
        debugLog.push({ step: 'session_fetched', session });

        // 1. Check if the audio URL already exists. If so, redirect to R2 URL
        if (session?.suggestedAudioUrl) {
            debugLog.push({ step: 'audio_exists', url: session.suggestedAudioUrl });
            return res.redirect(session.suggestedAudioUrl);
        }

        if (!session || !session.analysis?.improvedText) {
            debugLog.push({ step: 'analysis_missing', session });
            return res.status(404).json({ message: 'Analysis text not found.', debugLog });
        }

        const suggestedText = session.analysis.improvedText;
        debugLog.push({ step: 'got_suggested_text', suggestedText });

        // 2. Generate the audio stream from ElevenLabs
        let audioStream;
        try {
            audioStream = await elevenlabs.textToSpeech.convert("21m00Tcm4TlvDq8ikWAM", {
                text: suggestedText,
                model_id: "eleven_multilingual_v2"
            });
            debugLog.push({ step: 'audio_stream_created' });
        } catch (err) {
            debugLog.push({ step: 'elevenlabs_error', error: err?.message || err });
            return res.status(500).json({ message: 'Failed to generate audio from ElevenLabs.', debugLog });
        }

        // 3. Convert the stream into a buffer for both streaming and uploading
        const chunks = [];
        try {
            for await (const chunk of audioStream) {
                chunks.push(chunk);
            }
            debugLog.push({ step: 'audio_stream_buffered', chunkCount: chunks.length });
        } catch (err) {
            debugLog.push({ step: 'buffering_error', error: err?.message || err });
            return res.status(500).json({ message: 'Failed to buffer audio stream.', debugLog });
        }
        let audioBuffer;
        try {
            audioBuffer = Buffer.concat(chunks);
            debugLog.push({ step: 'audio_buffer_created', bufferLength: audioBuffer.length });
        } catch (err) {
            debugLog.push({ step: 'buffer_concat_error', error: err?.message || err });
            return res.status(500).json({ message: 'Failed to create audio buffer.', debugLog });
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
            debugLog.push({ step: 'audio_uploaded', suggestedAudioUrl });
        }).catch(err => {
            debugLog.push({ step: 'r2_upload_error', error: err?.message || err });
        });

        // 5. --- STREAM TO USER (immediately) ---
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("X-Debug-Log", encodeURIComponent(JSON.stringify(debugLog)));
        res.send(audioBuffer); // Send the complete buffer at once.

    } catch (error) {
        const debugLog = [{ step: 'catch_error', error: error?.message || error }];
        res.status(500).json({ message: "Failed to generate audio.", debugLog });
    }
};
