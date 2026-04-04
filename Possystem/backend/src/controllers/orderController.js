import { supabase } from '../config/db.js';
import { addOrderItem as addOrderItemService, getOrderItemWithVariants } from '../services/orderService.js';

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

        // Basic validation
        if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Valid Table ID and items are required' });
        }

        const tableIdInt = parseInt(table_id, 10);
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
            console.error('[ORDER] Error checking active orders:', {
                error: activeOrderError,
                code: activeOrderError.code,
                message: activeOrderError.message,
                details: activeOrderError.details,
                hint: activeOrderError.hint
            });
            return res.status(500).json({
                error: 'Failed to validate table availability',
                message: 'Database query error. Please contact support.',
                debug: process.env.NODE_ENV === 'development' ? activeOrderError.message : undefined
            });
        }

        if (activeOrders && activeOrders.length > 0) {
            const existingOrder = activeOrders[0];
            console.log(`[ORDER] Conflict: Table ${tableIdInt} already has active order #${existingOrder.order_id} (status: ${existingOrder.status})`);
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

        // ============================================================
        // EXISTING LOGIC: Fetch prices and details to ensure data integrity
        // ============================================================
        const itemIds = items.map(i => i.id || i.menu_item_id).filter(Boolean);
        const { data: menuItems, error: menuError } = await supabase
            .from('menu_items')
            .select(`
                id, price, name,
                menu_variants (
                    id, name,
                    menu_variant_options (
                        id, name, price_delta
                    )
                )
            `)
            .in('id', itemIds);

        if (menuError) {
            console.error('Error fetching menu items:', menuError);
            return res.status(500).json({ error: 'Failed to validate menu items' });
        }

        // 2. Prepare Data
        let totalAmount = 0;
        const orderItemsData = [];

        for (const reqItem of items) {
            const currentReqId = reqItem.id || reqItem.menu_item_id;
            const menuItem = menuItems.find(m => m.id === currentReqId);

            if (!menuItem) {
                return res.status(400).json({ error: `Item with ID ${currentReqId} not found` });
            }

            let unitPrice = menuItem.price;
            let selectedVariantsSnapshot = [];

            // Calculate Variants Price & Validate
            if (reqItem.variants && Array.isArray(reqItem.variants)) {
                for (const userVariant of reqItem.variants) {
                    // Find matching variant group in menu item
                    const dbVariant = menuItem.menu_variants?.find(v => v.id === userVariant.variantId);

                    if (dbVariant) {
                        // Find matching option
                        const dbOption = dbVariant.menu_variant_options?.find(o => o.id === userVariant.optionId);

                        if (dbOption) {
                            unitPrice += dbOption.price_delta;
                            selectedVariantsSnapshot.push({
                                variant_name: dbVariant.name,
                                option_name: dbOption.name,
                                price_delta: dbOption.price_delta
                            });
                        }
                    }
                }
            }

            // TODO: Add stricter validation for required variants/min/max here if needed.
            // For now, trusting that frontend sends valid selections corresponding to DB.

            const quantity = parseInt(reqItem.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({ error: `Invalid quantity for item ${menuItem.name}` });
            }

            const subtotal = unitPrice * quantity;
            totalAmount += subtotal;

            orderItemsData.push({
                item_id: menuItem.id,       // Schema: item_id
                item_name: menuItem.name,   // Schema: item_name
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
                    item_name,
                    quantity,
                    item_price,
                    subtotal
                )
            `)
            .order('created_at', { ascending: false });

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

        const orderId = parseInt(id, 10);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        // Update the order to CLOSED status, and track shift/time
        // We find the active shift
        const { data: activeShift } = await supabase
            .from('cash_shifts')
            .select('shift_id')
            .eq('status', 'OPEN')
            .limit(1)
            .single();

        const { data, error } = await supabase
            .from('orders')
            .update({
                status: 'CLOSED',
                closed_at: new Date().toISOString(),
                shift_id: activeShift ? activeShift.shift_id : null
            })
            .eq('order_id', orderId)
            .select()
            .single();

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
