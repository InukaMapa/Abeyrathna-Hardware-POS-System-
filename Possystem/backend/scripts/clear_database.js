import { supabase } from '../src/config/db.js';

const execute = process.argv.includes('--execute');

// Tables in order of deletion (child tables before parent tables to respect FK constraints)
const tablesToDelete = [
    // 1. Order Details & Variants
    'order_item_variants',
    'order_items',
    'orders',

    // 2. Cash Shift Movements & Counts
    'cash_counts',
    'cash_movements',
    'cash_shifts',

    // 3. Supplier Payouts & Returns
    'supplier_payout_requests',
    'supplier_returns',
    'refund_batches',
    'suppliers',

    // 4. Stock & Inventory
    'stock_history',
    'inventory_batch_items',
    'inventory_batches',
    'inventory',

    // 5. Menu Items, Variants, Categories & Ingredients
    'menu_variant_ingredients',
    'menu_variant_options',
    'menu_variants',
    'menu_item_ingredients',
    'menu_items',
    'menu_categories',

    // 6. Additional Tables
    'reservations',
    'event_inquiries',
    'contact_messages',
    'table_info',
    'place_info'
];

const ignoredMissingTableCodes = new Set(['42P01', 'PGRST205']);

const countRows = async (tableName) => {
    const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

    if (error) {
        if (ignoredMissingTableCodes.has(error.code)) {
            return { missing: true, count: 0 };
        }
        return { missing: false, error: error.message, count: null };
    }

    return { missing: false, count: count || 0 };
};

const deleteTableRows = async (tableName) => {
    // 1. Fetch 1 row to dynamically find a valid column name
    const { data, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (sampleError) {
        if (ignoredMissingTableCodes.has(sampleError.code)) {
            return { missing: true };
        }
        throw new Error(`${tableName} query failed: ${sampleError.message}`);
    }

    if (!data || data.length === 0) {
        // Table is already empty
        return { missing: false, empty: true };
    }

    // Pick the first available column name from the sample row
    const targetColumn = Object.keys(data[0])[0];

    // Delete all rows where targetColumn is not null
    const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .not(targetColumn, 'is', null);

    if (deleteError) {
        throw new Error(`${tableName} delete failed: ${deleteError.message}`);
    }

    return { missing: false, empty: false };
};

const main = async () => {
    if (!supabase) {
        throw new Error('Supabase client is not initialized. Check backend .env configuration.');
    }

    console.log(execute ? '=== DATABASE CLEAR: EXECUTE MODE ===' : '=== DATABASE CLEAR: DRY RUN MODE ===');
    console.log('NOTE: The `users` table will NOT be touched and will be preserved.\n');

    // Print initial state of users table
    const usersState = await countRows('users');
    console.log(`[PRESERVED] users table count: ${usersState.count} rows`);

    console.log('\n--- Operational Tables Before Clear ---');
    for (const tableName of tablesToDelete) {
        const result = await countRows(tableName);
        if (result.missing) {
            console.log(`- ${tableName}: [Table Not Found / Skipped]`);
        } else if (result.error) {
            console.log(`- ${tableName}: ERROR (${result.error})`);
        } else {
            console.log(`- ${tableName}: ${result.count} rows`);
        }
    }

    if (!execute) {
        console.log('\nDry run completed. Run with `node scripts/clear_database.js --execute` to execute deletion.');
        return;
    }

    console.log('\n--- Executing Deletions ---');
    for (const tableName of tablesToDelete) {
        try {
            const result = await deleteTableRows(tableName);
            if (result.missing) {
                console.log(`- ${tableName}: Skipped (table does not exist)`);
            } else if (result.empty) {
                console.log(`✓ ${tableName}: Already empty`);
            } else {
                console.log(`✓ ${tableName}: Cleared successfully`);
            }
        } catch (err) {
            console.error(`✗ ${tableName}: Failed - ${err.message}`);
        }
    }

    console.log('\n--- Post-Clear Verification ---');
    const finalUsersState = await countRows('users');
    console.log(`[PRESERVED] users table count: ${finalUsersState.count} rows`);

    console.log('\n--- Operational Tables After Clear ---');
    for (const tableName of tablesToDelete) {
        const result = await countRows(tableName);
        if (!result.missing && !result.error) {
            console.log(`- ${tableName}: ${result.count} rows remaining`);
        }
    }

    console.log('\nDatabase reset complete! Users table preserved.');
};

main().catch((err) => {
    console.error('Fatal error during database clear:', err.message);
    process.exit(1);
});
