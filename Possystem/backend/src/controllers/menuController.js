import * as menuService from '../services/menuService.js';

/**
 * Fetch all active categories.
 * @route GET /api/menu/categories
 */
export const fetchCategories = async (req, res) => {
    try {
        const categories = await menuService.getActiveCategories();
        res.status(200).json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Internal server error while fetching categories.' });
    }
};

/**
 * Create a new category.
 * @route POST /api/menu/categories
 */
export const createCategory = async (req, res) => {
    try {
        const { name, is_active } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Category Name is required.' });
        }
        const newCategory = await menuService.createCategory({ name, is_active });
        res.status(201).json(newCategory);
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ message: 'Internal server error while creating category.' });
    }
};

/**
 * Update category.
 * @route PUT /api/menu/categories/:id
 */
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, is_active } = req.body;
        await menuService.updateCategory(id, { name, is_active });
        res.status(200).json({ message: 'Category updated successfully' });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ message: 'Internal server error while updating category.' });
    }
};

/**
 * Delete category.
 * @route DELETE /api/menu/categories/:id
 */
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await menuService.deleteCategory(id);
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ message: 'Internal server error while deleting category.' });
    }
};

/**
 * Fetch live menu with availability status.
 * @route GET /api/menu/live
 */
export const fetchLiveMenu = async (req, res) => {
    try {
        const liveMenu = await menuService.getLiveMenu();
        res.status(200).json(liveMenu);
    } catch (err) {
        console.error('Error fetching live menu:', err);
        res.status(500).json({ message: 'Internal server error while fetching live menu.' });
    }
};




/**
 * Fetch all menu items for management and order creation.
 * @route GET /api/menu
 * @access ADMIN, CASHIER
 * 
 * ADMIN: Can view all items for management
 * CASHIER: Can view all items for creating orders
 */
export const fetchAllMenuItems = async (req, res) => {
    try {
        const { category, status } = req.query;
        const menuItems = await menuService.getAllMenuItems({ category, status });
        res.status(200).json(menuItems);
    } catch (err) {
        console.error('Error fetching all menu items:', err);
        res.status(500).json({ message: 'Internal server error while fetching menu items.' });
    }
};

/**
 * Fetch menu statistics.
 * @route GET /api/menu/stats
 * @access ADMIN, CASHIER
 * 
 * Provides overview of menu items by category and status
 */
export const fetchMenuStats = async (req, res) => {
    try {
        const stats = await menuService.getMenuStats();
        res.status(200).json(stats);
    } catch (err) {
        console.error('Error fetching menu stats:', err);
        res.status(500).json({ message: 'Internal server error while fetching menu stats.' });
    }
};

/**
 * Create a new menu item.
 * @route POST /api/menu
 */
export const createMenuItem = async (req, res) => {
    try {
        const { name, category, price, inventory, is_active, description, image } = req.body;
        console.log('Received Create Payload:', JSON.stringify(req.body, null, 2));

        if (!name || price === undefined) {
            return res.status(400).json({ message: 'Name and Price are required.' });
        }

        // 1. Resolve Category Name to UUID if provided
        let category_id = req.body.category_id;
        if (!category_id && category) {
            const categories = await menuService.getActiveCategories();
            const matchedCategory = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
            if (matchedCategory) category_id = matchedCategory.id;
        }

        // 2. Map Inventory
        let ingredients = [];
        if (inventory && Array.isArray(inventory)) {
            ingredients = inventory.map(item => ({
                inventory_id: item.id || item.inventory_id,
                quantity: item.quantity
            }));
        }

        const newItemData = {
            name,
            category_id,
            price,
            is_active,
            ingredients,
            variants: req.body.variants, // Pass variants
            description,
            image
        };

        const newItem = await menuService.createMenuItem(newItemData);
        res.status(201).json(newItem);
    } catch (err) {
        console.error('Error creating menu item:', err);
        res.status(500).json({ message: 'Internal server error while creating menu item.' });
    }
};

/**
 * Update menu item.
 * @route PUT /api/menu/:id
 */
export const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, inventory, status, description, image } = req.body;
        console.log('Received Update Payload:', JSON.stringify(req.body, null, 2));

        // 1. Resolve Category Name to UUID if provided
        let category_id = req.body.category_id;
        if (!category_id && category) {
            const categories = await menuService.getActiveCategories();
            const matchedCategory = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
            if (matchedCategory) category_id = matchedCategory.id;
        }

        // 2. Map Status to Boolean
        // Only update if status is provided
        let is_active = undefined;
        if (status !== undefined) {
            is_active = status === 'Available' || status === true || status === 'true';
        }

        // 3. Map Inventory
        let ingredients = undefined;
        if (inventory && Array.isArray(inventory)) {
            ingredients = inventory.map(item => ({
                inventory_id: item.id,
                quantity: item.quantity
            }));
        }

        // Prepare updates object
        const updates = {
            name,
            category_id,
            price,
            ingredients,
            variants: req.body.variants, // Pass variants
            is_active,
            description,
            image
        };

        // Remove undefined keys
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

        await menuService.updateMenuItem(id, updates);
        res.status(200).json({ message: 'Menu item updated successfully' });
    } catch (err) {
        console.error('Error updating menu item:', err);
        res.status(500).json({ message: 'Internal server error while updating menu item.' });
    }
};

/**
 * Delete menu item.
 * @route DELETE /api/menu/:id
 */
export const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        await menuService.deleteMenuItem(id);
        res.status(200).json({ message: 'Menu item deleted successfully' });
    } catch (err) {
        console.error('Error deleting menu item:', err);
        res.status(500).json({ message: 'Internal server error while deleting menu item.' });
    }
};

/**
 * Toggle menu item status.
 * @route PATCH /api/menu/:id/status
 */
export const toggleItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, enabled } = req.body;
        // Support both is_active (requirement) and enabled (legacy/fallback)
        const status = is_active !== undefined ? is_active : enabled;

        if (status === undefined) {
            return res.status(400).json({ message: 'is_active or enabled field is required.' });
        }

        await menuService.toggleItemStatus(id, status);
        res.status(200).json({ message: 'Menu item status updated successfully', is_active: status });
    } catch (err) {
        console.error('Error toggling status:', err);
        res.status(500).json({ message: 'Internal server error while updating status.' });
    }
};
