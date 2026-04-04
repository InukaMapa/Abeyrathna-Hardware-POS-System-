import { API_BASE_URL } from '../config/api';

/**
 * Table Service
 * Handles all API calls related to table management
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
 * Create a new table
 * @param {Object} tableData - Table data { place_id, seats, qr_url }
 * @returns {Promise<Object>} Created table data
 */
export const createTable = async (tableData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tables`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(tableData),
        });

        if (!response.ok) {
            throw new Error('Failed to create table');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating table:', error);
        throw error;
    }
};

/**
 * Get all tables
 * @returns {Promise<Array>} Array of all tables
 */
export const getAllTables = async () => {
    try {
        console.log('Fetching tables from:', `${API_BASE_URL}/tables`);
        const response = await fetch(`${API_BASE_URL}/tables`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Failed to fetch tables: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched tables data:', data);
        
        // Ensure we always return an array
        if (Array.isArray(data)) {
            return data;
        } else if (data && Array.isArray(data.tables)) {
            // Handle if backend wraps data in an object
            return data.tables;
        } else if (data && typeof data === 'object') {
            // If it's an object with data, try to extract it
            return Object.values(data);
        }
        
        console.warn('Unexpected data format:', data);
        return [];
    } catch (error) {
        console.error('Error fetching tables:', error);
        // Return empty array instead of throwing to prevent app crash
        return [];
    }
};

/**
 * Get tables by place
 * @param {string} place - Place name to filter tables
 * @returns {Promise<Array>} Array of tables for the specified place
 */
export const getTablesByPlace = async (place) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tables/place/${encodeURIComponent(place)}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch tables by place');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching tables by place:', error);
        throw error;
    }
};

/**
 * Update an existing table
 * @param {number} tableId - ID of the table to update
 * @param {Object} tableData - Updated table data { place, seats, qr_url }
 * @returns {Promise<Object>} Updated table data
 */
export const updateTable = async (tableId, tableData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(tableData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Update error:', errorText);
            throw new Error(`Failed to update table: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating table:', error);
        throw error;
    }
};

/**
 * Delete a table
 * @param {number} tableId - ID of the table to delete
 * @returns {Promise<Object>} Delete confirmation
 */
export const deleteTable = async (tableId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete error:', errorText);
            throw new Error(`Failed to delete table: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting table:', error);
        throw error;
    }
};
