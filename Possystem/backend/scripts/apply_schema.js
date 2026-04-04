import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard local credentials - if these fail, we will need to ask user
const connectionString = 'postgresql://postgres:123@localhost:5432/chillgrand_restaurant';

const client = new Client({
    connectionString,
});

async function applySchema() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.join(__dirname, '../sql/variant_ingredients.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL...');
        await client.query(sql);
        console.log('Schema applied successfully.');

        console.log('Reloading PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('Schema cache reloaded.');

    } catch (err) {
        console.error('Error applying schema:', err);
    } finally {
        await client.end();
    }
}

applySchema();
