// src/services/liveMenuService.js
import { API_BASE_URL } from '../config/api';

/**
 * Fetch live menu items (public)
 * GET /api/menu/live
 */
export const fetchLiveMenu = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/live`);

        if (!response.ok) {
            throw new Error('Failed to fetch menu');
        }

        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.data || []);

        return items;
    } catch (error) {
        console.error('Error fetching live menu:', error);
        throw error;
    }
};

/**
 * Place a new order
 * POST /api/orders
 */
export const placeOrder = async (orderDetails) => {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderDetails),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to place order');
        }

        return data;
    } catch (error) {
        console.error('Error placing order:', error);
        throw error;
    }
};
