import { supabase } from '../config/db.js';

/**
 * Fetch all suppliers.
 * @route GET /api/suppliers
 */
export const fetchSuppliers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching suppliers:', err);
        res.status(500).json({ message: 'Internal server error while fetching suppliers.' });
    }
};

/**
 * Add a new supplier.
 * @route POST /api/suppliers
 */
export const addSupplier = async (req, res) => {
    try {
        const {
            supplier_id,
            supplier_name,
            company_name,
            phone_number,
            email,
            address,
            bank_name,
            bank_account_no,
            bank_branch
        } = req.body;

        if (!supplier_id || !supplier_name || !phone_number) {
            return res.status(400).json({ message: 'Supplier ID, Name, and Phone Number are required.' });
        }

        const { data, error } = await supabase
            .from('suppliers')
            .insert([{
                supplier_id,
                supplier_name,
                company_name,
                phone_number,
                email,
                address,
                bank_name,
                bank_account_no,
                bank_branch,
                status: 'ACTIVE'  // Auto-activate on registration
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ message: 'Supplier ID already exists.' });
            }
            if (
                ['PGRST204', '42703'].includes(error.code)
                || /bank_(name|account_no|branch)|column/i.test(error.message || '')
            ) {
                return res.status(400).json({
                    message: 'Supplier bank detail columns are missing. Run backend/sql/add_supplier_bank_details.sql in Supabase, then try again.'
                });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (err) {
        console.error('Error adding supplier:', err);
        res.status(500).json({ message: 'Internal server error while adding supplier.' });
    }
};

/**
 * Update an existing supplier.
 * @route PUT /api/suppliers/:id
 */
export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const allowedFields = [
            'supplier_name',
            'company_name',
            'phone_number',
            'email',
            'address',
            'bank_name',
            'bank_account_no',
            'bank_branch',
            'status'
        ];
        const updates = allowedFields.reduce((acc, field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                acc[field] = req.body[field];
            }
            return acc;
        }, {});

        if (updates.status === 'INACTIVE') {
            const { data: pendingPayouts, error: payoutError } = await supabase
                .from('supplier_payout_requests')
                .select('id')
                .eq('supplier_id', id)
                .eq('status', 'PENDING');

            if (payoutError) throw payoutError;

            if (pendingPayouts && pendingPayouts.length > 0) {
                return res.status(400).json({
                    message: 'Cannot deactivate supplier. Pending payments must be settled first.'
                });
            }
        }

        const { data, error } = await supabase
            .from('suppliers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (
                ['PGRST204', '42703'].includes(error.code)
                || /bank_(name|account_no|branch)|column/i.test(error.message || '')
            ) {
                return res.status(400).json({
                    message: 'Supplier bank detail columns are missing. Run backend/sql/add_supplier_bank_details.sql in Supabase, then try again.'
                });
            }
            throw error;
        }
        res.status(200).json(data);
    } catch (err) {
        console.error('Error updating supplier:', err);
        res.status(500).json({ message: 'Internal server error while updating supplier.' });
    }
};

/**
 * Delete a supplier.
 * @route DELETE /api/suppliers/:id
 */
export const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Check for pending payouts in supplier_payout_requests
        const { data: pendingPayouts, error: payoutError } = await supabase
            .from('supplier_payout_requests')
            .select('id')
            .eq('supplier_id', id)
            .eq('status', 'PENDING');

        if (payoutError) throw payoutError;

        if (pendingPayouts && pendingPayouts.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete supplier. Pending payments must be settled before removal.'
            });
        }



        // 3. Perform delete if allowed
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Supplier deleted successfully.' });
    } catch (err) {
        console.error('Error deleting supplier:', err);
        res.status(500).json({ message: err.message || 'Internal server error while deleting supplier.' });
    }
};

/**
 * Get total inventory value for a specific supplier.
 * Total = SUM(buying_price * quantity) for all inventory items with this supplier_id.
 * @route GET /api/suppliers/:id/inventory-value
 */
export const getSupplierInventoryValue = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('inventory')
            .select('buying_price, quantity')
            .eq('supplier_id', id);

        if (error) throw error;

        const totalValue = (data || []).reduce((sum, item) => {
            const price = parseFloat(item.buying_price || 0);
            const qty = parseFloat(item.quantity || 0);
            return sum + price * qty;
        }, 0);

        const totalProducts = (data || []).length;

        res.status(200).json({ totalValue, totalProducts });
    } catch (err) {
        console.error('Error fetching supplier inventory value:', err);
        res.status(500).json({ message: 'Internal server error while fetching inventory value.' });
    }
};
