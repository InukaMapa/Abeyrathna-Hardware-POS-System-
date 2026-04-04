// User role constants
export const ROLES = {
    ADMIN: 'ADMIN',
    CASHIER: 'CASHIER'
};

// Order status constants
export const ORDER_STATUS = {
    PLACED: 'PLACED',
    PREPARING: 'PREPARING',
    SERVED: 'SERVED',
    BILL_OPEN: 'BILL_OPEN',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
};

// Table status constants
export const TABLE_STATUS = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    RESERVED: 'RESERVED'
};

// Helper function to check if user has required role
export const hasRole = (user, requiredRoles) => {
    if (!user || !user.role) return false;
    if (!Array.isArray(requiredRoles)) requiredRoles = [requiredRoles];
    return requiredRoles.includes(user.role);
};

// Helper function to get status color classes
export const getStatusColorClasses = (status, type = 'order') => {
    if (type === 'order') {
        switch (status) {
            case ORDER_STATUS.PLACED:
                return { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800', badge: 'bg-blue-200' };
            case ORDER_STATUS.PREPARING:
                return { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800', badge: 'bg-orange-200' };
            case ORDER_STATUS.SERVED:
                return { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-800', badge: 'bg-green-200' };
            case ORDER_STATUS.BILL_OPEN:
                return { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800', badge: 'bg-red-200' };
            case ORDER_STATUS.COMPLETED:
                return { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-800', badge: 'bg-gray-200' };
            default:
                return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', badge: 'bg-gray-200' };
        }
    }
    return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', badge: 'bg-gray-200' };
};

// Format currency
export const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
};

// Format date/time
export const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Get authorization header
export const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};
