// src/services/orderService.js
const API_BASE_URL = '/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

/**
 * Fetch all orders with filters
 * GET /api/orders?status=PLACED&startDate=...&endDate=...
 */
export const fetchOrders = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams();

        if (filters.status) queryParams.append('status', filters.status);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.tableId) queryParams.append('tableId', filters.tableId);

        const queryString = queryParams.toString();
        const url = queryString ? `${API_BASE_URL}/orders?${queryString}` : `${API_BASE_URL}/orders`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
};

/**
 * Create new order for a table
 * POST /api/orders
 * 
 * @param {Object} orderData - { table_id, items: [{ id, quantity }], customer_phone }
 * @returns {Promise<Object>} Created order object
 */
export const createOrder = async (orderData) => {
    console.log('🔄 Creating order:', orderData);
    console.log('🔗 Request URL:', `${API_BASE_URL}/orders`);

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(orderData)
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers.get('content-type'));

        // Try to parse response
        let data;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('📡 Response data:', data);
        } else {
            // If not JSON, get text for debugging
            const text = await response.text();
            console.error('❌ Non-JSON response:', text);
            throw new Error('Server returned invalid response format');
        }

        // Handle specific error cases
        if (!response.ok) {
            console.error('❌ Server error response:', {
                status: response.status,
                data: data,
                message: data.message || data.error
            });

            if (response.status === 409) {
                throw new Error('TABLE_HAS_ACTIVE_ORDER');
            } else if (response.status === 400) {
                const errorMsg = data.message || data.error || 'Invalid order data';
                console.error('❌ Validation error:', errorMsg, data);
                throw new Error(errorMsg);
            } else if (response.status === 401) {
                throw new Error('Unauthorized - please login again');
            } else if (response.status === 500) {
                const errorMsg = data.message || data.error || 'Server error';
                console.error('❌ Server error details:', data);
                throw new Error(`Server error: ${errorMsg}`);
            } else {
                const errorMsg = data.message || data.error || 'Failed to create order';
                throw new Error(errorMsg);
            }
        }

        console.log('✅ Order created successfully:', data);
        return data;
    } catch (error) {
        // Enhanced error logging
        console.error('❌ Create order error:', error);
        console.error('❌ Error type:', error.constructor.name);
        console.error('❌ Error message:', error.message);

        // If network error
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Cannot connect to server. Please check your connection.');
        }

        throw error;
    }
};

/**
 * Fetch order details by ID
 * GET /api/orders/:id
 */
export const fetchOrderById = async (orderId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch order details');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching order:', error);
        throw error;
    }
};
