// src/services/menuService.js

const API_BASE_URL = '/api'; // Use proxy to avoid CORS issues and rely on vite.config.js target

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');

    // Debug: Decode token to verify role
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            console.log("DEBUG: Decoded Token Payload:", decoded);
            console.log("DEBUG: Your Role is:", decoded.role || decoded.isAdmin ? 'Admin' : 'Unknown');
        } catch (e) {
            console.error("DEBUG: Failed to decode token", e);
        }
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};


/**
 * Fetch all menu items
 * GET /api/menu?category=UUID&status=active|inactive
 */
export const fetchMenuItems = async (categoryId = '', status = '') => {
    try {
        const headers = getAuthHeaders();

        const params = new URLSearchParams();
        // Backend expects 'active' | 'inactive' lowercase for status param
        if (categoryId && categoryId !== 'all') params.append('category', categoryId);
        if (status && status !== 'All') params.append('status', status.toLowerCase());

        const url = `${API_BASE_URL}/menu?${params.toString()}`;
        console.log('Fetching menu items from:', url);

        const response = await fetch(url, { headers });

        if (response.status === 401) throw new Error('Unauthorized');
        if (response.status === 403) throw new Error('Access Denied');
        if (!response.ok) throw new Error('Failed to fetch menu items');

        const data = await response.json();

        // Handle if data is wrapped in an object (e.g. { data: [...] })
        const itemsArray = Array.isArray(data) ? data : (data.data || []);

        // Normalize data
        const normalizedData = itemsArray.map(item => {
            let isActive = false;

            // robust check for is_active (snake_case) or isActive (camelCase)
            let rawStatus = item.is_active;
            if (rawStatus === undefined || rawStatus === null) {
                rawStatus = item.isActive;
            }

            if (rawStatus !== undefined && rawStatus !== null) {
                const val = String(rawStatus).toLowerCase();
                if (
                    rawStatus === true ||
                    rawStatus === 1 ||
                    val === '1' ||
                    val === 'true' ||
                    val === 'active' ||
                    val === 'available'
                ) {
                    isActive = true;
                }
            } else if (item.status) {
                // Fallback to status string if is_active is missing
                const lowerStatus = String(item.status).toLowerCase();
                if (lowerStatus === 'active' || lowerStatus === 'available') {
                    isActive = true;
                }
            }

            // DEBUG: Log problematic items to console to see what's failing
            if (!isActive) {
                console.log(`DEBUG: Item "${item.name}" resolved to INACTIVE. Raw is_active: ${item.is_active} (${typeof item.is_active}), Raw status: ${item.status}`);
            }

            return {
                ...item,
                is_active: isActive
            };
        });

        console.log('Normalized Menu Items:', normalizedData);
        return normalizedData;
    } catch (error) {
        console.error('Error fetching menu items:', error);
        throw error;
    }
};


/**
 * Fetch menu stats
 * GET /api/menu/stats
 */
export const fetchMenuStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/stats`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) return { totalItems: 0, available: 0, outOfStock: 0, bestSelling: 'N/A' };
        return await response.json();
    } catch (error) {
        return { totalItems: 0, available: 0, outOfStock: 0, bestSelling: 'N/A' };
    }
};

/**
 * Create a new menu item
 * POST /api/menu
 */
export const createMenuItem = async (item) => {
    try {
        const payload = {
            name: item.name,
            price: Number(item.price),
            category_id: item.categoryId, // UUID
            description: item.description || null,
            image: item.image || null,
            is_active: true,
            inventory: item.inventory.map(i => ({
                id: i.id,
                quantity: Number(i.quantity)
            })),
            variants: item.variants || []
        };

        const response = await fetch(`${API_BASE_URL}/menu`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to create menu item');
        return await response.json();
    } catch (error) {
        console.error('Error creating menu item:', error);
        throw error;
    }
};

/**
 * Update an existing menu item
 * PUT /api/menu/:id
 */
export const updateMenuItem = async (id, item) => {
    try {
        const payload = {
            name: item.name,
            price: Number(item.price),
            category_id: item.categoryId, // UUID
            description: item.description || null,
            image: item.image || null,
            // is_active is usually handled by a separate toggle, but if included in edit form:
            // is_active: item.is_active, 
            inventory: item.inventory.map(i => ({
                id: i.id,
                quantity: Number(i.quantity)
            })),
            variants: item.variants || []
        };

        const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to update menu item');
        return await response.json();
    } catch (error) {
        console.error('Error updating menu item:', error);
        throw error;
    }
};

/**
 * Delete a menu item
 * DELETE /api/menu/:id
 */
export const deleteMenuItem = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete menu item');
        return await response.json();
    } catch (error) {
        console.error('Error deleting menu item:', error);
        throw error;
    }
};



/**
 * Fetch all categories
 * GET /api/menu/categories
 */
export const fetchCategories = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/categories`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();

        // Handle if response is wrapped e.g. { data: [...] }
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;

        console.warn("Categories API returned unexpected format:", data);
        return [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
};

/**
 * Create a new category
 * POST /api/menu/categories
 */
export const createCategory = async (data) => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/categories`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create category');
        return await response.json();
    } catch (error) {
        console.error('Error creating category:', error);
        throw error;
    }
};

/**
 * Update a category
 * PUT /api/menu/categories/:id
 */
export const updateCategory = async (id, data) => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/categories/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update category');
        return await response.json();
    } catch (error) {
        console.error('Error updating category:', error);
        throw error;
    }
};

/**
 * Delete a category
 * DELETE /api/menu/categories/:id
 */
export const deleteCategory = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/categories/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete category');
        return await response.json();
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
};

/**
 * Fetch all inventory items
 * GET /api/inventory
 */
export const fetchInventoryItems = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            console.error('Inventory fetch failed:', response.status, response.statusText);
            if (response.status === 403 || response.status === 401) {
                console.warn("User does not have permission to view inventory, returning empty list.");
                return [];
            }
            throw new Error('Failed to fetch inventory');
        }
        const data = await response.json();
        console.log('DEBUG: Raw Inventory Response:', data);

        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.items)) return data.items;
        if (data && Array.isArray(data.inventory)) return data.inventory;

        console.warn('Inventory API returned unexpected format:', data);
        return [];
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
};

/**
 * Fetch all inventory categories
 * GET /api/inventory/categories
 */
export const fetchInventoryCategories = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory/categories`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch inventory categories');
        return await response.json();
    } catch (error) {
        console.error('Error fetching inventory categories:', error);
        return [];
    }
};


/**
 * Upload an image to S3
 * POST /api/upload/image
 */
export const uploadImage = async (file) => {
    try {
        const formData = new FormData();
        formData.append('image', file);

        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to upload image');
        }
        return await response.json();
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};
