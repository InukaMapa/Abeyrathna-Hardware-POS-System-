import { supabase } from '../config/db.js';
import * as inventoryService from '../services/inventoryService.js';

const buildLedgerEntry = ({
    batch_id,
    inventory_id,
    quantity,
    buying_price,
    selling_price,
    storage_location,
    expiry_date,
    notes
}) => ({
    batch_id,
    inventory_id,
    quantity_added: parseFloat(quantity),
    quantity_remaining: parseFloat(quantity),
    buying_price_at_time: parseFloat(buying_price || 0),
    selling_price_at_time: parseFloat(selling_price || 0),
    storage_location: storage_location || null,
    expiry_date: expiry_date || null,
    notes: notes || null
});

const insertBatchLedger = async (ledgerEntry) => {
    const { error } = await supabase.from('inventory_batch_items').insert([ledgerEntry]);

    if (!error) return;

    const missingLedgerColumn = error.code === 'PGRST204' || /column|schema cache/i.test(error.message || '');
    if (!missingLedgerColumn) throw error;

    const fallbackEntry = {
        batch_id: ledgerEntry.batch_id,
        inventory_id: ledgerEntry.inventory_id,
        quantity_added: ledgerEntry.quantity_added,
        quantity_remaining: ledgerEntry.quantity_remaining,
        buying_price_at_time: ledgerEntry.buying_price_at_time
    };
    const { error: fallbackError } = await supabase.from('inventory_batch_items').insert([fallbackEntry]);
    if (fallbackError) throw fallbackError;
};

const backfillMissingBatchPrices = async (inventoryId, existingItem) => {
    const previousSellingPrice = parseFloat(existingItem?.selling_price || 0);
    const previousBuyingPrice = parseFloat(existingItem?.buying_price || 0);

    if (previousSellingPrice > 0) {
        const { error } = await supabase
            .from('inventory_batch_items')
            .update({ selling_price_at_time: previousSellingPrice })
            .eq('inventory_id', inventoryId)
            .or('selling_price_at_time.is.null,selling_price_at_time.eq.0');

        if (error && error.code !== 'PGRST204') {
            console.warn('Could not backfill previous selling prices:', error.message);
        }
    }

    if (previousBuyingPrice > 0) {
        const { error } = await supabase
            .from('inventory_batch_items')
            .update({ buying_price_at_time: previousBuyingPrice })
            .eq('inventory_id', inventoryId)
            .or('buying_price_at_time.is.null,buying_price_at_time.eq.0');

        if (error && error.code !== 'PGRST204') {
            console.warn('Could not backfill previous buying prices:', error.message);
        }
    }
};

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
            query = query.or(`ingredient_name.ilike.%${search}%,item_code.ilike.%${search}%`);
        }
        if (category && category !== 'All') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Auto-generate barcodes for any existing items missing one
        if (data && data.length > 0) {
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                if (!item.item_code || item.item_code.trim() === '') {
                    const generatedCode = 'HW' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
                    try {
                        await supabase
                            .from('inventory')
                            .update({ item_code: generatedCode })
                            .eq('id', item.id);
                        item.item_code = generatedCode;
                    } catch (dbErr) {
                        console.error(`Failed to auto-generate item_code for item ${item.id}:`, dbErr);
                    }
                }
            }
        }

        
        let filteredData = data.map(item => {
            let stockStatus = 'In Stock';
            if (item.quantity === 0) stockStatus = 'Out of Stock';
            else if (item.quantity <= item.reorder_level) stockStatus = 'Low Stock';

            return {
                ...item,
                fifo_selling_price: parseFloat(item.selling_price || 0),
                stock_price_tiers: [],
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
            .select('*, suppliers(supplier_name, company_name, phone_number, email, address)')
            .eq('id', id)
            .single();

        if (itemError) throw itemError;

        // Auto-generate barcode if missing
        if (item && (!item.item_code || item.item_code.trim() === '')) {
            const generatedCode = 'HW' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
            try {
                await supabase
                    .from('inventory')
                    .update({ item_code: generatedCode })
                    .eq('id', item.id);
                item.item_code = generatedCode;
            } catch (dbErr) {
                console.error(`Failed to auto-generate item_code in details for item ${id}:`, dbErr);
            }
        }

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
            supplier_summary: item.suppliers,
            batches: [],
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
            
            method, // 'MANUAL' or 'SCAN'
            admin_name,
            supplier_id,
            selling_price,
            buying_price
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
            .select('id, quantity, buying_price, selling_price, storage_location')
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
                    
                    buying_price: buying_price || existing.buying_price || 0,
                    selling_price: selling_price || existing.selling_price || 0,
                    storage_location: storage_location || existing.storage_location || null,
                    last_updated: new Date()
                })
                .eq('id', itemId);

            if (updateError) throw updateError;
        } else {
            // Create new
            const finalItemCode = item_code && item_code.trim() !== ''
                ? item_code
                : 'HW' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);

            const { data: newItem, error: createError } = await supabase
                .from('inventory')
                .insert([{
                    ingredient_name,
                    item_code: finalItemCode,
                    category,
                    quantity,
                    unit,
                    reorder_level: reorder_level || 10,
                    selling_price: selling_price || 0,
                    buying_price: buying_price || 0,
                    supplier_info,
                    supplier_id,
                    storage_location
                }])
                .select()
                .single();

            if (createError) throw createError;
            itemId = newItem.id;
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
 * Receive a new supplier order for an existing inventory item.
 * @route POST /api/inventory/:id/receive
 */
export const receiveInventoryStock = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            quantity,
            batch_id,
            buying_price,
            selling_price,
            storage_location,
            expiry_date,
            method,
            admin_name,
            notes
        } = req.body;

        const receivedQty = parseFloat(quantity);
        if (!Number.isFinite(receivedQty) || receivedQty <= 0) {
            return res.status(400).json({ message: 'Quantity to add must be greater than zero.' });
        }

        const { data: existing, error: fetchError } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }

        const previousQty = parseFloat(existing.quantity || 0);
        const newQty = previousQty + receivedQty;

        const updateData = {
            quantity: newQty,
            batch_id,
            buying_price: buying_price || existing.buying_price || 0,
            selling_price: selling_price || existing.selling_price || 0,
            storage_location: storage_location || existing.storage_location || null,
            supplier_id: existing.supplier_id || null,
            last_updated: new Date()
        };

        const { data: updatedItem, error: updateError } = await supabase
            .from('inventory')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        await supabase.from('stock_history').insert([{
            inventory_id: id,
            action: 'ADDED',
            quantity: receivedQty,
            previous_quantity: previousQty,
            new_quantity: newQty,
            method: method || 'SUPPLIER',
            admin_name: admin_name || 'Admin',
            notes: notes || 'Received new supplier order'
        }]);

        await inventoryService.updateInventoryQuantity(id, newQty);

        res.status(200).json({
            message: 'Inventory stock received successfully.',
            item: updatedItem
        });
    } catch (err) {
        console.error('Error receiving inventory stock:', err);
        res.status(500).json({ message: 'Internal server error while receiving stock.' });
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

/**
 * Fetch all pending payout requests
 */
export const fetchPayoutRequests = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('supplier_payout_requests')
            .select('*, suppliers(supplier_name)')
            .eq('status', 'PENDING')
            .order('authorized_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching payouts:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Mark payout as completed by cashier
 */
export const completePayoutRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('supplier_payout_requests')
            .update({
                status: 'COMPLETED',
                completed_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error('Error completing payout:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

