/**
 * Middleware to authorize users based on roles.
 * @param {...string} roles - Allowed roles (e.g., 'ADMIN', 'CASHIER').
 * @returns {Function} Express middleware function
 * 
 * Usage: 
 *   authorize('ADMIN')
 *   authorize('ADMIN', 'CASHIER')
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            console.log('[ROLE] Authorization failed - No user in request');
            return res.status(401).json({ message: 'Unauthorized. User not authenticated.' });
        }

        console.log(`[ROLE] Checking role: ${req.user.role} against allowed: [${roles.join(', ')}]`);

        if (!roles.includes(req.user.role)) {
            console.log(`[ROLE] Access denied for role: ${req.user.role}`);
            return res.status(403).json({
                message: `Access denied. This route requires one of the following roles: ${roles.join(', ')}`
            });
        }

        console.log(`[ROLE] Authorization successful`);
        next();
    };
};

// Legacy alias for backward compatibility
export const authorizeRoles = (allowedRoles) => {
    return authorize(...allowedRoles);
};
