import { supabase } from '../config/db.js';
import * as menuService from './menuService.js';

/**
 * Update inventory quantity.
 * @param {string} id - Inventory Item UUID
 * @param {number} quantity - New quantity
 */
export const updateInventoryQuantity = async (id, quantity) => {
    // 1. Update Inventory Table
    const { data, error } = await supabase
        .from('inventory')
        .update({ quantity: quantity })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    // 2. Trigger Menu Sync
    // We don't await this to keep response fast? 
    // Actually better to await to ensure consistency for testing.
    await menuService.syncMenuStatusWithInventory(id);

    return data;
};
