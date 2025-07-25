import { ElevenLabsClient } from 'elevenlabs';
import Session from '../models/sessionModel.js';

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

export const generateAndStreamAudio = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findById(sessionId);

        if (!session || !session.analysis || !session.analysis.improvedText) {
            return res.status(404).json({ message: 'Analysis text not found.' });
        }

        const suggestedText = session.analysis.improvedText;

        // Generate the audio stream from ElevenLabs
        const audioStream = await elevenlabs.textToSpeech.convert("21m00Tcm4TlvDq8ikWAM", {
            text: suggestedText,
            model_id: "eleven_multilingual_v2"
        });

        // Set the headers to stream the audio directly to the client
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "no-cache");

        // --- NEW, ROBUST STREAMING LOGIC ---
        // Manually iterate through the stream chunks and write them to the response.
        for await (const chunk of audioStream) {
            res.write(chunk);
        }

        // End the response when the stream is finished.
        res.end();
        // ------------------------------------

    } catch (error) {
        console.error("On-demand TTS Error:", error);
        res.status(500).json({ message: "Failed to generate audio." });
    }
};
