import { API_BASE_URL } from '../config/api';

/**
 * Cashier Table Service
 * API calls for cashier table operations
 */

/**
 * Fetch all tables grouped by place with active order status
 * GET /api/cashier/tables
 */
export const fetchCashierTables = async () => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/cashier/tables`;

    // Debug logging
    console.log('🔍 Fetching tables from:', url);
    console.log('🔑 Token present:', !!token);

    if (!token) {
        throw new Error('No authentication token found');
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        // Check if response is successful
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('📡 Server error:', response.status, errorData);

            if (response.status === 403) {
                throw new Error('ACCESS_DENIED');
            }
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        // Validate JSON response
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ Backend returned non-JSON response:', contentType);
            throw new Error('BACKEND_NOT_READY');
        }

        const data = await response.json();

        // Final validation: check if data is an array
        if (!Array.isArray(data)) {
            console.error('❌ Expected array from backend, got:', typeof data);
            throw new Error('INVALID_DATA_FORMAT');
        }

        console.log('✅ Successfully fetched', data.length, 'places');
        return data;
    } catch (error) {
        // Handle access denied specifically
        if (error.message === 'ACCESS_DENIED') {
            throw new Error('You do not have permission to view table status.');
        }

        // Network error (Failed to fetch)
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            console.error('❌ Network error: Cannot connect to backend');
            throw new Error('NETWORK_ERROR');
        }

        // Re-throw other errors
        console.error('❌ fetchCashierTables error:', error);
        throw error;
    }
};

/**
 * Mock data for development when backend is not ready
 */
export const getMockCashierTables = () => {
    return [
        {
            placeId: 1,
            placeName: "Main Dining",
            tables: [
                { tableId: 1, seats: 4, hasActiveOrder: true, orderStatus: "PREPARING", totalAmount: 2500.00 },
                { tableId: 2, seats: 2, hasActiveOrder: false, orderStatus: null, totalAmount: null },
                { tableId: 3, seats: 6, hasActiveOrder: true, orderStatus: "SERVED", totalAmount: 4200.00 },
                { tableId: 4, seats: 4, hasActiveOrder: true, orderStatus: "BILL_OPEN", totalAmount: 3100.00 },
                { tableId: 5, seats: 2, hasActiveOrder: false, orderStatus: null, totalAmount: null },
                { tableId: 6, seats: 4, hasActiveOrder: true, orderStatus: "PLACED", totalAmount: 1800.00 },
            ]
        },
        {
            placeId: 2,
            placeName: "Outdoor Terrace",
            tables: [
                { tableId: 7, seats: 4, hasActiveOrder: true, orderStatus: "PLACED", totalAmount: 1800.00 },
                { tableId: 8, seats: 4, hasActiveOrder: false, orderStatus: null, totalAmount: null },
                { tableId: 9, seats: 2, hasActiveOrder: true, orderStatus: "PREPARING", totalAmount: 1500.00 },
                { tableId: 10, seats: 6, hasActiveOrder: false, orderStatus: null, totalAmount: null },
            ]
        },
        {
            placeId: 3,
            placeName: "VIP Section",
            tables: [
                { tableId: 11, seats: 8, hasActiveOrder: false, orderStatus: null, totalAmount: null },
                { tableId: 12, seats: 6, hasActiveOrder: true, orderStatus: "SERVED", totalAmount: 8500.00 },
            ]
        }
    ];
};
