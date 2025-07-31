import jwt from 'jsonwebtoken';

// 1. --- ACCESS TOKEN (Short-lived) ---
export const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '15m' // Set to 15 minutes
    });
};

// 2. --- REFRESH TOKEN (Long-lived) ---
export const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, { // Uses a DIFFERENT secret
        expiresIn: '30d' // Set to 30 days
    });
};

// Legacy function for backward compatibility (will be removed after migration)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '15m',
    });
};

export default generateToken;
