import { createClient } from '@supabase/supabase-js';
import { config } from './config/env.js';

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function migrate() {
    console.log('Starting migration to add tier columns to supplier_returns...');

    const sqlScript = `
        ALTER TABLE public.supplier_returns ADD COLUMN IF NOT EXISTS tier_id TEXT;
        ALTER TABLE public.supplier_returns ADD COLUMN IF NOT EXISTS buying_price DECIMAL(15,2);
    `;

    const { error } = await supabase.rpc('exec_sql', {
        sql_string: sqlScript
    });

    if (error) {
        console.error('Migration failed:', error);
    } else {
        console.log('Successfully added tier_id and buying_price columns to supplier_returns!');
    }
}

migrate();
