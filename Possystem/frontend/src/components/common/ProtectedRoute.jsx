import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = 'login', onNavigate }) => {
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        console.log('🔒 ProtectedRoute: Checking access...', {
            isAuthenticated,
            userRole: user?.role,
            allowedRoles,
            username: user?.username
        });
    }, [isAuthenticated, user, allowedRoles]);

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        console.warn('⚠️ ProtectedRoute: Not authenticated, redirecting to', redirectTo);
        if (onNavigate) {
            setTimeout(() => onNavigate(redirectTo), 0);
        }
        return null;
    }

    // Validate token and role
    if (!user || !user.role) {
        console.error('❌ ProtectedRoute: User object or role is missing');
        if (onNavigate) {
            setTimeout(() => onNavigate('login'), 0);
        }
        return null;
    }

    // Check if user has required role (strict case-sensitive comparison)
    if (allowedRoles.length > 0) {
        const hasPermission = allowedRoles.includes(user.role);
        
        if (!hasPermission) {
            console.warn('⚠️ ProtectedRoute: Access denied. User role:', user.role, 'Allowed:', allowedRoles);
            // User doesn't have permission - redirect to unauthorized
            if (onNavigate) {
                setTimeout(() => onNavigate('unauthorized'), 0);
            }
            return null;
        }
        
        console.log('✅ ProtectedRoute: Access granted for role:', user.role);
    }

    // User is authenticated and has required role
    return children;
};

export default ProtectedRoute;
