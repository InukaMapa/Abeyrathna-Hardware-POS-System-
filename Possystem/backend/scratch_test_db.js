import { supabase } from './src/config/db.js';

async function checkDb() {
    try {
        console.log("Checking orders...");
        const { data: orders, error: oErr } = await supabase.from('orders').select('*').limit(1);
        if (oErr) {
            console.error("orders error:", oErr);
        } else {
            console.log("orders count/columns:", orders ? Object.keys(orders[0] || {}) : "null");
        }

        console.log("Checking cash_shifts...");
        const { data: shifts, error: sErr } = await supabase.from('cash_shifts').select('*').limit(1);
        if (sErr) {
            console.error("cash_shifts error:", sErr);
        } else {
            console.log("cash_shifts count/columns:", shifts ? Object.keys(shifts[0] || {}) : "null");
        }
    } catch (e) {
        console.error("Unexpected error:", e);
    }
}
checkDb();
