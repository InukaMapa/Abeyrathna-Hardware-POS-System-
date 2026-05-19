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
            batch_id,
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
                    batch_id: batch_id || existing.batch_id, // Link to the new batch
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
                    batch_id,
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

        // 4. Record in Batch Ledger (Historical Tracking)
        if (batch_id) {
            try {
                const ledgerEntry = {
                    batch_id,
                    inventory_id: itemId,
                    quantity_added: parseFloat(quantity),
                    buying_price_at_time: parseFloat(buying_price || 0)
                };

                await supabase.from('inventory_batch_items').insert([ledgerEntry]);

                const { data: batch } = await supabase
                    .from('inventory_batches')
                    .select('batch_type')
                    .eq('id', batch_id)
                    .single();

                if (batch && batch.batch_type === 'REPLACEMENT') {
                    await supabase
                        .from('inventory_batches')
                        .update({ status: 'COMPLETED' })
                        .eq('id', batch_id);
                }
            } catch (batchErr) {
                console.warn('Batch error:', batchErr.message);
            }
        }

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

/**
 * Fetch all inventory batches.
 * @route GET /api/inventory/batches
 */
export const fetchInventoryBatches = async (req, res) => {
    try {
        // 1. Get all batches
        const { data, error } = await supabase
            .from('inventory_batches')
            .select(`
                *, 
                suppliers(supplier_name),
                inventory_batch_items(
                    quantity_added,
                    buying_price_at_time,
                    inventory(ingredient_name, unit)
                ),
                supplier_returns!inventory_batches_return_id_fkey(
                    id, 
                    quantity, 
                    inventory(ingredient_name, item_code, buying_price, selling_price, category, unit)
                ),
                supplier_payout_requests(
                    id,
                    payout_number,
                    amount,
                    payment_method,
                    status,
                    authorized_at
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. Get all ledger entries to calculate actual totals per batch
        const { data: ledger, error: ledgerError } = await supabase
            .from('inventory_batch_items')
            .select('batch_id, quantity_added, buying_price_at_time');

        if (ledgerError) throw ledgerError;

        // 3. Map actuals to batches
        const result = data.map(b => {
            const items = ledger.filter(i => i.batch_id === b.id);
            const actualTotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity_added) * parseFloat(item.buying_price_at_time || 0)), 0);

            return {
                ...b,
                supplier_name: b.suppliers?.supplier_name || 'N/A',
                actual_item_count: items.length,
                actual_transaction_value: actualTotal,
                calc_status: (items.length >= b.total_items) ? 'COMPLETED' : b.status
            };
        });

        res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching batches:', err);
        res.status(500).json({ message: 'Internal server error fetching batches.' });
    }
};

/**
 * Create a new inventory batch.
 * @route POST /api/inventory/batches
 */
export const createInventoryBatch = async (req, res) => {
    try {
        const { batch_number, supplier_id, batch_date, net_value, total_items, batch_type, return_id } = req.body;

        if (!batch_number || !supplier_id) {
            return res.status(400).json({ message: 'Batch number and Supplier are required.' });
        }

        const { data, error } = await supabase
            .from('inventory_batches')
            .insert([{
                batch_number,
                supplier_id,
                batch_date,
                net_value: parseFloat(net_value) || 0,
                total_items: parseInt(total_items) || 0,
                batch_type: batch_type || 'STANDARD',
                return_id: return_id || null
            }])
            .select('*, suppliers(supplier_name)')
            .single();

        if (error) throw error;

        // Flatten for frontend
        const result = {
            ...data,
            supplier_name: data.suppliers?.supplier_name || 'N/A'
        };

        res.status(201).json(result);
    } catch (err) {
        console.error('Error creating batch:', err);
        res.status(500).json({ message: 'Internal server error creating batch.' });
    }
};

/**
 * Update a batch (e.g., correct Net Value or Status)
 * @route PUT /api/inventory/batches/:id
 */
export const updateInventoryBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { net_value, status } = req.body;

        const { data, error } = await supabase
            .from('inventory_batches')
            .update({
                net_value: parseFloat(net_value),
                status
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error('Error updating batch:', err);
        res.status(500).json({ message: 'Internal server error updating batch.' });
    }
};
/**
 * Process payment for a batch
 * @route POST /api/inventory/batches/:id/pay
 */
export const settleBatchPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, method, reference, notes, type } = req.body;
        const authorized_by = req.user.id;

        // 1. Get existing batch to calculate balance
        const { data: batch, error: fetchError } = await supabase
            .from('inventory_batches')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const currentPaid = parseFloat(batch.paid_amount || 0);
        const newPayment = parseFloat(amount || 0);
        const totalPaid = currentPaid + newPayment;
        const netValue = parseFloat(batch.net_value || 0);

        // Determine status
        let payment_status = batch.payment_status || 'UNPAID';
        if (type === 'Full' || totalPaid >= netValue) {
            payment_status = 'PAID';
        } else if (totalPaid > 0) {
            payment_status = 'PARTIAL';
        }

        const updateData = {
            payment_status,
            paid_amount: totalPaid,
            payment_date: new Date().toISOString(),
            payment_method: method || batch.payment_method,
            payment_reference: reference || batch.payment_reference,
            payment_notes: notes || batch.payment_notes
        };

        // 2. Update the batch
        const { data: updatedBatch, error: updateError } = await supabase
            .from('inventory_batches')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        // 3. Create Payout Request for Cashier
        const payoutNumber = `PAY-${Math.floor(10000 + Math.random() * 90000)}`;
        const { data: payoutRequest, error: payoutError } = await supabase
            .from('supplier_payout_requests')
            .insert({
                payout_number: payoutNumber,
                batch_id: id,
                supplier_id: batch.supplier_id,
                amount: newPayment,
                authorized_by,
                status: 'PENDING',
                payment_method: method || 'Cash',
                notes: notes || ''
            })
            .select()
            .single();

        // If table doesn't exist, we still return the updated batch but without payout info
        // (Resilience for migration delay)
        if (payoutError) {
            console.warn('Payout Request table error:', payoutError.message);
            return res.status(200).json({
                ...updatedBatch,
                payout_warning: "Payout request table missing. Transaction recorded locally."
            });
        }

        res.status(200).json({
            ...updatedBatch,
            payout_request: payoutRequest
        });
    } catch (err) {
        console.error('Error settling batch:', err);
        res.status(500).json({ message: 'Internal server error settling batch.', error: err.message });
    }
};

/**
 * Fetch all pending payout requests
 */
export const fetchPayoutRequests = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('supplier_payout_requests')
            .select('*, suppliers(supplier_name), inventory_batches(batch_number)')
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

/**
 * Fetch all pending refund batches (Cash In)
 */
export const fetchRefundBatches = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('refund_batches')
            .select('*, suppliers(supplier_name), supplier_returns(return_number)')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching refunds:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Mark refund batch as completed/received by cashier
 */
export const completeRefundBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const cashier_id = req.user.id;

        const { data, error } = await supabase
            .from('refund_batches')
            .update({
                status: 'RECEIVED',
                received_at: new Date().toISOString(),
                cashier_id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('supplier_returns')
            .update({
                status: 'COMPLETED',
                notes: `Cashier Accepted Refund: ${data.batch_number}`
            })
            .eq('id', data.return_id);

        res.status(200).json(data);
    } catch (err) {
        console.error('Error completing refund:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};
