import { supabase } from '../src/config/db.js';

const execute = process.argv.includes('--execute');

const tables = [
    { name: 'supplier_payout_requests', pk: 'id' },
    { name: 'refund_batches', pk: 'id' },
    { name: 'inventory_batch_items', pk: 'id' },
    { name: 'supplier_returns', pk: 'id' },
    { name: 'stock_history', pk: 'id' },
    { name: 'menu_variant_ingredients', pk: 'id' },
    { name: 'menu_item_ingredients', pk: 'id' },
    { name: 'inventory_batches', pk: 'id' },
    { name: 'inventory', pk: 'id' }
];

const ignoredMissingTableCodes = new Set(['42P01', 'PGRST205']);

const countRows = async ({ name }) => {
    const { count, error } = await supabase
        .from(name)
        .select('*', { count: 'exact', head: true });

    if (error) {
        if (ignoredMissingTableCodes.has(error.code)) {
            return { missing: true, count: 0 };
        }
        throw new Error(`${name} count failed: ${error.message}`);
    }

    return { missing: false, count: count || 0 };
};

const deleteRows = async ({ name, pk }) => {
    const { error } = await supabase
        .from(name)
        .delete()
        .not(pk, 'is', null);

    if (error) {
        if (ignoredMissingTableCodes.has(error.code)) {
            return { missing: true };
        }
        throw new Error(`${name} delete failed: ${error.message}`);
    }

    return { missing: false };
};

const main = async () => {
    if (!supabase) {
        throw new Error('Supabase is not configured. Check backend .env values.');
    }

    console.log(execute ? 'Inventory reset: EXECUTE mode' : 'Inventory reset: DRY RUN mode');
    console.log('This targets inventory data only; suppliers, users, orders, tables, cash shifts, and categories are kept.');

    console.log('\nBefore:');
    for (const table of tables) {
        const result = await countRows(table);
        console.log(`${table.name}: ${result.missing ? 'missing/skipped' : result.count}`);
    }

    if (!execute) {
        console.log('\nDry run only. Run with --execute to delete these rows.');
        return;
    }

    console.log('\nDeleting:');
    for (const table of tables) {
        const result = await deleteRows(table);
        console.log(`${table.name}: ${result.missing ? 'missing/skipped' : 'deleted'}`);
    }

    console.log('\nAfter:');
    for (const table of tables) {
        const result = await countRows(table);
        console.log(`${table.name}: ${result.missing ? 'missing/skipped' : result.count}`);
    }

    console.log('\nInventory reset complete.');
};

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
