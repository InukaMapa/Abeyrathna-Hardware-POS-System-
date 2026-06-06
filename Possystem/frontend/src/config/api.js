// API Configuration
// Local dev defaults to /api so Vite can proxy to the backend.
// Production builds should set VITE_API_BASE_URL to the hosted backend API URL.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
export const QR_ORDER_BASE_URL = import.meta.env.VITE_QR_ORDER_BASE_URL || `${APP_BASE_URL}/landing`;

export const ENDPOINTS = {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    // Add other endpoints here

    // Email + OTP
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_OTP: '/auth/verify-otp',
    RESET_PASSWORD: '/auth/reset-password',

    // Table Management
    TABLES: '/tables',
    TABLES_BY_PLACE: '/tables/place',
    TABLE_BY_ID: '/tables', // Will be used as /tables/:id

    // Cashier Operations
    CASHIER_TABLES: '/cashier/tables',

    // Supplier Management
    SUPPLIERS: '/suppliers'
};
