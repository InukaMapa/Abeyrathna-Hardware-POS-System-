import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * RoleGuard Component
 * Conditionally renders children based on user role
 * 
 * Usage:
 * <RoleGuard allowedRoles={['ADMIN']}>
 *   <AdminOnlyButton />
 * </RoleGuard>
 */
const RoleGuard = ({ children, allowedRoles = [], fallback = null }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return fallback;
    }

    if (allowedRoles.length === 0) {
        return children;
    }

    if (allowedRoles.includes(user?.role)) {
        return children;
    }

    return fallback;
};

export default RoleGuard;
