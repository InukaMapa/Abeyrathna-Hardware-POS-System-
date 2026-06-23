import { supabase } from './src/config/db.js';

async function testEmulated() {
    try {
        const { data: payouts, error: fetchError } = await supabase
            .from('supplier_payout_requests')
            .select('*, suppliers(supplier_name)')
            .order('authorized_at', { ascending: false });

        if (fetchError) throw fetchError;

        const emulatedBatches = (payouts || []).map(p => {
            const amount = parseFloat(p.amount || 0);

            // Parse partial payments from notes
            let paid_amount = 0;
            let notesTextForParsing = p.notes || '';
            if (p.notes && p.notes.startsWith('{')) {
                try {
                    const parsed = JSON.parse(p.notes);
                    paid_amount = parseFloat(parsed.paid_amount || 0);
                    notesTextForParsing = parsed.legacy_notes || '';
                } catch (e) {
                    console.error('Failed to parse notes in fetchEmulatedBatches:', e);
                }
            }

            const isCompleted = p.status === 'COMPLETED';
            if (isCompleted && paid_amount === 0) {
                paid_amount = amount;
            }

            const remaining_balance = Math.max(0, amount - paid_amount);
            const isPartial = paid_amount > 0 && remaining_balance > 0;
            const paymentStatus = remaining_balance <= 0 ? 'PAID' : (isPartial ? 'PARTIAL' : 'UNPAID');

            return {
                id: p.id,
                db_id: p.id,
                batch_number: p.payout_number,
                supplier_id: p.supplier_id,
                net_value: amount,
                paid_amount: paid_amount,
                remaining_balance: remaining_balance,
                batch_date: p.authorized_at,
                payment_status: paymentStatus,
                status: remaining_balance <= 0 ? 'COMPLETED' : 'PENDING',
                suppliers: {
                    id: p.supplier_id,
                    supplier_name: p.suppliers?.supplier_name || 'Unknown Supplier'
                },
                notes: p.notes
            };
        });

        console.log("Emulated batches mapped output:");
        console.log(JSON.stringify(emulatedBatches, null, 2));
    } catch (err) {
        console.error(err);
    }
}
testEmulated();
