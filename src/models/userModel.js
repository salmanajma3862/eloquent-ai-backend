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
    freeTestsRemaining: {
        type: Number,
        default: 3
    },
    lastTestResetDate: { // To manage the "3 free tests *per week*" logic
        type: Date,
        default: Date.now
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
    emailVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

const User = mongoose.model('User', userSchema);
export default User;