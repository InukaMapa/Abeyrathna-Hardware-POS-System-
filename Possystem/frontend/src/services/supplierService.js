import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getSuppliers = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}${ENDPOINTS.SUPPLIERS}`, {
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        throw error.response?.data || { message: 'Failed to fetch suppliers' };
    }
};

export const createSupplier = async (supplierData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.SUPPLIERS}`, supplierData, {
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        console.error('Error creating supplier:', error);
        throw error.response?.data || { message: 'Failed to create supplier' };
    }
};

export const updateSupplier = async (id, supplierData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}${ENDPOINTS.SUPPLIERS}/${id}`, supplierData, {
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        console.error('Error updating supplier:', error);
        throw error.response?.data || { message: 'Failed to update supplier' };
    }
};

export const deleteSupplier = async (id) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}${ENDPOINTS.SUPPLIERS}/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        console.error('Error deleting supplier:', error);
        throw error.response?.data || { message: 'Failed to delete supplier' };
    }
};
