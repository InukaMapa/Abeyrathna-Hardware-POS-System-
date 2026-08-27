import { supabase } from '../src/config/db.js';

const knownTables = [
    // Users & Auth (TO PRESERVE)
    'users',
    
    // Inventory & Batches
    'inventory',
    'inventory_batches',
    'inventory_batch_items',
    'stock_history',

    // Menu & Categories
    'menu_categories',
    'menu_items',
    'menu_item_ingredients',
    'menu_variants',
    'menu_variant_options',
    'menu_variant_ingredients',

    // Orders & Billing
    'orders',
    'order_items',
    'order_item_variants',

    // Cash Counter & Shifts
    'cash_shifts',
    'cash_movements',
    'cash_counts',

    // Suppliers & Purchasing
    'suppliers',
    'supplier_payout_requests',
    'supplier_returns',
    'refund_batches',

    // Tables & Places
    'table_info',
    'place_info',

    // Website & Contact
    'reservations',
    'event_inquiries',
    'contact_messages'
];

async function inspectTables() {
    if (!supabase) {
        console.error('Supabase client is not initialized.');
        process.exit(1);
    }

    console.log('--- DB TABLE ROW COUNTS ---');
    for (const table of knownTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.log(`${table}: ERROR/MISSING (${error.message})`);
            } else {
                console.log(`${table}: ${count} rows`);
            }
        } catch (e) {
            console.log(`${table}: EXCEPTION (${e.message})`);
        }
    }
}

inspectTables();
