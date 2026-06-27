import { supabase } from './src/config/db.js';

async function checkDb() {
    try {
        const { data: payouts, error } = await supabase.from('supplier_payout_requests').select('*');
        if (error) {
            console.error('Error:', error);
            return;
        }
        console.log("Total payout requests:", payouts.length);
        console.log("Payout details:", JSON.stringify(payouts, null, 2));
    } catch (e) {
        console.error(e);
    }
}
checkDb();
