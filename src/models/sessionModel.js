import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
    overallBandScore: { type: Number, min: 0, max: 9 },
    wordCount: { type: Number },
    wordsPerMinute: { type: Number },
    
    fluencyAndCoherence: {
        score: { type: Number },
        feedback: { type: String }
    },
    lexicalResource: {
        score: { type: Number },
        feedback: { type: String }
    },
    grammaticalRangeAndAccuracy: {
        score: { type: Number },
        feedback: { type: String }
    },

    improvedText: { type: String }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topicText: {
        type: String,
        required: true
    },
    audioUrl: { // URL pointing to the Cloudflare R2 object
        type: String,
        required: true
    },
    durationInSeconds: {
        type: Number,
        required: true
    },
    
    // --- Data from Deepgram ---
    transcribedText: {
        type: String,
        default: ''
    },

    // --- Data from Claude ---
    analysis: {
        type: analysisSchema
    },
    
    // --- Processing Metadata ---
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    }
}, {
    timestamps: true // Tracks when the session was created and last updated
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;