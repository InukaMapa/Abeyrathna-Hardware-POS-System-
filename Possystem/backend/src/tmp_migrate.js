import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Starting migration...');

    // Add columns to supplier_returns
    const { error: err1 } = await supabase.rpc('exec_sql', {
        sql_string: `
            ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS resolution_type TEXT;
            ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(15,2);
            ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS credit_note_number TEXT;
            ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
        `
    });

    if (err1) {
        console.log('Direct RPC failed, trying individual ALTER TABLE via standard API (if possible) or just explaining...');
        console.error(err1);
    }

    // Create refund_batches table
    const { error: err2 } = await supabase.rpc('exec_sql', {
        sql_string: `
            CREATE TABLE IF NOT EXISTS refund_batches (
                id SERIAL PRIMARY KEY,
                batch_number TEXT UNIQUE NOT NULL,
                return_id BIGINT REFERENCES supplier_returns(id),
                supplier_id UUID REFERENCES suppliers(id),
                amount DECIMAL(15,2) NOT NULL,
                status TEXT DEFAULT 'PENDING',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                received_at TIMESTAMPTZ,
                cashier_id UUID REFERENCES auth.users(id)
            );
        `
    });

    if (err2) console.error(err2);

    console.log('Migration attempted. If you see "function exec_sql() does not exist", please run the SQL in migrations folder manually in Supabase Dashboard.');
}

migrate();
