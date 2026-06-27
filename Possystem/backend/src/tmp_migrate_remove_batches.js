import { createClient } from '@supabase/supabase-js';
import { config } from './config/env.js';

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function migrate() {
    console.log('Starting migration to remove batches...');

    const sqlScript = `
        -- 1. Drop foreign keys and columns from referencing tables
        ALTER TABLE IF EXISTS public.inventory DROP COLUMN IF EXISTS batch_id CASCADE;
        ALTER TABLE IF EXISTS public.supplier_returns DROP COLUMN IF EXISTS batch_id CASCADE;
        ALTER TABLE IF EXISTS public.supplier_returns DROP COLUMN IF EXISTS batch_number CASCADE;
        ALTER TABLE IF EXISTS public.supplier_payout_requests DROP COLUMN IF EXISTS batch_id CASCADE;
        
        -- 2. Drop the batch tables
        DROP TABLE IF EXISTS public.inventory_batch_items CASCADE;
        DROP TABLE IF EXISTS public.refund_batches CASCADE;
        DROP TABLE IF EXISTS public.inventory_batches CASCADE;
    `;

    const { error } = await supabase.rpc('exec_sql', {
        sql_string: sqlScript
    });

    if (error) {
        console.error('Migration failed:', error);
    } else {
        console.log('Successfully dropped batch tables and columns!');
    }
}

migrate();
