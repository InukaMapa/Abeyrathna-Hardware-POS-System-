import { supabase } from '../config/db.js';

/**
 * Fetch all supplier returns with filters.
 * @route GET /api/inventory/returns
 */
export const fetchSupplierReturns = async (req, res) => {
    try {
        const { supplier_id, status, search } = req.query;

        let query = supabase
            .from('supplier_returns')
            .select('*, inventory(ingredient_name, item_code, buying_price), suppliers(supplier_name)')
            .order('created_at', { ascending: false });

        if (supplier_id && supplier_id !== 'all') {
            query = query.eq('supplier_id', supplier_id);
        }
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching returns:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Create a new supplier return.
 * @route POST /api/inventory/returns
 */
export const createSupplierReturn = async (req, res) => {
    try {
        const {
            item_id, supplier_id, quantity,
            return_type, reason, warehouse_location, notes
        } = req.body;

        if (!item_id || !supplier_id || !quantity) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        // 1. Generate Return Number
        const returnNumber = `RET-${Math.floor(10000 + Math.random() * 90000)}`;

        // 2. Insert Return Record
        const { data, error } = await supabase
            .from('supplier_returns')
            .insert([{
                return_number: returnNumber,
                item_id,
                supplier_id,
                quantity: parseFloat(quantity),
                return_type,
                reason,
                warehouse_location,
                notes,
                status: 'PENDING',
                authorized_by: req.user.id
            }])
            .select()
            .single();

        if (error) throw error;

        // 3. Deduct from inventory (update general quantity and specific tier quantity_remaining)
        const { data: item, error: itemError } = await supabase
            .from('inventory')
            .select('quantity, supplier_info')
            .eq('id', item_id)
            .single();

        if (!itemError) {
            const newQty = Math.max(0, parseFloat(item.quantity) - parseFloat(quantity));
            
            let tier_id = null;
            if (notes) {
                try {
                    if (notes.startsWith('{')) {
                        const parsed = JSON.parse(notes);
                        tier_id = parsed.tier_id;
                    }
                } catch (e) {
                    console.error('Failed to parse notes in return deduction:', e);
                }
            }

            let updatedSupplierInfo = item.supplier_info;
            if (item.supplier_info) {
                try {
                    let tiers = JSON.parse(item.supplier_info);
                    if (Array.isArray(tiers)) {
                        let remainingToDeduct = parseFloat(quantity);
                        if (tier_id) {
                            const tier = tiers.find(t => t.id === tier_id);
                            if (tier) {
                                tier.quantity_remaining = Math.max(0, parseFloat(tier.quantity_remaining || 0) - remainingToDeduct);
                            }
                        } else {
                            // FIFO Fallback
                            for (let i = 0; i < tiers.length; i++) {
                                if (remainingToDeduct <= 0) break;
                                const avail = parseFloat(tiers[i].quantity_remaining || 0);
                                if (avail > 0) {
                                    const deduct = Math.min(avail, remainingToDeduct);
                                    tiers[i].quantity_remaining = avail - deduct;
                                    remainingToDeduct -= deduct;
                                }
                            }
                        }
                        updatedSupplierInfo = JSON.stringify(tiers);
                    }
                } catch (e) {
                    console.error('Error updating supplier_info tiers during return deduction:', e);
                }
            }

            await supabase
                .from('inventory')
                .update({ 
                    quantity: newQty,
                    supplier_info: updatedSupplierInfo
                })
                .eq('id', item_id);
        }

        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating return:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Approve/Complete a return.
 */
export const updateReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updates = { status };
        if (status === 'APPROVED') {
            updates.approved_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('supplier_returns')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error('Error updating return:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Resolve a return with specific outcome (REFUND, CREDIT_NOTE, REPLACEMENT).
 * @route POST /api/inventory/returns/:id/resolve
 */
export const resolveSupplierReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            resolution_type,
            refund_amount,
            credit_note_number,
            notes
        } = req.body;

        const { data: ret, error: fetchErr } = await supabase
            .from('supplier_returns')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr) throw fetchErr;

        let mergedNotes = notes || ret.notes;
        if (ret.notes && ret.notes.startsWith('{')) {
            try {
                const parsed = JSON.parse(ret.notes);
                parsed.resolution_notes = notes || '';
                mergedNotes = JSON.stringify(parsed);
            } catch (e) {
                // Keep as is
            }
        }

        const updates = {
            status: resolution_type === 'REFUND' ? 'CASH_REFUNDED' : 'COMPLETED',
            resolution_type,
            refund_amount: (resolution_type === 'REFUND' || resolution_type === 'CREDIT_NOTE') ? parseFloat(refund_amount) : null,
            credit_note_number: resolution_type === 'CREDIT_NOTE' ? credit_note_number : null,
            resolved_at: new Date().toISOString(),
            notes: mergedNotes
        };

        const { data: updatedReturn, error: updateErr } = await supabase
            .from('supplier_returns')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // No refund batch logic needed.

        res.status(200).json(updatedReturn);
    } catch (err) {
        console.error('Error resolving return:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};
