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
            .select('*, inventory(ingredient_name, item_code, buying_price), suppliers(supplier_name), inventory_batches!supplier_returns_batch_id_fkey(batch_number)')
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
            item_id, batch_id, supplier_id, quantity,
            return_type, reason, warehouse_location, notes
        } = req.body;

        if (!item_id || !batch_id || !supplier_id || !quantity) {
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
                batch_id,
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

        // 3. Optional: Deduct from inventory?
        // Usually returns should reduce local stock if they are physically sent back.
        const { data: item, error: itemError } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('id', item_id)
            .single();

        if (!itemError) {
            const newQty = Math.max(0, parseFloat(item.quantity) - parseFloat(quantity));
            await supabase
                .from('inventory')
                .update({ quantity: newQty })
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

        const updates = {
            status: resolution_type === 'REFUND' ? 'CASH_REFUNDED' : 'COMPLETED',
            resolution_type,
            refund_amount: (resolution_type === 'REFUND' || resolution_type === 'CREDIT_NOTE') ? parseFloat(refund_amount) : null,
            credit_note_number: resolution_type === 'CREDIT_NOTE' ? credit_note_number : null,
            resolved_at: new Date().toISOString(),
            notes: notes || ret.notes
        };

        const { data: updatedReturn, error: updateErr } = await supabase
            .from('supplier_returns')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // If resolution is REFUND, create a refund batch for cashier
        if (resolution_type === 'REFUND') {
            const batchNumber = `RFB-${Math.floor(10000 + Math.random() * 90000)}`;
            const { error: batchErr } = await supabase
                .from('refund_batches')
                .insert([{
                    batch_number: batchNumber,
                    return_id: id,
                    supplier_id: ret.supplier_id,
                    amount: parseFloat(refund_amount),
                    status: 'PENDING'
                }]);
            if (batchErr) throw batchErr;
        }

        res.status(200).json(updatedReturn);
    } catch (err) {
        console.error('Error resolving return:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};
