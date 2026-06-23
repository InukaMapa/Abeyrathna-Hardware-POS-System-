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
        const { search, category, status, supplier_id } = req.query;

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
        if (supplier_id) {
            query = query.eq('supplier_id', supplier_id);
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

            let tiers = [];
            if (item.supplier_info) {
                try {
                    tiers = JSON.parse(item.supplier_info);
                    if (!Array.isArray(tiers)) tiers = [];
                } catch (e) {
                    tiers = [];
                }
            }

            // Fallback for existing stock if tiers is empty and quantity > 0
            if (tiers.length === 0 && parseFloat(item.quantity || 0) > 0) {
                tiers.push({
                    id: 'tier_init_' + item.id,
                    quantity: parseFloat(item.quantity),
                    quantity_remaining: parseFloat(item.quantity),
                    buying_price: parseFloat(item.buying_price || 0),
                    selling_price: parseFloat(item.selling_price || 0),
                    created_at: item.last_updated || new Date()
                });
            }

            // Find the selling price of the first active (remaining > 0) load
            const activeTier = tiers.find(t => parseFloat(t.quantity_remaining || 0) > 0);
            const fifoSellingPrice = activeTier ? parseFloat(activeTier.selling_price || 0) : parseFloat(item.selling_price || 0);

            return {
                ...item,
                fifo_selling_price: fifoSellingPrice,
                stock_price_tiers: tiers,
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

const handleSupplierPaymentOnPurchase = async (supplierId, qty, price, itemName) => {
    if (!supplierId || !qty || qty <= 0 || !price || price <= 0) return;
    
    try {
        const cost = parseFloat(qty) * parseFloat(price);
        
        // Check if there is an existing PENDING payout request for this supplier
        const { data: existingPayout, error: fetchError } = await supabase
            .from('supplier_payout_requests')
            .select('*')
            .eq('supplier_id', supplierId)
            .eq('status', 'PENDING')
            .maybeSingle();
            
        if (fetchError) {
            console.error('Error fetching existing payout request:', fetchError);
            return;
        }
        
        if (existingPayout) {
            // Update existing payout request
            const newAmount = parseFloat(existingPayout.amount || 0) + cost;
            const newNotes = `${existingPayout.notes || ''}, Added ${qty}x ${itemName} (Rs. ${price} each)`.slice(0, 1000);
            
            const { error: updateError } = await supabase
                .from('supplier_payout_requests')
                .update({
                    amount: newAmount,
                    notes: newNotes,
                    authorized_at: new Date().toISOString()
                })
                .eq('id', existingPayout.id);
                
            if (updateError) {
                console.error('Error updating supplier payout request:', updateError);
            }
        } else {
            // Create a new payout request
            const payoutNumber = 'PAY-' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
            const notes = `Purchased ${qty}x ${itemName} (Rs. ${price} each)`;
            
            const { error: insertError } = await supabase
                .from('supplier_payout_requests')
                .insert([{
                    payout_number: payoutNumber,
                    supplier_id: supplierId,
                    amount: cost,
                    status: 'PENDING',
                    notes: notes,
                    authorized_at: new Date().toISOString()
                }]);
                
            if (insertError) {
                console.error('Error inserting supplier payout request:', insertError);
            }
        }
    } catch (err) {
        console.error('Unexpected error in handleSupplierPaymentOnPurchase:', err);
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
            startQty = parseFloat(existing.quantity || 0);
            const newQty = startQty + parseFloat(quantity || 0);
            let tiers = [];
            if (existing.supplier_info) {
                try {
                    tiers = JSON.parse(existing.supplier_info);
                    if (!Array.isArray(tiers)) tiers = [];
                } catch (e) {
                    tiers = [];
                }
            }

            // Fallback for existing stock if tiers total remaining is less than current quantity
            const sumTiersQty = tiers.reduce((sum, t) => sum + parseFloat(t.quantity_remaining || 0), 0);
            if (parseFloat(existing.quantity || 0) > sumTiersQty) {
                const fallbackQty = parseFloat(existing.quantity || 0) - sumTiersQty;
                tiers.unshift({
                    id: 'tier_fallback_' + Date.now(),
                    quantity: fallbackQty,
                    quantity_remaining: fallbackQty,
                    buying_price: parseFloat(existing.buying_price || 0),
                    selling_price: parseFloat(existing.selling_price || 0),
                    created_at: existing.last_updated || new Date()
                });
            }

            // Add the new load/tier
            tiers.push({
                id: 'tier_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                quantity: parseFloat(quantity || 0),
                quantity_remaining: parseFloat(quantity || 0),
                buying_price: parseFloat(buying_price || existing.buying_price || 0) || 0,
                selling_price: parseFloat(selling_price || existing.selling_price || 0) || 0,
                created_at: new Date()
            });

            const { error: updateError } = await supabase
                .from('inventory')
                .update({
                    quantity: newQty,
                    buying_price: buying_price || existing.buying_price || 0,
                    selling_price: selling_price || existing.selling_price || 0,
                    storage_location: storage_location || existing.storage_location || null,
                    supplier_info: JSON.stringify(tiers),
                    last_updated: new Date()
                })
                .eq('id', itemId);

            if (updateError) throw updateError;
        } else {
            // Create new
            const finalItemCode = item_code && item_code.trim() !== ''
                ? item_code
                : 'HW' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);

            const initialTier = {
                id: 'tier_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                quantity: parseFloat(quantity || 0),
                quantity_remaining: parseFloat(quantity || 0),
                buying_price: parseFloat(buying_price || 0),
                selling_price: parseFloat(selling_price || 0),
                created_at: new Date()
            };

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
                    supplier_info: JSON.stringify([initialTier]),
                    supplier_id,
                    storage_location
                }])
                .select()
                .single();

            if (createError) throw createError;
            itemId = newItem.id;
        }

        // Log History
        const notesObj = {
            notes: existing ? 'Added stock to existing item' : 'Created new item',
            buying_price: buying_price || (existing && existing.buying_price) || 0,
            selling_price: selling_price || (existing && existing.selling_price) || 0
        };

        await supabase.from('stock_history').insert([{
            inventory_id: itemId,
            action: 'ADDED',
            quantity: quantity,
            previous_quantity: startQty,
            new_quantity: parseFloat(startQty) + parseFloat(quantity),
            method: method || 'MANUAL',
            admin_name: admin_name || 'Admin',
            notes: JSON.stringify(notesObj)
        }]);

        const finalSupplierId = supplier_id || (existing && existing.supplier_id);
        if (finalSupplierId) {
            await handleSupplierPaymentOnPurchase(
                finalSupplierId, 
                quantity, 
                buying_price || (existing && existing.buying_price) || 0, 
                ingredient_name
            );
        }

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

        let tiers = [];
        if (existing.supplier_info) {
            try {
                tiers = JSON.parse(existing.supplier_info);
                if (!Array.isArray(tiers)) tiers = [];
            } catch (e) {
                tiers = [];
            }
        }

        // Fallback for existing stock if tiers total remaining is less than current quantity
        const sumTiersQty = tiers.reduce((sum, t) => sum + parseFloat(t.quantity_remaining || 0), 0);
        if (previousQty > sumTiersQty) {
            const fallbackQty = previousQty - sumTiersQty;
            tiers.unshift({
                id: 'tier_fallback_' + Date.now(),
                quantity: fallbackQty,
                quantity_remaining: fallbackQty,
                buying_price: parseFloat(existing.buying_price || 0),
                selling_price: parseFloat(existing.selling_price || 0),
                created_at: existing.last_updated || new Date()
            });
        }

        // Add the new load/tier
        tiers.push({
            id: 'tier_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            quantity: receivedQty,
            quantity_remaining: receivedQty,
            buying_price: parseFloat(buying_price || existing.buying_price || 0) || 0,
            selling_price: parseFloat(selling_price || existing.selling_price || 0) || 0,
            created_at: new Date()
        });

        const updateData = {
            quantity: newQty,
            batch_id,
            buying_price: buying_price || existing.buying_price || 0,
            selling_price: selling_price || existing.selling_price || 0,
            storage_location: storage_location || existing.storage_location || null,
            supplier_id: existing.supplier_id || null,
            supplier_info: JSON.stringify(tiers),
            last_updated: new Date()
        };

        const { data: updatedItem, error: updateError } = await supabase
            .from('inventory')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        const notesObj = {
            notes: notes || 'Received new supplier order',
            buying_price: buying_price || existing.buying_price || 0,
            selling_price: selling_price || existing.selling_price || 0
        };

        await supabase.from('stock_history').insert([{
            inventory_id: id,
            action: 'ADDED',
            quantity: receivedQty,
            previous_quantity: previousQty,
            new_quantity: newQty,
            method: method || 'SUPPLIER',
            admin_name: admin_name || 'Admin',
            notes: JSON.stringify(notesObj)
        }]);

        await inventoryService.updateInventoryQuantity(id, newQty);

        const finalSupplierId = existing.supplier_id;
        if (finalSupplierId) {
            await handleSupplierPaymentOnPurchase(
                finalSupplierId, 
                receivedQty, 
                buying_price || existing.buying_price || 0, 
                existing.ingredient_name
            );
        }

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

