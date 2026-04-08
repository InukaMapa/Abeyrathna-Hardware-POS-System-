import { supabase } from '../config/db.js';
import * as inventoryService from '../services/inventoryService.js';

/**
 * Fetch all inventory items with optional filters.
 * @route GET /api/inventory
 */
export const fetchInventoryList = async (req, res) => {
    try {
        const { search, category, status } = req.query;

        let query = supabase
            .from('inventory')
            .select('*, suppliers(supplier_name)')
            .order('ingredient_name', { ascending: true });

        if (search) {
            query = query.or(`ingredient_name.ilike.%${search}%,item_code.eq.${search}`);
        }
        if (category && category !== 'All') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Client-side status filtering if needed, though better in DB if possible
        // For 'status' filter: 'low_stock', 'out_of_stock'
        let filteredData = data.map(item => {
            let stockStatus = 'In Stock';
            if (item.quantity === 0) stockStatus = 'Out of Stock';
            else if (item.quantity <= item.reorder_level) stockStatus = 'Low Stock';

            return {
                ...item,
                status: stockStatus
            };
        });

        if (status) {
            if (status === 'Low Stock') {
                filteredData = filteredData.filter(i => i.status === 'Low Stock');
            } else if (status === 'Out of Stock') {
                filteredData = filteredData.filter(i => i.status === 'Out of Stock');
            }
        }

        res.status(200).json(filteredData);
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ message: 'Internal server error while fetching inventory.' });
    }
};

/**
 * Fetch single inventory item details including batches and history.
 * @route GET /api/inventory/:id
 */
export const fetchInventoryItemDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Item
        const { data: item, error: itemError } = await supabase
            .from('inventory')
            .select('*, suppliers(supplier_name)')
            .eq('id', id)
            .single();

        if (itemError) throw itemError;

        // 2. Get Batches (active only or all? Let's get all sorted by expiry)
        const { data: batches, error: batchError } = await supabase
            .from('inventory_batches')
            .select('*')
            .eq('inventory_id', id)
            .gt('quantity', 0) // Only active batches
            .order('expiry_date', { ascending: true });

        if (batchError && batchError.code !== 'PGRST116') throw batchError;

        // 3. Get History (last 50)
        const { data: history, error: historyError } = await supabase
            .from('stock_history')
            .select('*')
            .eq('inventory_id', id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (historyError) throw historyError;

        res.status(200).json({
            ...item,
            batches: batches || [],
            history: history || []
        });

    } catch (err) {
        console.error('Error fetching item details:', err);
        res.status(500).json({ message: 'Internal server error while fetching details.' });
    }
};

/**
 * Add new inventory item or add stock to existing.
 * @route POST /api/inventory
 */
export const addInventoryItem = async (req, res) => {
    try {
        const {
            ingredient_name,
            item_code,
            category,
            quantity,
            unit,
            reorder_level,
            supplier_info,
            storage_location,
            expiry_date,
            batch_code,
            method, // 'MANUAL' or 'SCAN'
            admin_name,
            supplier_id
        } = req.body;

        if (!ingredient_name) {
            return res.status(400).json({ message: 'Ingredient name is required' });
        }

        // Check if item exists by code or name
        let itemId;
        let startQty = 0;

        // Construct the query string carefully
        // We use double quotes for values with spaces/special characters
        let orQuery = `ingredient_name.ilike."${ingredient_name}"`;
        if (item_code) {
            orQuery += `,item_code.eq."${item_code}"`;
        }

        const { data: existing } = await supabase
            .from('inventory')
            .select('id, quantity')
            .or(orQuery)
            .maybeSingle();

        if (existing) {
            // Update existing
            itemId = existing.id;
            startQty = existing.quantity;
            const newQty = parseFloat(startQty) + parseFloat(quantity);

            const { error: updateError } = await supabase
                .from('inventory')
                .update({
                    quantity: newQty,
                    last_updated: new Date()
                })
                .eq('id', itemId);

            if (updateError) throw updateError;
        } else {
            // Create new
            const { data: newItem, error: createError } = await supabase
                .from('inventory')
                .insert([{
                    ingredient_name,
                    item_code,
                    category,
                    quantity,
                    unit,
                    reorder_level: reorder_level || 10,
                    supplier_info,
                    supplier_id,
                    storage_location
                }])
                .select()
                .single();

            if (createError) throw createError;
            itemId = newItem.id;
        }

        // Add Batch
        if (expiry_date) {
            await supabase.from('inventory_batches').insert([{
                inventory_id: itemId,
                batch_code: batch_code || 'BATCH-' + Date.now(),
                quantity: quantity,
                expiry_date
            }]);
        }

        // Log History
        await supabase.from('stock_history').insert([{
            inventory_id: itemId,
            action: 'ADDED',
            quantity: quantity,
            previous_quantity: startQty,
            new_quantity: parseFloat(startQty) + parseFloat(quantity),
            method: method || 'MANUAL',
            admin_name: admin_name || 'Admin',
            notes: existing ? 'Added stock to existing item' : 'Created new item'
        }]);

        res.status(201).json({ message: 'Inventory updated successfully', id: itemId });

    } catch (err) {
        console.error('Error adding inventory:', err);
        res.status(500).json({ message: 'Internal server error while adding inventory.' });
    }
};

/**
 * Update inventory item details (edit info).
 * @route PUT /api/inventory/:id
 */
export const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly via this endpoint if any (like quantity which should be via adjustments)
        // But for "Edit" action, we might allow changing name, category, etc.
        // We'll exclude 'quantity' from here to force using 'adjust' or 'add' logic, or handle it carefully.
        // For simplicity, we allow basic info updates here.

        const { error } = await supabase
            .from('inventory')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ message: 'Item updated successfully' });
    } catch (err) {
        console.error('Error updating inventory:', err);
        res.status(500).json({ message: 'Internal server error while updating inventory.' });
    }
};

/**
 * Delete inventory item.
 * @route DELETE /api/inventory/:id
 */
export const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


/**
 * Fetch all inventory categories.
 * @route GET /api/inventory/categories
 */
export const fetchInventoryCategories = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('inventory_categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching inventory categories:', err);
        res.status(500).json({ message: 'Internal server error fetching categories.' });
    }
};

/**
 * Create a new inventory category.
 * @route POST /api/inventory/categories
 */
export const createInventoryCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Category Name is required.' });

        const { data, error } = await supabase
            .from('inventory_categories')
            .insert([{ name }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating category:', err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Category already exists.' });
        }
        res.status(500).json({ message: 'Internal server error creating category.' });
    }
};

/**
 * Delete an inventory category.
 * @route DELETE /api/inventory/categories/:id
 */
export const deleteInventoryCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('inventory_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ message: 'Internal server error deleting category.' });
    }
};
