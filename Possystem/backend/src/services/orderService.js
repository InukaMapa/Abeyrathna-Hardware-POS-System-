import { supabase } from '../config/db.js';

/**
 * ============================================================
 * ORDER SERVICE - POS-SAFE VARIANT HANDLING
 * ============================================================
 * Handles order item creation with full variant validation
 * Enforces business rules:
 * - No trust in frontend
 * - Required variants must be provided
 * - Inactive items/options rejected
 * - Min/max selection enforcement
 * - Server-side price calculation
 * ============================================================
 */

/**
 * Validate and add an item to an existing order
 * @param {string} orderId - UUID of the order
 * @param {Object} itemData - { menu_item_id, quantity, variants }
 * @returns {Object} Created order item with full details
 */
export const addOrderItem = async (orderId, itemData) => {
    const { menu_item_id, quantity, variants = [] } = itemData;

    // ============================================================
    // STEP 1: VALIDATION - Order exists and is not closed
    // ============================================================
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_id, status, is_closed')
        .eq('order_id', orderId)
        .single();

    if (orderError || !order) {
        throw new Error('Order not found');
    }

    if (order.status === 'CLOSED' || order.is_closed) {
        throw new Error('Cannot add items to a closed order');
    }

    // ============================================================
    // STEP 2: FETCH MENU ITEM WITH ALL VARIANT DATA
    // ============================================================
    const { data: menuItem, error: menuError } = await supabase
        .from('menu_items')
        .select(`
            id,
            name,
            price,
            is_active,
            menu_variants (
                id,
                name,
                type,
                is_required,
                min_selections,
                max_selections,
                menu_variant_options (
                    id,
                    name,
                    price_delta,
                    is_active
                )
            )
        `)
        .eq('id', menu_item_id)
        .single();

    if (menuError || !menuItem) {
        throw new Error(`Menu item with ID ${menu_item_id} not found`);
    }

    // ============================================================
    // STEP 3: VALIDATE MENU ITEM IS ACTIVE
    // ============================================================
    if (!menuItem.is_active) {
        throw new Error(`Menu item "${menuItem.name}" is not available`);
    }

    // ============================================================
    // STEP 4: VALIDATE QUANTITY
    // ============================================================
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error('Quantity must be a positive integer');
    }

    // ============================================================
    // STEP 5: VARIANT VALIDATION & PRICE CALCULATION
    // ============================================================
    const validationResult = await validateVariants(menuItem, variants);
    
    if (!validationResult.valid) {
        throw new Error(validationResult.error);
    }

    const { selectedOptions, totalPriceDelta } = validationResult;

    // ============================================================
    // STEP 6: CALCULATE FINAL PRICES
    // ============================================================
    const basePrice = parseFloat(menuItem.price);
    const unitPrice = basePrice + totalPriceDelta;
    const totalPrice = unitPrice * parsedQuantity;

    // ============================================================
    // STEP 7: INSERT ORDER ITEM
    // ============================================================
    const { data: orderItem, error: insertError } = await supabase
        .from('order_items')
        .insert([{
            order_id: orderId,
            item_id: menuItem.id,
            item_name: menuItem.name,
            quantity: parsedQuantity,
            base_price: basePrice,
            item_price: unitPrice, // Unit price with variants
            total_price: totalPrice,
            subtotal: totalPrice // Alias for compatibility
        }])
        .select()
        .single();

    if (insertError) {
        console.error('[ORDER SERVICE] Failed to insert order item:', insertError);
        throw new Error('Failed to add item to order');
    }

    // ============================================================
    // STEP 8: INSERT VARIANT SELECTIONS
    // ============================================================
    if (selectedOptions.length > 0) {
        const variantInserts = selectedOptions.map(opt => ({
            order_item_id: orderItem.id,
            variant_id: opt.variant_id,
            variant_option_id: opt.option_id,
            variant_name: opt.variant_name,
            option_name: opt.option_name,
            price_delta: opt.price_delta
        }));

        const { error: variantInsertError } = await supabase
            .from('order_item_variants')
            .insert(variantInserts);

        if (variantInsertError) {
            console.error('[ORDER SERVICE] Failed to insert variants, rolling back:', variantInsertError);
            // Rollback: Delete the order item
            await supabase.from('order_items').delete().eq('id', orderItem.id);
            throw new Error('Failed to record variant selections');
        }
    }

    // ============================================================
    // STEP 9: UPDATE ORDER TOTAL
    // ============================================================
    await recalculateOrderTotal(orderId);

    // ============================================================
    // STEP 10: RETURN COMPLETE ITEM DATA
    // ============================================================
    return {
        order_item_id: orderItem.id,
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        quantity: parsedQuantity,
        base_price: basePrice,
        unit_price: unitPrice,
        total_price: totalPrice,
        variants: selectedOptions.map(opt => ({
            variant_name: opt.variant_name,
            option_name: opt.option_name,
            price_delta: opt.price_delta
        }))
    };
};

