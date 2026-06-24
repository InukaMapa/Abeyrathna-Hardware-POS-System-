import { supabase } from './src/config/db.js';
import { generateToken } from './src/utils/jwtUtils.js';
import axios from 'axios';

async function testDeleteApi() {
    try {
        console.log("Finding admin user...");
        const { data: users, error: uErr } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'ADMIN')
            .limit(1);

        if (uErr || !users || users.length === 0) {
            console.error("Failed to find admin:", uErr);
            return;
        }

        const admin = users[0];
        console.log(`Found admin user: ${admin.username} (ID: ${admin.id})`);

        const token = generateToken({
            id: admin.id,
            username: admin.username,
            role: admin.role
        });

        const headers = {
            'Authorization': `Bearer ${token}`
        };

        // Find products for test
        const { data: items } = await supabase
            .from('inventory')
            .select('*');

        const magic4L = items.find(i => i.ingredient_name === 'Magic 4L');
        const plasticCups = items.find(i => i.ingredient_name === 'Plastic cups ');
        const mariBiscuits = items.find(i => i.ingredient_name === 'MARI BUSCUITS');

        console.log('\n--- Testing GET /api/inventory/:id/validate-delete ---');
        
        const testValidate = async (item, label) => {
            if (!item) {
                console.log(`${label}: NOT FOUND in database`);
                return;
            }
            console.log(`\nValidating product: "${item.ingredient_name}" (${label})`);
            try {
                const url = `http://localhost:5000/api/inventory/${item.id}/validate-delete`;
                const res = await axios.get(url, { headers });
                console.log("Status:", res.status);
                console.log("Response:", res.data);
            } catch (err) {
                console.log("Error status:", err.response?.status);
                console.log("Error data:", err.response?.data || err.message);
            }
        };

        await testValidate(magic4L, 'Stock Exists');
        await testValidate(plasticCups, 'Both Stock & Payout Exist');
        await testValidate(mariBiscuits, 'Clean Item (Can Delete)');

        console.log('\n--- Testing DELETE /api/inventory/:id on Blocked Item ---');
        if (magic4L) {
            try {
                const url = `http://localhost:5000/api/inventory/${magic4L.id}`;
                console.log(`Attempting to delete blocked item "${magic4L.ingredient_name}"...`);
                const res = await axios.delete(url, { headers });
                console.log("Unexpected success! Status:", res.status);
            } catch (err) {
                console.log("Status (Expected 400):", err.response?.status);
                console.log("Response Message:", err.response?.data?.message || err.message);
            }
        }

        console.log('\n--- Testing DELETE /api/inventory/:id on Allowed Item (MARI BUSCUITS) ---');
        if (mariBiscuits) {
            try {
                const url = `http://localhost:5000/api/inventory/${mariBiscuits.id}`;
                console.log(`Attempting to delete "${mariBiscuits.ingredient_name}"...`);
                const res = await axios.delete(url, { headers });
                console.log("Status (Expected 200):", res.status);
                console.log("Response Message:", res.data?.message);

                // Verify it is deleted
                const { data: checkDeleted } = await supabase
                    .from('inventory')
                    .select('*')
                    .eq('id', mariBiscuits.id)
                    .maybeSingle();
                
                console.log("Is product deleted from Supabase?", checkDeleted ? "❌ NO" : "✅ YES");

                // Restore the item to preserve database state
                console.log(`Restoring "${mariBiscuits.ingredient_name}"...`);
                const { error: restoreErr } = await supabase
                    .from('inventory')
                    .insert([mariBiscuits]);
                
                if (restoreErr) {
                    console.error("Failed to restore item:", restoreErr);
                } else {
                    console.log("Successfully restored item to original state.");
                }

            } catch (err) {
                console.log("Status:", err.response?.status);
                console.log("Error response:", err.response?.data || err.message);
            }
        }

    } catch (e) {
        console.error("Unexpected error in script:", e);
    }
}

testDeleteApi();
