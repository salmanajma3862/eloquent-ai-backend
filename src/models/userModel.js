import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    plan: { type: String, enum: ['free', 'premium'] },
    stripeCustomerId: { type: String, unique: true, sparse: true }, //sparse allows nulls to not be unique
    status: { type: String, enum: ['active', 'canceled', 'incomplete'], default: 'incomplete' },
    currentPeriodEnd: { type: Date }
}, { _id: false });

const userSchema = new mongoose.Schema({
    // --- Core Identity ---
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: function() { return !this.googleId; } // Required only if not a Google sign-in
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },

    // --- Application Logic ---
    subscription: {
        type: subscriptionSchema,
        default: () => ({ plan: 'free' })
    },
    totalSessions: {
        type: Number,
        default: 0
    },

    // --- Security & Metadata ---
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    lastLogin: {
        type: Date
    },
    lastSessionDate: {
        type: Date
    },
    emailVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

const User = mongoose.model('User', userSchema);
export default User;