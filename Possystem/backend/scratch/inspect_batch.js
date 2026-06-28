import { supabase } from '../src/config/db.js';

async function run() {
    const { data, error } = await supabase
        .from('supplier_payout_requests')
        .select('id, payout_number, amount, notes, status')
        .limit(10);

    if (error) {
        console.error("Error fetching requests:", error);
    } else {
        console.log("All Payout Requests (limit 10):", JSON.stringify(data, null, 2));
    }
}
run();
