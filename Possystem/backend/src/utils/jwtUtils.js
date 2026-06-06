import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generates a JWT token for a user.
 * @param {object} user - The user object (must contain id and role).
 * @returns {string} - The signed JWT token.
 */
export const generateToken = (user) => {
    if (!config.jwtSecret) {
        throw new Error('JWT_SECRET is not defined');
    }

    // Spread the user object to include all provided fields (id, username, role, etc.)
    const payload = {
        ...user,
        userId: user.id // Ensure userId is present for backward compatibility with middleware
    };

    // DEBUG: Log payload before signing
    console.log('🔑 JWT Payload:', payload);

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1d' });

    return token;
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token.
 * @returns {object} - The decoded payload.
 */
export const verifyToken = (token) => {
    if (!config.jwtSecret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.verify(token, config.jwtSecret);
};
