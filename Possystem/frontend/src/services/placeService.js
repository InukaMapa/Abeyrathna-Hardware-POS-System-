import { API_BASE_URL } from '../config/api';

/**
 * Place Service
 * Handles all API calls related to place management
 */

/**
 * Get authorization headers with JWT token
 * @returns {Object} Headers object with Authorization
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

/**
 * Get all places
 * @returns {Promise<Array>} Array of all places
 */
export const getAllPlaces = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/places`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch places');
        }

        const result = await response.json();
        
        // Handle different response shapes
        if (result && typeof result === 'object') {
            // If response has { places: [...] } structure (current backend format)
            if (result.places && Array.isArray(result.places)) {
                return result.places;
            }
            // If response has { data: [...] } structure
            if (result.data && Array.isArray(result.data)) {
                return result.data;
            }
            // If response is directly an array
            if (Array.isArray(result)) {
                return result;
            }
        }
        
        // Fallback to empty array
        console.warn('Unexpected places response format:', result);
        return [];
    } catch (error) {
        console.error('Error fetching places:', error);
        throw error;
    }
};

/**
 * Create a new place
 * @param {Object} placeData - Place data { place_name }
 * @returns {Promise<Object>} Created place data
 */
export const createPlace = async (placeData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/places`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(placeData),
        });

        if (!response.ok) {
            throw new Error('Failed to create place');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating place:', error);
        throw error;
    }
};
