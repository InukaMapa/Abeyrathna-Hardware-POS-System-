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

const handleSupplierPaymentOnPurchase = async (supplierId, qty, price, itemName, initialPayment = 0, user = null) => {
    if (!supplierId || !qty || qty <= 0 || !price || price <= 0) return;
    
    try {
        const cost = parseFloat(qty) * parseFloat(price);
        const firstPay = Math.max(0, parseFloat(initialPayment || 0));
        const newItemNote = `Purchased ${qty}x ${itemName} (Rs. ${price} each)`;

        const userRole = user?.role || 'ADMIN';
        let paidByRole = userRole === 'ADMIN' ? 'Admin' : 'Cashier';
        let paidByName = user?.username || paidByRole;

        if (user?.userId) {
            const { data: userData } = await supabase
                .from('users')
                .select('username, full_name, role')
                .eq('id', user.userId)
                .maybeSingle();

            if (userData) {
                paidByName = userData.full_name || userData.username;
                if (userData.role) paidByRole = userData.role === 'ADMIN' ? 'Admin' : 'Cashier';
            }
        }

        // If Cashier made initial payment, record cash out movement in active shift
        if (firstPay > 0 && userRole === 'CASHIER' && paidByName) {
            const { data: activeShift } = await supabase
                .from('cash_shifts')
                .select('shift_id')
                .in('status', ['OPEN', 'REPORT_SUBMITTED'])
                .or(`cashier_name.ilike."${paidByName}"`)
                .maybeSingle();

            if (activeShift) {
                await supabase.from('cash_movements').insert({
                    shift_id: activeShift.shift_id,
                    type: 'cash_out',
                    amount: firstPay,
                    reason: `First Payment for Supplier on ${qty}x ${itemName}`,
                    time: new Date().toISOString()
                });
            }
        }

        // Find existing pending payout request for this supplier
        const { data: existingPayout, error: selectError } = await supabase
            .from('supplier_payout_requests')
            .select('*')
            .eq('supplier_id', supplierId)
            .eq('status', 'PENDING')
            .order('authorized_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        if (selectError) {
            console.error('Error fetching existing payout request:', selectError);
        }

        const firstPaymentObj = {
            amount: firstPay,
            method: 'Cash',
            reference: 'First Payment',
            notes: `First payment on purchase of ${qty}x ${itemName}`,
            date: new Date().toISOString(),
            paid_by_role: paidByRole,
            paid_by_name: paidByName
        };
        
        if (existingPayout) {
            // Update existing payout request amount and notes
            const currentAmount = parseFloat(existingPayout.amount || 0);
            const newAmount = currentAmount + cost;
            
            let currentPaid = 0;
            let paymentsList = [];
            let legacyNotes = '';

            if (existingPayout.notes && existingPayout.notes.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(existingPayout.notes);
                    currentPaid = parseFloat(parsed.paid_amount || 0);
                    paymentsList = Array.isArray(parsed.payments) ? parsed.payments : [];
                    legacyNotes = parsed.legacy_notes || '';
                } catch (e) {
                    legacyNotes = existingPayout.notes || '';
                }
            } else {
                legacyNotes = existingPayout.notes || '';
            }

            if (legacyNotes) {
                legacyNotes += '\n' + newItemNote;
            } else {
                legacyNotes = newItemNote;
            }

            const newPaid = currentPaid + firstPay;
            if (firstPay > 0) {
                paymentsList.push(firstPaymentObj);
            }

            let updatedNotes = '';
            if (newPaid > 0 || paymentsList.length > 0) {
                updatedNotes = JSON.stringify({
                    paid_amount: newPaid,
                    payments: paymentsList,
                    legacy_notes: legacyNotes
                });
            } else {
                updatedNotes = legacyNotes;
            }

            const isCompleted = newPaid >= newAmount;
            
            const { error: updateError } = await supabase
                .from('supplier_payout_requests')
                .update({
                    amount: newAmount,
                    status: isCompleted ? 'COMPLETED' : 'PENDING',
                    completed_at: isCompleted ? new Date().toISOString() : null,
                    notes: updatedNotes
                })
                .eq('id', existingPayout.id);
                
            if (updateError) {
                console.error('Error updating supplier payout request:', updateError);
            }
        } else {
            // Create a new payout request
            const payoutNumber = 'PAY-' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
            const isCompleted = firstPay >= cost;
            
            let initialNotes = newItemNote;
            if (firstPay > 0) {
                initialNotes = JSON.stringify({
                    paid_amount: firstPay,
                    payments: [firstPaymentObj],
                    legacy_notes: newItemNote
                });
            }

            const { error: insertError } = await supabase
                .from('supplier_payout_requests')
                .insert([{
                    payout_number: payoutNumber,
                    supplier_id: supplierId,
                    amount: cost,
                    status: isCompleted ? 'COMPLETED' : 'PENDING',
                    completed_at: isCompleted ? new Date().toISOString() : null,
                    notes: initialNotes,
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
            buying_price,
            payment_for_supplier
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
                ingredient_name,
                payment_for_supplier,
                req.user
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
            notes,
            payment_for_supplier,
            is_replacement,
            return_id
        } = req.body;

        const isReplacementMode = is_replacement || method === 'REPLACEMENT';

        if (req.user?.role === 'CASHIER' && !isReplacementMode) {
            return res.status(403).json({ message: 'Access denied. Cashiers can only add stock for replacement items.' });
        }

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

        let returnRecord = null;
        let returnTierId = null;
        if (return_id) {
            try {
                const { data: ret } = await supabase
                    .from('supplier_returns')
                    .select('*')
                    .eq('id', return_id)
                    .maybeSingle();
                if (ret) {
                    returnRecord = ret;
                    if (ret.notes && ret.notes.startsWith('{')) {
                        try {
                            const parsedRetNotes = JSON.parse(ret.notes);
                            returnTierId = parsedRetNotes.tier_id;
                        } catch (e) {}
                    }
                }
            } catch (e) {
                console.error('Error fetching return record in receiveInventoryStock:', e);
            }
        }

        let tiers = [];
        if (existing.supplier_info) {
            try {
                tiers = JSON.parse(existing.supplier_info);
                if (!Array.isArray(tiers)) tiers = [];
            } catch (e) {
                tiers = [];
            }
        }

        if (isReplacementMode) {
            let targetTier = null;
            if (returnTierId) {
                targetTier = tiers.find(t => t.id === returnTierId);
            }
            if (!targetTier) {
                const targetPrice = parseFloat(buying_price || existing.buying_price || 0);
                targetTier = tiers.find(t => parseFloat(t.buying_price || 0) === targetPrice);
            }
            if (!targetTier && tiers.length > 0) {
                targetTier = tiers[tiers.length - 1];
            }

            if (targetTier) {
                targetTier.quantity = parseFloat(targetTier.quantity || 0) + receivedQty;
                targetTier.quantity_remaining = parseFloat(targetTier.quantity_remaining || 0) + receivedQty;
            } else {
                tiers.push({
                    id: 'tier_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                    quantity: receivedQty,
                    quantity_remaining: receivedQty,
                    buying_price: parseFloat(buying_price || existing.buying_price || 0) || 0,
                    selling_price: parseFloat(selling_price || existing.selling_price || 0) || 0,
                    created_at: new Date()
                });
            }
        } else {
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
        }

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

        const defaultNote = isReplacementMode
            ? (returnRecord ? `Replacement for return ${returnRecord.return_number}` : 'Replacement item restocked')
            : 'Received new supplier order';

        const notesObj = {
            notes: notes || defaultNote,
            buying_price: buying_price || existing.buying_price || 0,
            selling_price: selling_price || existing.selling_price || 0
        };

        await supabase.from('stock_history').insert([{
            inventory_id: id,
            action: 'ADDED',
            quantity: receivedQty,
            previous_quantity: previousQty,
            new_quantity: newQty,
            method: method || (isReplacementMode ? 'REPLACEMENT' : 'SUPPLIER'),
            admin_name: admin_name || 'Admin',
            notes: JSON.stringify(notesObj)
        }]);

        await inventoryService.updateInventoryQuantity(id, newQty);

        const finalSupplierId = existing.supplier_id;
        if (finalSupplierId && !isReplacementMode) {
            await handleSupplierPaymentOnPurchase(
                finalSupplierId, 
                receivedQty, 
                buying_price || existing.buying_price || 0, 
                existing.ingredient_name,
                payment_for_supplier,
                req.user
            );
        }

        if (return_id || isReplacementMode) {
            try {
                const targetReturnId = return_id;
                if (targetReturnId) {
                    await supabase
                        .from('supplier_returns')
                        .update({
                            status: 'COMPLETED',
                            resolution_type: 'REPLACEMENT',
                            resolved_at: new Date().toISOString(),
                            notes: `Replacement item received into inventory (Qty: ${receivedQty}).`
                        })
                        .eq('id', targetReturnId);
                }
            } catch (rErr) {
                console.error('Failed to update supplier_return record in receiveInventoryStock:', rErr);
            }
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
 * Validate deletion of an inventory item.
 * @route GET /api/inventory/:id/validate-delete
 */
export const validateDeleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the item
        const { data: item, error: fetchError } = await supabase
            .from('inventory')
            .select('ingredient_name, quantity')
            .eq('id', id)
            .maybeSingle();

        if (fetchError || !item) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        const quantity = parseFloat(item.quantity || 0);
        const stockExists = quantity > 0;

        // Check pending supplier payments
        const { data: payouts, error: payoutError } = await supabase
            .from('supplier_payout_requests')
            .select('notes, status')
            .eq('status', 'PENDING');

        if (payoutError) throw payoutError;

        const parseNames = (notes) => {
            if (!notes) return [];
            const regex = /(?:Purchased|Added)\s+(\d+(?:\.\d+)?)\s*x\s+(.*?)\s*\(Rs\.\s*(\d+(?:\.\d+)?)\s*each\)/gi;
            const names = [];
            let match;
            while ((match = regex.exec(notes)) !== null) {
                names.push(match[2].trim().toLowerCase());
            }
            return names;
        };

        const lowerName = item.ingredient_name.trim().toLowerCase();
        const pendingPayments = (payouts || []).some(p => {
            let notes = p.notes || '';
            if (notes.startsWith('{')) {
                try {
                    const parsed = JSON.parse(notes);
                    notes = parsed.legacy_notes || '';
                } catch (e) {
                    // ignore
                }
            }
            const namesInPayout = parseNames(notes);
            if (namesInPayout.length === 0) {
                return notes.toLowerCase().includes(lowerName);
            }
            return namesInPayout.includes(lowerName);
        });

        // Check supplier returns
        const { data: returns, error: returnsError } = await supabase
            .from('supplier_returns')
            .select('id')
            .eq('item_id', id)
            .limit(1);

        if (returnsError) throw returnsError;
        const hasReturns = returns && returns.length > 0;

        const canDelete = !stockExists && !pendingPayments && !hasReturns;

        let reason = null;
        if (stockExists && pendingPayments && hasReturns) {
            reason = 'all_failed';
        } else if (stockExists && pendingPayments) {
            reason = 'both_failed';
        } else if (stockExists && hasReturns) {
            reason = 'stock_and_returns';
        } else if (pendingPayments && hasReturns) {
            reason = 'payments_and_returns';
        } else if (stockExists) {
            reason = 'stock_exists';
        } else if (pendingPayments) {
            reason = 'pending_payments';
        } else if (hasReturns) {
            reason = 'has_returns';
        }

        return res.status(200).json({
            canDelete,
            reason,
            quantity,
            pendingPayments,
            hasReturns
        });
    } catch (err) {
        console.error('Error validating delete:', err);
        return res.status(500).json({ message: 'Internal server error validating product deletion.' });
    }
};

/**
 * Delete inventory item.
 * @route DELETE /api/inventory/:id
 */
export const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the item
        const { data: item, error: fetchError } = await supabase
            .from('inventory')
            .select('ingredient_name, quantity')
            .eq('id', id)
            .maybeSingle();

        if (fetchError || !item) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        const quantity = parseFloat(item.quantity || 0);
        const stockExists = quantity > 0;

        // Check pending supplier payments
        const { data: payouts, error: payoutError } = await supabase
            .from('supplier_payout_requests')
            .select('notes, status')
            .eq('status', 'PENDING');

        if (payoutError) throw payoutError;

        const parseNames = (notes) => {
            if (!notes) return [];
            const regex = /(?:Purchased|Added)\s+(\d+(?:\.\d+)?)\s*x\s+(.*?)\s*\(Rs\.\s*(\d+(?:\.\d+)?)\s*each\)/gi;
            const names = [];
            let match;
            while ((match = regex.exec(notes)) !== null) {
                names.push(match[2].trim().toLowerCase());
            }
            return names;
        };

        const lowerName = item.ingredient_name.trim().toLowerCase();
        const pendingPayments = (payouts || []).some(p => {
            let notes = p.notes || '';
            if (notes.startsWith('{')) {
                try {
                    const parsed = JSON.parse(notes);
                    notes = parsed.legacy_notes || '';
                } catch (e) {
                    // ignore
                }
            }
            const namesInPayout = parseNames(notes);
            if (namesInPayout.length === 0) {
                return notes.toLowerCase().includes(lowerName);
            }
            return namesInPayout.includes(lowerName);
        });

        // Check supplier returns
        const { data: returns, error: returnsError } = await supabase
            .from('supplier_returns')
            .select('id')
            .eq('item_id', id)
            .limit(1);

        if (returnsError) throw returnsError;
        const hasReturns = returns && returns.length > 0;

        if (stockExists || pendingPayments || hasReturns) {
            let message = '';
            if (stockExists && pendingPayments && hasReturns) {
                message = 'This product cannot be deleted because inventory is still available, there are outstanding supplier payments, and it has associated supplier returns.';
            } else if (stockExists && pendingPayments) {
                message = 'This product cannot be deleted because inventory is still available and there are outstanding supplier payments. Set inventory to 0 and clear all payments before deleting.';
            } else if (stockExists && hasReturns) {
                message = 'This product cannot be deleted because there is still inventory in stock and it has associated supplier returns.';
            } else if (pendingPayments && hasReturns) {
                message = 'This product cannot be deleted because there are outstanding supplier payments and it has associated supplier returns.';
            } else if (stockExists) {
                message = 'This product cannot be deleted because there is still inventory in stock. Reduce the inventory quantity to 0 before deleting.';
            } else if (pendingPayments) {
                message = 'This product cannot be deleted because there are outstanding supplier payments associated with it. Clear all supplier payments before deleting.';
            } else if (hasReturns) {
                message = 'This product cannot be deleted because it has associated supplier returns. Products with return history cannot be permanently deleted.';
            }
            return res.status(400).json({ message });
        }

        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: 'Product deleted successfully.' });
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
        const { role, username, userId } = req.user || {};
        let paidByRole = role === 'ADMIN' ? 'Admin' : 'Cashier';
        let paidByName = username || paidByRole;

        let userFullName = '';
        if (userId) {
            const { data: userData } = await supabase
                .from('users')
                .select('username, full_name, role')
                .eq('id', userId)
                .maybeSingle();

            if (userData) {
                paidByName = userData.full_name || userData.username;
                userFullName = userData.full_name || '';
                if (userData.role) paidByRole = userData.role === 'ADMIN' ? 'Admin' : 'Cashier';
            }
        }

        const { data: existingPayout } = await supabase
            .from('supplier_payout_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (!existingPayout) {
            return res.status(404).json({ message: 'Payout request not found.' });
        }

        const payoutTotalAmount = parseFloat(existingPayout.amount || 0);
        let currentPaid = 0;
        let previousPayments = [];
        let legacyNotes = '';

        if (existingPayout.notes && existingPayout.notes.startsWith('{')) {
            try {
                const parsed = JSON.parse(existingPayout.notes);
                currentPaid = parseFloat(parsed.paid_amount || 0);
                previousPayments = parsed.payments || [];
                legacyNotes = parsed.legacy_notes || '';
            } catch (e) {
                legacyNotes = existingPayout.notes;
            }
        } else {
            legacyNotes = existingPayout.notes || '';
        }

        const remainingToPay = Math.max(0, payoutTotalAmount - currentPaid);
        if (remainingToPay > 0) {
            previousPayments.push({
                amount: remainingToPay,
                method: 'Cash',
                reference: 'Full Settlement',
                notes: 'Settled full payout balance',
                date: new Date().toISOString(),
                paid_by_role: paidByRole,
                paid_by_name: paidByName
            });
        }

        const notesJson = JSON.stringify({
            paid_amount: payoutTotalAmount,
            payments: previousPayments,
            legacy_notes: legacyNotes
        });

        const { data, error } = await supabase
            .from('supplier_payout_requests')
            .update({
                status: 'COMPLETED',
                completed_at: new Date().toISOString(),
                notes: notesJson
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Automatically record as cash out ONLY IF THE USER IS A CASHIER
        if (role === 'CASHIER' && remainingToPay > 0 && userId) {
            let shiftQuery = supabase
                .from('cash_shifts')
                .select('shift_id')
                .in('status', ['OPEN', 'REPORT_SUBMITTED']);

            const conditions = [];
            if (username) conditions.push(`cashier_name.ilike."${username}"`);
            if (userFullName) conditions.push(`cashier_name.ilike."${userFullName}"`);
            if (conditions.length > 0) shiftQuery = shiftQuery.or(conditions.join(','));

            const { data: activeShift } = await shiftQuery.maybeSingle();

            if (activeShift) {
                await supabase.from('cash_movements').insert({
                    shift_id: activeShift.shift_id,
                    type: 'cash_out',
                    amount: remainingToPay,
                    reason: `Supplier Payout Completed (Ref: ${existingPayout.payout_number})`,
                    time: new Date().toISOString()
                });
            }
        }

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

const activePayoutLocks = new Set();

/**
 * Emulated batch pay endpoint.
 * @route POST /api/inventory/batches/:id/pay
 */
export const payEmulatedBatch = async (req, res) => {
    const { id } = req.params;
    const lockKey = String(id);

    if (activePayoutLocks.has(lockKey)) {
        return res.status(409).json({ message: 'Payment processing is already in progress for this batch. Please wait.' });
    }

    activePayoutLocks.add(lockKey);

    try {
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

        const remainingBalance = Math.max(0, payoutTotalAmount - currentPaid);

        if (payout.status === 'COMPLETED' || remainingBalance <= 0) {
            return res.status(400).json({ message: 'This payout has already been fully paid and completed.' });
        }

        const requestedPaymentAmount = parseFloat(amount);
        const newPaymentAmount = Number.isFinite(requestedPaymentAmount) && requestedPaymentAmount > 0
            ? Math.min(requestedPaymentAmount, remainingBalance)
            : remainingBalance;

        if (newPaymentAmount <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount.' });
        }

        const newPaidAmount = currentPaid + newPaymentAmount;
        const isFullyPaid = newPaidAmount >= payoutTotalAmount;

        const { role, username, userId } = req.user || {};
        let paidByRole = role === 'ADMIN' ? 'Admin' : 'Cashier';
        let paidByName = username || paidByRole;

        let userFullName = '';
        if (userId) {
            const { data: userData } = await supabase
                .from('users')
                .select('username, full_name, role')
                .eq('id', userId)
                .maybeSingle();

            if (userData) {
                paidByName = userData.full_name || userData.username;
                userFullName = userData.full_name || '';
                if (userData.role) paidByRole = userData.role === 'ADMIN' ? 'Admin' : 'Cashier';
            }
        }

        const paymentRecord = {
            amount: newPaymentAmount,
            method: method || 'Cash',
            reference: reference || 'N/A',
            notes: notes || '',
            date: new Date().toISOString(),
            paid_by_role: paidByRole,
            paid_by_name: paidByName,
            paid_by_id: userId || ''
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

        // Automatically record as cash out ONLY IF THE USER IS A CASHIER
        if (role === 'CASHIER' && userId) {
            let shiftQuery = supabase
                .from('cash_shifts')
                .select('shift_id')
                .in('status', ['OPEN', 'REPORT_SUBMITTED']);
            
            const conditions = [];
            if (username) {
                conditions.push(`cashier_name.ilike."${username}"`);
            }
            if (userFullName) {
                conditions.push(`cashier_name.ilike."${userFullName}"`);
            }
            if (conditions.length > 0) {
                shiftQuery = shiftQuery.or(conditions.join(','));
            }
            
            const { data: activeShift, error: shiftError } = await shiftQuery.maybeSingle();

            if (shiftError) {
                console.error('[PAYMENT] Error fetching active shift:', shiftError);
            }

            if (activeShift) {
                const supplierName = payout.suppliers?.supplier_name || 'Supplier';
                const notesDetail = notes ? ` - Notes: ${notes}` : '';
                const reasonText = `Supplier Payment: ${supplierName} (Ref: ${payout.payout_number} via ${method || 'Cash'})${notesDetail}`;
                const { error: moveError } = await supabase
                    .from('cash_movements')
                    .insert({
                        shift_id: activeShift.shift_id,
                        type: 'cash_out',
                        amount: newPaymentAmount,
                        reason: reasonText,
                        time: new Date().toISOString()
                    });
                
                if (moveError) {
                    console.error('[PAYMENT] Error recording automatic cash out movement:', moveError);
                } else {
                    console.log('[PAYMENT] Automatic cash out movement recorded for Cashier.');
                }
            } else {
                console.log('[PAYMENT] No active shift found for cashier, skipped automatic cash out.');
            }
        } else if (role === 'ADMIN') {
            console.log('[PAYMENT] Payment made by Admin - skipped cash out for cashier cash counter.');
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
    } finally {
        activePayoutLocks.delete(lockKey);
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