/**
 * Emulated batches GET endpoint using supplier_payout_requests.
 * @route GET /api/inventory/batches
 */
export const fetchEmulatedBatches = async (req, res) => {
    try {
        const { data: payouts, error: fetchError } = await supabase
            .from('supplier_payout_requests')
            .select('*, suppliers(supplier_name)')
            .order('authorized_at', { ascending: false });

        if (fetchError) throw fetchError;

        const emulatedBatches = (payouts || []).map(p => {
            const amount = parseFloat(p.amount || 0);

            // Parse partial payments from notes
            let paid_amount = 0;
            let notesTextForParsing = p.notes || '';
            if (p.notes && p.notes.startsWith('{')) {
                try {
                    const parsed = JSON.parse(p.notes);
                    paid_amount = parseFloat(parsed.paid_amount || 0);
                    notesTextForParsing = parsed.legacy_notes || '';
                } catch (e) {
                    console.error('Failed to parse notes in fetchEmulatedBatches:', e);
                }
            }

            const isCompleted = p.status === 'COMPLETED';
            if (isCompleted && paid_amount === 0) {
                paid_amount = amount;
            }

            const remaining_balance = Math.max(0, amount - paid_amount);
            const isPartial = paid_amount > 0 && remaining_balance > 0;
            const paymentStatus = remaining_balance <= 0 ? 'PAID' : (isPartial ? 'PARTIAL' : 'UNPAID');

            // Parse items from notes
            const parseNotesToItems = (notes) => {
                if (!notes) return [];
                const regex = /(?:Purchased|Added)\s+(\d+(?:\.\d+)?)\s*x\s+(.*?)\s*\(Rs\.\s*(\d+(?:\.\d+)?)\s*each\)/gi;
                const items = [];
                let match;
                while ((match = regex.exec(notes)) !== null) {
                    const qty = parseFloat(match[1]);
                    const name = match[2].trim();
                    const price = parseFloat(match[3]);
                    items.push({
                        inventory_id: name,
                        buying_price_at_time: price,
                        quantity_added: qty,
                        inventory: {
                            ingredient_name: name,
                            item_code: ''
                        }
                    });
                }
                return items;
            };

            return {
                id: p.id,
                db_id: p.id,
                batch_number: p.payout_number,
                supplier_id: p.supplier_id,
                net_value: amount,
                paid_amount: paid_amount,
                remaining_balance: remaining_balance,
                batch_date: p.authorized_at,
                payment_status: paymentStatus,
                status: remaining_balance <= 0 ? 'COMPLETED' : 'PENDING',
                suppliers: {
                    id: p.supplier_id,
                    supplier_name: p.suppliers?.supplier_name || 'Unknown Supplier'
                },
                notes: p.notes,
                inventory_batch_items: parseNotesToItems(notesTextForParsing)
            };
        });

        res.status(200).json(emulatedBatches);
    } catch (err) {
        console.error('Error fetching emulated batches:', err);
        res.status(500).json({ message: 'Internal server error while fetching payment batches.' });
    }
};

