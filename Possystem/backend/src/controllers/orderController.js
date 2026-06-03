import { supabase } from '../config/db.js';
import { addOrderItem as addOrderItemService, getOrderItemWithVariants } from '../services/orderService.js';

const findOpenShiftForCashier = async (req) => {
    if (req.user?.role !== 'CASHIER') return { allowed: true, shift: null };

    const cashierName = req.user?.username;
    if (!cashierName) return { allowed: false, shift: null };

    const { data, error } = await supabase
        .from('cash_shifts')
        .select('shift_id, cashier_name, status')
        .eq('cashier_name', cashierName)
        .eq('status', 'OPEN')
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return { allowed: Boolean(data), shift: data || null };
};

/**
 * Create a new order from a table
 * @route POST /api/orders
 * @access CASHIER only
 * 
 * Business Rules:
 * - Only ONE active order per table at a time
 * - Active order = status NOT 'CLOSED'
 * - Staff ID comes from JWT token
 * - Total amount calculated server-side
 * - Table must exist in table_info
 */
export const createOrder = async (req, res) => {
    try {
        const { table_id, items, customer_phone } = req.body;

        // Extract staff_id from JWT (populated by protect middleware)
        const staffId = req.user?.userId;

        const shiftCheck = await findOpenShiftForCashier(req);
        if (!shiftCheck.allowed) {
            return res.status(403).json({
                error: 'Please start your shift in the Cash Counter before creating orders.'
            });
        }

        // Basic validation
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items are required' });
        }

        let tableIdInt = null;

        if (table_id) {
            tableIdInt = parseInt(table_id, 10);
            if (isNaN(tableIdInt)) {
                return res.status(400).json({ error: 'Table ID must be a valid integer' });
            }

            console.log(`[ORDER] Creating order for table ${tableIdInt} by staff ${staffId}`);

            // ============================================================
            // CRITICAL BUSINESS RULE: Check for existing active orders
            // Active order = status NOT 'CLOSED'
            // ============================================================
            const { data: activeOrders, error: activeOrderError } = await supabase
                .from('orders')
                .select('order_id, status, created_at')
                .eq('table_id', tableIdInt)
                .neq('status', 'CLOSED')
                .limit(1);

            if (activeOrderError) {
                console.error('[ORDER] Error checking active orders:', activeOrderError);
                return res.status(500).json({
                    error: 'Failed to validate table availability',
                    message: 'Database query error. Please contact support.'
                });
            }

            if (activeOrders && activeOrders.length > 0) {
                const existingOrder = activeOrders[0];
                console.log(`[ORDER] Conflict: Table ${tableIdInt} already has active order #${existingOrder.order_id}`);
                return res.status(409).json({
                    error: 'This table already has an active order',
                    existingOrderId: existingOrder.order_id,
                    status: existingOrder.status,
                    message: 'Please close or complete the existing order before creating a new one'
                });
            }

            console.log(`[ORDER] ✓ Table ${tableIdInt} is available (no active orders)`);

            // ============================================================
            // VALIDATION: Ensure table exists in table_info
            // ============================================================
            const { data: tableData, error: tableError } = await supabase
                .from('table_info')
                .select('table_id, place_id, seats')
                .eq('table_id', tableIdInt)
                .single();

            if (tableError || !tableData) {
                console.error('[ORDER] Table validation failed:', tableError);
                return res.status(400).json({
                    error: `Table ID ${tableIdInt} does not exist`,
                    message: 'Please select a valid table'
                });
            }

            console.log(`[ORDER] Table ${tableIdInt} validated (Place: ${tableData.place_id}, Seats: ${tableData.seats})`);
        } else {
            console.log(`[ORDER] Creating direct order by staff ${staffId} without table`);
        }

        // ============================================================
        // EXISTING LOGIC: Fetch prices and details to ensure data integrity
        // ============================================================
        const itemIds = items.map(i => i.id || i.menu_item_id).filter(Boolean);
        const { data: inventoryItems, error: invError } = await supabase
            .from('inventory')
            .select('id, selling_price, ingredient_name')
            .in('id', itemIds);

        if (invError) {
            console.error('Error fetching inventory items:', invError);
            return res.status(500).json({ error: 'Failed to validate inventory items' });
        }

        // 2. Prepare Data
        let totalAmount = 0;
        const orderItemsData = [];

        for (const reqItem of items) {
            const currentReqId = reqItem.id || reqItem.menu_item_id;
            const invItem = inventoryItems.find(m => m.id === currentReqId);

            if (!invItem) {
                return res.status(400).json({ error: `Item with ID ${currentReqId} not found in inventory` });
            }

            let unitPrice = parseFloat(invItem.selling_price || 0);
            let selectedVariantsSnapshot = [];

            // Variants are likely not used in Hardware Inventory for now, but keeping the loop structure for compatibility
            if (reqItem.variants && Array.isArray(reqItem.variants) && reqItem.variants.length > 0) {
                // If you add variants to inventory later, handle here
            }

            // TODO: Add stricter validation for required variants/min/max here if needed.
            // For now, trusting that frontend sends valid selections corresponding to DB.

            const quantity = parseInt(reqItem.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({ error: `Invalid quantity for item ${invItem.ingredient_name}` });
            }

            const subtotal = unitPrice * quantity;
            totalAmount += subtotal;

            orderItemsData.push({
                item_id: invItem.id,       // Schema: item_id
                item_name: invItem.ingredient_name,   // Schema: item_name
                item_price: unitPrice,      // Store FINAL unit price (base + variants)
                quantity: quantity,         // Schema: quantity
                subtotal: subtotal,          // Schema: subtotal
                selected_variants: selectedVariantsSnapshot // New JSONB column
            });
        }

        // 3. Insert Order with staff_id from JWT
        // Schema: order_id (serial), table_id (int), status (text), total_amount (numeric), staff_id (uuid)
        console.log(`[ORDER] Creating order: Table ${tableIdInt}, Items: ${items.length}, Total: ₹${totalAmount}`);

        const orderInsertData = {
            table_id: tableIdInt,
            total_amount: totalAmount,
            status: 'PLACED',
            customer_phone: customer_phone || null
        };

        // Add staff_id if it exists (some schemas might not have this field yet)
        if (staffId) {
            orderInsertData.staff_id = staffId;
        }

        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([orderInsertData])
            .select()
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            // Handle specific Foreign Key Violation for table_id
            if (orderError.code === '23503') {
                return res.status(400).json({ error: `Table ID ${tableIdInt} does not exist.` });
            }
            return res.status(500).json({ error: 'Failed to create order' });
        }

        const orderId = orderData.order_id; // Schema serial column is order_id

        // 4. Insert Order Items
        const itemsToInsert = orderItemsData.map(i => ({
            ...i,
            order_id: orderId // Schema: order_id
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('[ORDER] Error inserting order items:', itemsError);
            // Rollback: Delete the order since items failed to insert
            console.log(`[ORDER] Rolling back order ${orderId}`);
            await supabase.from('orders').delete().eq('order_id', orderId);
            return res.status(500).json({ error: 'Failed to record order items' });
        }

        console.log(`[ORDER] ✓ Order ${orderId} created successfully for table ${tableIdInt}`);

        res.status(201).json({
            message: 'Order placed successfully',
            order_id: orderId,
            table_id: tableIdInt,
            total_amount: totalAmount,
            status: 'PLACED',
            items_count: items.length,
            staff_id: staffId || null,
            created_at: orderData.created_at
        });

    } catch (error) {
        console.error('Create Order Unexpected Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const fetchAllOrders = async (req, res) => {
    try {
        const { status, isClosed, tableId, startDate, endDate } = req.query;

        let query = supabase
            .from('orders')
            .select(`
                order_id,
                table_id,
                total_amount,
                status,
                customer_phone,
                created_at,
                order_items (
                    order_item_id,
                    item_id,
                    item_name,
                    quantity,
                    item_price,
                    subtotal
                )
            `)
            .order('created_at', { ascending: false });

        // Filter by user role (Cashiers only see their own orders)
        if (req.user?.role === 'CASHIER') {
            query = query.eq('staff_id', req.user.userId);
        }

        // Filter by status if provided
        if (status) {
            query = query.eq('status', status);
        }

        // Filter by tableId if provided
        if (tableId) {
            const tableIdInt = parseInt(tableId, 10);
            if (!isNaN(tableIdInt)) {
                query = query.eq('table_id', tableIdInt);
            }
        }

        // Filter by date range if provided
        if (startDate) {
            query = query.gte('created_at', startDate);
        }

        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching orders:', error);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Fetch Orders Unexpected Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Update order status
 * @route PATCH /api/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['PLACED', 'PREPARING', 'SERVED', 'BILL_OPEN', 'PAID', 'CLOSED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const orderId = parseInt(id, 10);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        // If status is being set to CLOSED or PAID, we track the shift and time
        const updateData = { status };

        if (status === 'CLOSED' || status === 'PAID') {
            // Align to CLOSED for internal consistency
            updateData.status = 'CLOSED';
            updateData.closed_at = new Date().toISOString();

            // Try to find an active shift for this cashier/counter
            // Note: We might want to pass shift_id from frontend too
            const { data: activeShift } = await supabase
                .from('cash_shifts')
                .select('shift_id')
                .eq('status', 'OPEN')
                .limit(1)
                .single();

            if (activeShift) {
                updateData.shift_id = activeShift.shift_id;
            }
        }

        // Update the order status
        const { data, error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('order_id', orderId)
            .select()
            .single();

        if (error) {
            console.error('Error updating order status:', error);
            return res.status(500).json({ error: 'Failed to update order status' });
        }

        if (!data) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.status(200).json({
            message: 'Order status updated successfully',
            order: data
        });

    } catch (error) {
        console.error('Update Order Status Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Close an order (mark as paid and closed)
 * @route PATCH /api/orders/:id/close
 */
export const closeOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { final_total, discount, other_charges, payments, customer_name, customer_phone, notes } = req.body || {};

        const orderId = parseInt(id, 10);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        // Handle case where cashier has no open shift gracefully
        const { data: activeShift } = await supabase
            .from('cash_shifts')
            .select('shift_id')
            .eq('status', 'OPEN')
            .limit(1)
            .maybeSingle();

        const paymentRows = Array.isArray(payments)
            ? payments
                .map(payment => ({
                    method: String(payment?.method || '').trim(),
                    amount: Number.parseFloat(payment?.amount) || 0
                }))
                .filter(payment => payment.method && payment.amount > 0)
            : [];
        const normalizedPaymentRows = paymentRows.length > 0
            ? paymentRows
            : [{
                method: 'Cash',
                amount: Number.parseFloat(final_total) || 0
            }];
        const cashAmount = normalizedPaymentRows.reduce((sum, payment) => (
            payment.method.toLowerCase() === 'cash' ? sum + payment.amount : sum
        ), 0);
        const paymentMethod = normalizedPaymentRows.length === 1
            ? normalizedPaymentRows[0].method
                : 'Split';

        // Prepare the update payload. If final_total is provided from the checkout page, we override total_amount.
        const updatePayload = {
            status: 'CLOSED',
            closed_at: new Date().toISOString(),
            shift_id: activeShift ? activeShift.shift_id : null,
            payment_method: paymentMethod,
            payment_details: normalizedPaymentRows,
            cash_amount: cashAmount
        };

        if (final_total !== undefined) {
            updatePayload.total_amount = final_total;
        }
        if (customer_phone !== undefined) {
            updatePayload.customer_phone = customer_phone;
        }

        let { data, error } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('order_id', orderId)
            .select()
            .single();

        if (error?.code === 'PGRST204' && (
            error.message?.includes('payment_method') ||
            error.message?.includes('payment_details') ||
            error.message?.includes('cash_amount')
        )) {
            const {
                payment_method: _paymentMethod,
                payment_details: _paymentDetails,
                cash_amount: _cashAmount,
                ...legacyUpdatePayload
            } = updatePayload;
            ({ data, error } = await supabase
                .from('orders')
                .update(legacyUpdatePayload)
                .eq('order_id', orderId)
                .select()
                .single());
        }

        if (error) {
            console.error('Error closing order:', error);
            return res.status(500).json({ error: 'Failed to close order' });
        }

        if (!data) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.status(200).json({
            message: 'Order closed and tracked successfully',
            order: data
        });

    } catch (error) {
        console.error('Close Order Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * ============================================================
 * ADD ITEM TO EXISTING ORDER (WITH VARIANTS)
 * ============================================================
 * @route POST /api/orders/:orderId/items
 * @access CASHIER only
 * 
 * Request Body:
 * {
 *   "menu_item_id": "uuid",
 *   "quantity": 1,
 *   "variants": [
 *     {
 *       "variant_id": "uuid",
 *       "option_id": "uuid"
 *     }
 *   ]
 * }
 * 
 * Business Rules:
 * - Menu item must be active
 * - Required variants must be provided
 * - Min/max selections enforced
 * - Inactive options rejected
 * - Server-side price calculation
 * - Order total automatically updated
 * ============================================================
 */
export const addOrderItem = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { menu_item_id, quantity, variants } = req.body;

        // Basic validation
        if (!menu_item_id) {
            return res.status(400).json({
                error: 'Missing required field: menu_item_id'
            });
        }

        if (!quantity || isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) <= 0) {
            return res.status(400).json({
                error: 'Quantity must be a positive integer'
            });
        }

        if (variants && !Array.isArray(variants)) {
            return res.status(400).json({
                error: 'Variants must be an array'
            });
        }

        console.log(`[ORDER] Adding item ${menu_item_id} (qty: ${quantity}) to order ${orderId}`);

        // Use service layer for validation and insertion
        const orderItem = await addOrderItemService(orderId, {
            menu_item_id,
            quantity: parseInt(quantity, 10),
            variants: variants || []
        });

        console.log(`[ORDER] ✓ Item added successfully: ${orderItem.item_name}`);

        res.status(201).json({
            success: true,
            message: 'Item added to order successfully',
            data: orderItem
        });

    } catch (error) {
        console.error('[ORDER] Add Item Error:', error);

        // Handle specific business logic errors
        if (error.message.includes('not found') ||
            error.message.includes('not available') ||
            error.message.includes('is required') ||
            error.message.includes('allows maximum') ||
            error.message.includes('Invalid option') ||
            error.message.includes('closed order')) {
            return res.status(400).json({
                error: error.message
            });
        }

        // Generic error
        res.status(500).json({
            error: 'Failed to add item to order',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * ============================================================
 * GET ORDER ITEM WITH VARIANT DETAILS
 * ============================================================
 * @route GET /api/orders/items/:orderItemId
 * @access CASHIER, ADMIN
 * 
 * Returns order item with all selected variants
 * ============================================================
 */
export const getOrderItem = async (req, res) => {
    try {
        const { orderItemId } = req.params;

        const orderItem = await getOrderItemWithVariants(orderItemId);

        res.status(200).json({
            success: true,
            data: orderItem
        });

    } catch (error) {
        console.error('[ORDER] Get Item Error:', error);

        if (error.message.includes('not found')) {
            return res.status(404).json({
                error: error.message
            });
        }

        res.status(500).json({
            error: 'Failed to retrieve order item'
        });
    }
};

/**
 * Cancel an order entirely
 * @route DELETE /api/orders/:id
 */
export const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('order_id', id);

        if (error) throw error;

        res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
};

/**
 * Remove an item from an order
 * @route DELETE /api/orders/items/:orderItemId
 */
export const removeOrderItem = async (req, res) => {
    try {
        const { orderItemId } = req.params;

        // Find order_id and subtotal first to update order total_amount
        const { data: itemData, error: itemError } = await supabase
            .from('order_items')
            .select('order_id, subtotal')
            .eq('order_item_id', orderItemId)
            .single();

        if (itemError || !itemData) throw itemError || new Error('Item not found');

        const { error: deleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_item_id', orderItemId);

        if (deleteError) throw deleteError;

        // Recalculate total
        const { data: allItems } = await supabase.from('order_items').select('subtotal').eq('order_id', itemData.order_id);
        const newTotal = (allItems || []).reduce((acc, curr) => acc + parseFloat(curr.subtotal), 0);
        await supabase.from('orders').update({ total_amount: newTotal }).eq('order_id', itemData.order_id);

        res.status(200).json({ message: 'Item removed successfully', newTotal });
    } catch (error) {
        console.error('Error removing order item:', error);
        res.status(500).json({ error: 'Failed to remove order item' });
    }
};

/**
 * Fetch order details by ID
 * @route GET /api/orders/:id
 */
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                order_id,
                table_id,
                total_amount,
                status,
                customer_phone,
                created_at,
                staff_id,
                order_items (
                    order_item_id,
                    item_id,
                    item_name,
                    quantity,
                    item_price,
                    subtotal
                )
            `)
            .eq('order_id', id)
            .single();

        if (error || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Restrict Cashiers to only view their own orders
        if (req.user?.role === 'CASHIER' && order.staff_id !== req.user?.userId) {
            return res.status(403).json({ error: 'Access denied. You can only view your own orders.' });
        }

        const itemIds = (order.order_items || []).map(item => item.item_id).filter(Boolean);
        if (itemIds.length > 0) {
            const { data: inventoryItems, error: inventoryError } = await supabase
                .from('inventory')
                .select('id, buying_price')
                .in('id', itemIds);

            if (inventoryError) throw inventoryError;

            const buyingPriceById = new Map((inventoryItems || []).map(item => [
                item.id,
                Number(item.buying_price || 0)
            ]));

            order.order_items = (order.order_items || []).map(item => ({
                ...item,
                buying_price: buyingPriceById.get(item.item_id) || 0
            }));
        }

        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order by ID:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
};

/**
 * Replace entire cart items for an order
 * @route PUT /api/orders/:id/cart
 */
export const updateOrderCart = async (req, res) => {
    try {
        const { id } = req.params;
        const { items, customer_phone } = req.body; // array of items: { id, quantity }

        const shiftCheck = await findOpenShiftForCashier(req);
        if (!shiftCheck.allowed) {
            return res.status(403).json({
                error: 'Please start your shift in the Cash Counter before updating orders.'
            });
        }

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Items array is required' });
        }

        // 1. Fetch inventory items to ensure pricing is correct
        const itemIds = items.map(i => i.id || i.menu_item_id).filter(Boolean);
        if (itemIds.length === 0) {
            // Empty cart basically means clearing it
            await supabase.from('order_items').delete().eq('order_id', id);
            await supabase.from('orders').update({ total_amount: 0, customer_phone: customer_phone || null }).eq('order_id', id);
            return res.status(200).json({ message: 'Cart updated successfully', totalAmount: 0 });
        }

        const { data: inventoryItems, error: invError } = await supabase
            .from('inventory')
            .select('id, selling_price, ingredient_name')
            .in('id', itemIds);

        if (invError) throw invError;

        let totalAmount = 0;
        const newOrderItems = [];

        for (const reqItem of items) {
            const currentReqId = reqItem.id || reqItem.menu_item_id;
            const invItem = inventoryItems.find(m => m.id === currentReqId);
            if (!invItem) continue;

            const unitPrice = parseFloat(invItem.selling_price) || 0;
            const quantity = parseInt(reqItem.quantity, 10);
            if (isNaN(quantity) || quantity <= 0) continue;

            const subtotal = unitPrice * quantity;
            totalAmount += subtotal;

            newOrderItems.push({
                order_id: id,
                item_id: invItem.id,
                item_name: invItem.ingredient_name,
                item_price: unitPrice,
                quantity: quantity,
                subtotal: subtotal,
                selected_variants: []
            });
        }

        // 2. Delete existing items
        const { error: delError } = await supabase.from('order_items').delete().eq('order_id', id);
        if (delError) throw delError;

        // 3. Insert new items
        if (newOrderItems.length > 0) {
            const { error: insError } = await supabase.from('order_items').insert(newOrderItems);
            if (insError) throw insError;
        }

        // 4. Update order total & customer phone
        const { error: updError } = await supabase
            .from('orders')
            .update({
                total_amount: totalAmount,
                customer_phone: customer_phone || null
            })
            .eq('order_id', id);

        if (updError) throw updError;

        res.status(200).json({ message: 'Cart updated successfully', totalAmount });
    } catch (error) {
        console.error('Error updating order cart:', error);
        res.status(500).json({ error: 'Failed to update order cart' });
    }
};