/**
 * ============================================================
 * VARIANT VALIDATION LOGIC (POS-SAFE)
 * ============================================================
 * Validates that all selected variants meet business rules:
 * - Required variants have selections
 * - All options are active
 * - Min/max selections enforced
 * - No invalid variant/option IDs
 * ============================================================
 */
const validateVariants = async (menuItem, submittedVariants) => {
    const menuVariants = menuItem.menu_variants || [];
    const selectedOptions = [];
    let totalPriceDelta = 0;

    // Build a map for quick lookups
    const variantMap = new Map();
    const submittedMap = new Map();

    // Index database variants
    for (const variant of menuVariants) {
        variantMap.set(variant.id, {
            ...variant,
            optionMap: new Map(variant.menu_variant_options.map(opt => [opt.id, opt]))
        });
    }

    // Index submitted variant selections by variant_id
    for (const submitted of submittedVariants) {
        if (!submittedMap.has(submitted.variant_id)) {
            submittedMap.set(submitted.variant_id, []);
        }
        submittedMap.get(submitted.variant_id).push(submitted.option_id);
    }

    // ============================================================
    // VALIDATE EACH VARIANT GROUP
    // ============================================================
    for (const variant of menuVariants) {
        const submittedOptions = submittedMap.get(variant.id) || [];
        const selectionCount = submittedOptions.length;

        // Check required variants
        if (variant.is_required && selectionCount === 0) {
            return {
                valid: false,
                error: `"${variant.name}" is required but not provided`
            };
        }

        // Check min selections
        if (selectionCount > 0 && selectionCount < variant.min_selections) {
            return {
                valid: false,
                error: `"${variant.name}" requires at least ${variant.min_selections} selection(s), but only ${selectionCount} provided`
            };
        }

        // Check max selections
        if (selectionCount > variant.max_selections) {
            return {
                valid: false,
                error: `"${variant.name}" allows maximum ${variant.max_selections} selection(s), but ${selectionCount} provided`
            };
        }

        // Validate each submitted option
        for (const optionId of submittedOptions) {
            const variantData = variantMap.get(variant.id);
            const option = variantData.optionMap.get(optionId);

            // Check option exists
            if (!option) {
                return {
                    valid: false,
                    error: `Invalid option ID "${optionId}" for variant "${variant.name}"`
                };
            }

            // Check option is active
            if (!option.is_active) {
                return {
                    valid: false,
                    error: `Option "${option.name}" for "${variant.name}" is not available`
                };
            }

            // Add to selected options
            selectedOptions.push({
                variant_id: variant.id,
                option_id: option.id,
                variant_name: variant.name,
                option_name: option.name,
                price_delta: parseFloat(option.price_delta)
            });

            totalPriceDelta += parseFloat(option.price_delta);
        }
    }

    return {
        valid: true,
        selectedOptions,
        totalPriceDelta
    };
};

/**
 * Recalculate order total based on all order items
 * @param {string} orderId - Order ID to recalculate
 */
const recalculateOrderTotal = async (orderId) => {
    const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('total_price')
        .eq('order_id', orderId);

    if (error) {
        console.error('[ORDER SERVICE] Failed to recalculate total:', error);
        return;
    }

    const newTotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);

    await supabase
        .from('orders')
        .update({ total_amount: newTotal })
        .eq('order_id', orderId);
};

/**
 * Get order item with all variant details
 * @param {string} orderItemId - Order item ID
 * @returns {Object} Order item with variants
 */
export const getOrderItemWithVariants = async (orderItemId) => {
    const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .select('*')
        .eq('id', orderItemId)
        .single();

    if (itemError || !orderItem) {
        throw new Error('Order item not found');
    }

    const { data: variants, error: variantError } = await supabase
        .from('order_item_variants')
        .select('*')
        .eq('order_item_id', orderItemId);

    if (variantError) {
        console.error('[ORDER SERVICE] Failed to fetch variants:', variantError);
    }

    return {
        ...orderItem,
        variants: variants || []
    };
};
