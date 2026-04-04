import { verifyToken } from '../utils/jwtUtils.js';

/**
 * Middleware to authenticate requests using JWT.
 * Expects 'Authorization: Bearer <token>' header.
 * Attaches decoded user (userId, role) to req.user
 */
export const protect = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log(`[AUTH] ${req.method} ${req.path} - Token present: ${!!token}`);

    if (!token) {
        console.log('[AUTH] No token provided');
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // Attach decoded user info (userId, role) to request
        console.log(`[AUTH] Token valid - User: ${decoded.userId}, Role: ${decoded.role}`);
        next();
    } catch (error) {
        console.log('[AUTH] Token verification failed:', error.message);
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

// Legacy alias for backward compatibility
export const authenticateToken = protect;
