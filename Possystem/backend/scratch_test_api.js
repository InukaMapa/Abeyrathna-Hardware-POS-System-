import { supabase } from './src/config/db.js';
import { generateToken } from './src/utils/jwtUtils.js';
import axios from 'axios';

async function testApi() {
    try {
        console.log("Finding cashier user...");
        const { data: users, error: uErr } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'CASHIER')
            .limit(1);

        if (uErr) {
            console.error("Failed to find cashier staff:", uErr);
            return;
        }

        const cashier = users[0];
        if (!cashier) {
            console.error("No cashier user found in staff table!");
            return;
        }

        console.log(`Found cashier user: ${cashier.username} (ID: ${cashier.id})`);

        const token = generateToken({
            id: cashier.id,
            username: cashier.username,
            role: cashier.role
        });

        const headers = {
            'Authorization': `Bearer ${token}`
        };

        const urls = [
            'http://localhost:5000/api/orders?status=ALL&startDate=2026-06-23T02:38:31.000Z',
            'http://localhost:5000/api/cashier/stats',
            'http://localhost:5000/api/cash/admin/shifts'
        ];

        for (const url of urls) {
            console.log(`\n-----------------------------\nRequesting: ${url}`);
            try {
                const res = await axios.get(url, { headers });
                console.log("Status:", res.status);
                console.log("Data:", res.data);
            } catch (err) {
                console.log("Error status:", err.response?.status);
                console.log("Error data:", err.response?.data || err.message);
            }
        }
    } catch (e) {
        console.error("Unexpected error:", e);
    }
}
testApi();
