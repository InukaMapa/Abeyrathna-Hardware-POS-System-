import { supabase } from '../../config/db.js';

// 1. Submit a Reservation
export const submitReservation = async (req, res) => {
    const { name, phone, date, time, guests, seatingPreference, specialInstructions } = req.body;

    if (!name || !phone || !date || !time || !guests) {
        return res.status(400).json({ error: 'Required fields are missing' });
    }

    try {
        const { data, error } = await supabase
            .from('reservations')
            .insert([{
                name,
                phone,
                booking_date: date,
                booking_time: time,
                guests: parseInt(guests),
                seating_preference: seatingPreference,
                special_instructions: specialInstructions,
                status: 'pending'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Reservation submitted successfully', data: data[0] });
    } catch (err) {
        console.error('Error submitting reservation:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// 2. Submit an Event Inquiry
export const submitEventInquiry = async (req, res) => {
    const { name, email, phone, eventType, date, guestCount, requirements } = req.body;

    if (!name || !email || !phone || !eventType || !date || !guestCount) {
        return res.status(400).json({ error: 'Required fields are missing' });
    }

    try {
        const { data, error } = await supabase
            .from('event_inquiries')
            .insert([{
                name,
                email,
                phone,
                event_type: eventType,
                event_date: date,
                guest_count: parseInt(guestCount),
                requirements,
                status: 'pending'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Inquiry submitted successfully', data: data[0] });
    } catch (err) {
        console.error('Error submitting inquiry:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
