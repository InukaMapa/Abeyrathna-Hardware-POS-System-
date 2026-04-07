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
        const { supplier_id, supplier_name, company_name, phone_number } = req.body;

        if (!supplier_id || !supplier_name || !phone_number) {
            return res.status(400).json({ message: 'Supplier ID, Name, and Phone Number are required.' });
        }

        const { data, error } = await supabase
            .from('suppliers')
            .insert([{
                supplier_id,
                supplier_name,
                company_name,
                phone_number
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ message: 'Supplier ID already exists.' });
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
        const updates = req.body;

        const { data, error } = await supabase
            .from('suppliers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
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

        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ message: 'Supplier deleted successfully.' });
    } catch (err) {
        console.error('Error deleting supplier:', err);
        res.status(500).json({ message: 'Internal server error while deleting supplier.' });
    }
};
