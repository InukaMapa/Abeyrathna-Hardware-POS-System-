// API Configuration
// Use relative URL to leverage Vite proxy in development
// Vite proxy forwards /api -> http://localhost:5000/api
export const API_BASE_URL = '/api';

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
<<<<<<< HEAD
    
=======

>>>>>>> Pasindu_dev
    // Supplier Management
    SUPPLIERS: '/suppliers'
};
