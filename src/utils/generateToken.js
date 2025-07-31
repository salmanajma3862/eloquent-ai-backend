import jwt from 'jsonwebtoken';

export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.AUTH_SECRET, { // Or AUTH_SECRET, whichever you standardized on
        expiresIn: '30d' // A single, 30-day token
    });
};
