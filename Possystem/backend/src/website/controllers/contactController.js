import { supabase } from '../../config/db.js';

// 1. Submit a Contact Message
export const submitContact = async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const { data, error } = await supabase
            .from('contact_messages')
            .insert([{ name, email, message }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Message sent successfully', data: data[0] });
    } catch (err) {
        console.error('Error submitting contact:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// 2. Get All Messages (Admin)
export const getAllContacts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// 3. Update Message Status (Admin)
export const updateContactStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // e.g., 'viewed'

    try {
        const { data, error } = await supabase
            .from('contact_messages')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        if (data && data.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.status(200).json({ message: 'Status updated', data: data[0] });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
