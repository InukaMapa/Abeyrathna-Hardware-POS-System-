import { supabase } from '../config/db.js';
import { hashPassword } from '../utils/passwordUtils.js';

/**
 * Get all staff members (users) with pagination, filtering, and searching
 * @route GET /api/staff
 * @access Admin only
 */
export const getAllStaff = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role, status } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const fromOffset = (pageNum - 1) * limitNum;
        const toOffset = fromOffset + limitNum - 1;

        let query = supabase
            .from('users')
            .select('id, username, email, role, full_name, contact_number, status, created_at', { count: 'exact' });

        // Apply searching if provided
        if (search) {
            const cleanSearch = search.trim();
            query = query.or(`username.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,full_name.ilike.%${cleanSearch}%`);
        }

        // Apply role filter if provided
        if (role && role !== 'ALL') {
            query = query.eq('role', role.toUpperCase());
        }

        // Apply status filter if provided
        if (status && status !== 'ALL') {
            query = query.eq('status', status.toUpperCase());
        }

        // Apply pagination and ordering
        query = query
            .order('created_at', { ascending: false })
            .range(fromOffset, toOffset);

        const { data, count, error } = await query;

        if (error) {
            console.error('[STAFF] Error fetching staff list:', error);
            return res.status(500).json({ error: 'Failed to retrieve staff list.' });
        }

        res.status(200).json({
            staff: data,
            total: count,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil((count || 0) / limitNum)
        });
    } catch (err) {
        console.error('[STAFF] Unexpected error in getAllStaff:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Add a new staff member account
 * @route POST /api/staff
 * @access Admin only
 */
export const addStaff = async (req, res) => {
    try {
        const { username, password, email, role, full_name, contact_number, status } = req.body;

        // Basic validation
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required fields.' });
        }

        const normalizedRole = role.toUpperCase();
        if (normalizedRole !== 'ADMIN' && normalizedRole !== 'CASHIER') {
            return res.status(400).json({ error: 'Invalid role. Must be ADMIN or CASHIER.' });
        }

        // Check if username already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        if (checkError) {
            console.error('[STAFF] Error checking username uniqueness:', checkError);
            return res.status(500).json({ error: 'Database error occurred during username validation.' });
        }

        if (existingUser) {
            return res.status(409).json({ error: 'A user with this username already exists.' });
        }

        // Check if email already exists if provided
        if (email) {
            const { data: existingEmail, error: emailCheckError } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (emailCheckError) {
                console.error('[STAFF] Error checking email uniqueness:', emailCheckError);
                return res.status(500).json({ error: 'Database error occurred during email validation.' });
            }

            if (existingEmail) {
                return res.status(409).json({ error: 'A user with this email address already exists.' });
            }
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert new staff member
        const { data: newStaff, error: insertError } = await supabase
            .from('users')
            .insert([{
                username,
                password_hash: hashedPassword,
                email: email || null,
                role: normalizedRole,
                full_name: full_name || null,
                contact_number: contact_number || null,
                status: status ? status.toUpperCase() : 'ACTIVE'
            }])
            .select('id, username, email, role, full_name, contact_number, status, created_at')
            .single();

        if (insertError) {
            console.error('[STAFF] Error inserting staff record:', insertError);
            return res.status(500).json({ error: 'Failed to create staff account.' });
        }

        res.status(201).json({
            message: 'Staff account created successfully.',
            staff: newStaff
        });
    } catch (err) {
        console.error('[STAFF] Unexpected error in addStaff:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Update an existing staff member's details
 * @route PUT /api/staff/:id
 * @access Admin only
 */
export const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, full_name, contact_number } = req.body;

        // Basic validation
        if (!username || !role) {
            return res.status(400).json({ error: 'Username and role are required fields.' });
        }

        const normalizedRole = role.toUpperCase();
        if (normalizedRole !== 'ADMIN' && normalizedRole !== 'CASHIER') {
            return res.status(400).json({ error: 'Invalid role. Must be ADMIN or CASHIER.' });
        }

        // Check if username is taken by another user
        const { data: existingUsername, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .neq('id', id)
            .maybeSingle();

        if (checkError) {
            console.error('[STAFF] Error checking username uniqueness on update:', checkError);
            return res.status(500).json({ error: 'Database error occurred during username validation.' });
        }

        if (existingUsername) {
            return res.status(409).json({ error: 'A user with this username already exists.' });
        }

        // Check if email is taken by another user if provided
        if (email) {
            const { data: existingEmail, error: emailCheckError } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .neq('id', id)
                .maybeSingle();

            if (emailCheckError) {
                console.error('[STAFF] Error checking email uniqueness on update:', emailCheckError);
                return res.status(500).json({ error: 'Database error occurred during email validation.' });
            }

            if (existingEmail) {
                return res.status(409).json({ error: 'A user with this email address already exists.' });
            }
        }

        // Perform update
        const { data: updatedStaff, error: updateError } = await supabase
            .from('users')
            .update({
                username,
                email: email || null,
                role: normalizedRole,
                full_name: full_name || null,
                contact_number: contact_number || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('id, username, email, role, full_name, contact_number, status, created_at')
            .single();

        if (updateError) {
            console.error('[STAFF] Error updating staff record:', updateError);
            return res.status(500).json({ error: 'Failed to update staff details.' });
        }

        res.status(200).json({
            message: 'Staff account updated successfully.',
            staff: updatedStaff
        });
    } catch (err) {
        console.error('[STAFF] Unexpected error in updateStaff:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Toggle a staff member's account status (Activate/Deactivate)
 * @route PATCH /api/staff/:id/status
 * @access Admin only
 */
export const toggleStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required. Must be ACTIVE or INACTIVE.' });
        }

        const normalizedStatus = status.toUpperCase();
        if (normalizedStatus !== 'ACTIVE' && normalizedStatus !== 'INACTIVE') {
            return res.status(400).json({ error: 'Invalid status. Must be ACTIVE or INACTIVE.' });
        }

        // Prevent admin from deactivating their own account
        if (req.user?.userId === id && normalizedStatus === 'INACTIVE') {
            return res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
        }

        const { data: updatedStaff, error: updateError } = await supabase
            .from('users')
            .update({
                status: normalizedStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('id, username, email, role, full_name, contact_number, status, created_at')
            .single();

        if (updateError) {
            console.error('[STAFF] Error updating staff status:', updateError);
            return res.status(500).json({ error: 'Failed to update account status.' });
        }

        res.status(200).json({
            message: `Staff account successfully ${normalizedStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`,
            staff: updatedStaff
        });
    } catch (err) {
        console.error('[STAFF] Unexpected error in toggleStaffStatus:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Reset a staff member's password
 * @route PATCH /api/staff/:id/reset-password
 * @access Admin only
 */
export const resetStaffPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        const hashedPassword = await hashPassword(newPassword);

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            console.error('[STAFF] Error resetting staff password:', updateError);
            return res.status(500).json({ error: 'Failed to reset staff password.' });
        }

        res.status(200).json({ message: 'Password reset successfully.' });
    } catch (err) {
        console.error('[STAFF] Unexpected error in resetStaffPassword:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Delete a staff member account
 * @route DELETE /api/staff/:id
 * @access Admin only
 */
export const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting their own account
        if (req.user?.userId === id) {
            return res.status(400).json({ error: 'You cannot delete your own admin account.' });
        }

        // Perform deletion
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[STAFF] Error deleting staff record:', deleteError);
            return res.status(500).json({ error: 'Failed to delete staff account.' });
        }

        res.status(200).json({ message: 'Staff account deleted successfully.' });
    } catch (err) {
        console.error('[STAFF] Unexpected error in deleteStaff:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
