import { supabase } from './src/config/db.js';

async function testDeleteRules() {
    try {
        console.log('Fetching inventory items...');
        const { data: inventory, error: invError } = await supabase
            .from('inventory')
            .select('id, ingredient_name, quantity');
            
        if (invError) {
            console.error('Error fetching inventory:', invError);
            return;
        }

        console.log(`Found ${inventory.length} products.`);

        console.log('Fetching pending supplier payments...');
        const { data: payouts, error: payoutError } = await supabase
            .from('supplier_payout_requests')
            .select('notes, status')
            .eq('status', 'PENDING');

        if (payoutError) {
            console.error('Error fetching payouts:', payoutError);
            return;
        }

        console.log(`Found ${payouts.length} pending payout requests.`);

        const parseNames = (notes) => {
            if (!notes) return [];
            const regex = /(?:Purchased|Added)\s+(\d+(?:\.\d+)?)\s*x\s+(.*?)\s*\(Rs\.\s*(\d+(?:\.\d+)?)\s*each\)/gi;
            const names = [];
            let match;
            while ((match = regex.exec(notes)) !== null) {
                names.push(match[2].trim().toLowerCase());
            }
            return names;
        };

        console.log('\n--- Evaluating Deletion Rules ---');
        for (const item of inventory) {
            const quantity = parseFloat(item.quantity || 0);
            const stockExists = quantity > 0;
            
            const lowerName = item.ingredient_name.trim().toLowerCase();
            const pendingPayments = (payouts || []).some(p => {
                let notes = p.notes || '';
                if (notes.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(notes);
                        notes = parsed.legacy_notes || '';
                    } catch (e) {
                        // ignore
                    }
                }
                const namesInPayout = parseNames(notes);
                if (namesInPayout.length === 0) {
                    return notes.toLowerCase().includes(lowerName);
                }
                return namesInPayout.includes(lowerName);
            });

            const canDelete = !stockExists && !pendingPayments;
            
            console.log(`Product: "${item.ingredient_name}" (ID: ${item.id})`);
            console.log(`  - Stock Quantity: ${quantity} -> ${stockExists ? '❌ BLOCKED' : '✅ OK'}`);
            console.log(`  - Pending Payments: -> ${pendingPayments ? '❌ BLOCKED' : '✅ OK'}`);
            console.log(`  - Can Delete: ${canDelete ? '✅ YES' : '❌ NO'}`);
            if (!canDelete) {
                let reason = '';
                if (stockExists && pendingPayments) {
                    reason = 'Stock exists and outstanding supplier payments exist';
                } else if (stockExists) {
                    reason = 'Stock exists';
                } else {
                    reason = 'Outstanding supplier payments exist';
                }
                console.log(`  - Reason: ${reason}`);
            }
            console.log('-----------------------------');
        }
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

testDeleteRules();