/**
 * Emulated batch POST endpoint to handle replacement/new batches.
 * @route POST /api/inventory/batches
 */
export const createEmulatedBatch = async (req, res) => {
    try {
        const { batch_number, supplier_id, net_value, notes } = req.body;

        const payoutNumber = batch_number || 'PAY-' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
        const amount = parseFloat(net_value || 0);

        const { data, error } = await supabase
            .from('supplier_payout_requests')
            .insert([{
                payout_number: payoutNumber,
                supplier_id,
                amount,
                status: amount > 0 ? 'PENDING' : 'COMPLETED',
                notes: notes || 'Emulated batch creation',
                authorized_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            id: data.id,
            batch_number: data.payout_number,
            supplier_id: data.supplier_id,
            net_value: parseFloat(data.amount || 0),
            status: data.status
        });
    } catch (err) {
        console.error('Error creating emulated batch:', err);
        res.status(500).json({ message: 'Internal server error creating payment batch.' });
    }
};

/**
 * Emulated batch pay endpoint.
 * @route POST /api/inventory/batches/:id/pay
 */
export const payEmulatedBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, method, reference, notes } = req.body;

        const { data: payout, error: getError } = await supabase
            .from('supplier_payout_requests')
            .select('*, suppliers(supplier_name)')
            .eq('id', id)
            .single();

        if (getError || !payout) {
            return res.status(404).json({ message: 'Payment record not found.' });
        }

        const payoutTotalAmount = parseFloat(payout.amount || 0);
        const newPaymentAmount = parseFloat(amount || payoutTotalAmount);

        let currentPaid = 0;
        let previousPayments = [];
        let legacyNotes = '';

        if (payout.notes) {
            if (payout.notes.startsWith('{')) {
                try {
                    const parsed = JSON.parse(payout.notes);
                    currentPaid = parseFloat(parsed.paid_amount || 0);
                    previousPayments = parsed.payments || [];
                    legacyNotes = parsed.legacy_notes || '';
                } catch (e) {
                    legacyNotes = payout.notes;
                }
            } else {
                legacyNotes = payout.notes;
            }
        }

        const newPaidAmount = currentPaid + newPaymentAmount;
        const isFullyPaid = newPaidAmount >= payoutTotalAmount;

        const paymentRecord = {
            amount: newPaymentAmount,
            method: method || 'Cash',
            reference: reference || 'N/A',
            notes: notes || '',
            date: new Date().toISOString()
        };

        const updatedPayments = [...previousPayments, paymentRecord];

        const notesJson = JSON.stringify({
            paid_amount: newPaidAmount,
            payments: updatedPayments,
            legacy_notes: legacyNotes
        });

        const updates = {
            status: isFullyPaid ? 'COMPLETED' : 'PENDING',
            completed_at: isFullyPaid ? new Date().toISOString() : null,
            payment_method: method || 'Cash',
            notes: notesJson
        };

        const { data, error } = await supabase
            .from('supplier_payout_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // If cashier logged in, automatically record as cash out
        const { role, username, userId } = req.user || {};
        if (role === 'CASHIER') {
            let cashierName = username;
            if (!cashierName && userId) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', userId)
                    .single();
                if (userData) cashierName = userData.username;
            }

            if (cashierName) {
                const { data: activeShift, error: shiftError } = await supabase
                    .from('cash_shifts')
                    .select('shift_id')
                    .eq('cashier_name', cashierName)
                    .in('status', ['OPEN', 'REPORT_SUBMITTED'])
                    .maybeSingle();

                if (shiftError) {
                    console.error('[PAYMENT] Error fetching active shift:', shiftError);
                }

                if (activeShift) {
                    const supplierName = payout.suppliers?.supplier_name || 'Supplier';
                    const reasonText = `Supplier Payment: ${supplierName} (Ref: ${payout.payout_number} via ${method || 'Cash'})`;
                    const { error: moveError } = await supabase
                        .from('cash_movements')
                        .insert({
                            shift_id: activeShift.shift_id,
                            type: 'cash_out',
                            amount: newPaymentAmount,
                            reason: reasonText
                        });
                    
                    if (moveError) {
                        console.error('[PAYMENT] Error recording automatic cash out movement:', moveError);
                    } else {
                        console.log('[PAYMENT] Automatic cash out movement recorded successfully.');
                    }
                } else {
                    console.log('[PAYMENT] No active shift found for cashier, skipped automatic cash out.');
                }
            }
        }

        res.status(200).json({
            message: isFullyPaid ? 'Payment settled successfully.' : 'Partial payment recorded successfully.',
            payout_request: {
                payout_number: data.payout_number,
                remaining_balance: Math.max(0, payoutTotalAmount - newPaidAmount)
            }
        });
    } catch (err) {
        console.error('Error settling payment:', err);
        res.status(500).json({ message: 'Internal server error while settling payment.' });
    }
};

/**
 * Emulated batch update (PUT) endpoint.
 * @route PUT /api/inventory/batches/:id
 */
export const updateEmulatedBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { net_value, notes } = req.body;

        const updates = {};
        if (net_value !== undefined) updates.amount = parseFloat(net_value);
        if (notes !== undefined) updates.notes = notes;

        const { data, error } = await supabase
            .from('supplier_payout_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            id: data.id,
            batch_number: data.payout_number,
            net_value: parseFloat(data.amount)
        });
    } catch (err) {
        console.error('Error updating payment batch:', err);
        res.status(500).json({ message: 'Internal server error updating payment batch.' });
    }
};

