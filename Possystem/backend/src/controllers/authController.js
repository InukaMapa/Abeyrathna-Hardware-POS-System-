import { supabase } from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/passwordUtils.js';
import { generateToken } from '../utils/jwtUtils.js';
import { sendEmail } from '../utils/emailUtils.js';
import { config } from '../config/env.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Handles user login.
 * @route POST /api/auth/login
 */
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        // Find user in database by username or email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`)
            .maybeSingle();

        if (error) {
            console.error('Supabase login query error:', error);
            return res.status(500).json({ message: 'Internal server error.' });
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Verify password
        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // DEBUG: Log user role before JWT generation
        console.log('🔍 DEBUG - User login:', {
            userId: user.id,
            username: user.username,
            roleFromDB: user.role,
            roleType: typeof user.role
        });

        // Ensure role is uppercase (normalize if needed)
        const normalizedRole = user.role ? user.role.toUpperCase() : 'CASHIER';

        // Validate role is one of the allowed values
        const allowedRoles = ['ADMIN', 'CASHIER'];
        if (!allowedRoles.includes(normalizedRole)) {
            console.error('❌ Invalid role detected:', user.role);
            return res.status(500).json({ message: 'Invalid user role configuration.' });
        }

        // Generate JWT token with userId, username and role
        const token = generateToken({
            id: user.id,
            username: user.username,
            role: normalizedRole
        });

        // DEBUG: Verify token payload
        const decoded = jwt.verify(token, config.jwtSecret);
        console.log('✅ DEBUG - JWT Generated:', {
            userId: decoded.userId,
            role: decoded.role,
            expiresIn: new Date(decoded.exp * 1000).toISOString()
        });

        // Return success response
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                userId: user.id,
                role: normalizedRole,
                username: user.username
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};


/**
 * Handles user registration.
 * @route POST /api/auth/register
 */
export const register = async (req, res) => {
    try {
        const { username, password, role, email } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        // Check if user exists
        const { data: existingUser, error: existingError } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        if (existingError) {
            console.error('Supabase registration lookup error:', existingError);
            return res.status(500).json({ message: 'Internal server error.' });
        }

        if (existingUser) {
            return res.status(400).json({ message: 'User with this username already exists.' });
        }

        const hashedPassword = await hashPassword(password);

        // Validate and normalize role
        const allowedRoles = ['ADMIN', 'CASHIER'];
        const normalizedRole = role ? role.toUpperCase() : 'CASHIER';
        const userRole = allowedRoles.includes(normalizedRole) ? normalizedRole : 'CASHIER';

        // DEBUG: Log registration details
        console.log('🔍 DEBUG - User Registration:', {
            username,
            roleFromFrontend: role,
            normalizedRole,
            finalRole: userRole
        });

        // Insert user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                username,
                password_hash: hashedPassword,
                role: userRole,
                email: email || null // Optional email for now, but needed for recovery
            }])
            .select()
            .single();

        if (error) throw error;

        // DEBUG: Log successful registration
        console.log('✅ User registered successfully:', {
            userId: newUser.id,
            username: newUser.username,
            role: newUser.role
        });

        res.status(201).json({
            message: 'User registered successfully. Login to continue.',
            user: {
                userId: newUser.id,
                username: newUser.username,
                role: newUser.role
            }
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * Verifies user email.
 * @route GET/POST /api/auth/verify-email
 */
export const verifyEmail = async (req, res) => {
    // Feature disabled because DB table 'users' is missing 'verification_token' column
    return res.status(501).json({
        message: 'Email verification is disabled because the database does not support it (missing columns).'
    });
};

/**
 * Initiates password reset.
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const { data: user, error } = await supabase
            .from('users')
            .update({
                otp: otp,
                otp_expires: expires
            })
            .eq('email', email)
            .select()
            .single();

        if (error || !user) {
            // For security, don't reveal if user exists or not, but for now we will just return 404 if not found to help debugging
            // In production, you might want to always say "If email exists, OTP sent"
            return res.status(404).json({ message: 'User with this email not found' });
        }

        await sendEmail({
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP is: ${otp}. It expires in 10 minutes.`
        });

        res.json({ message: 'OTP sent to email' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Verifies OTP.
 * @route POST /api/auth/verify-otp
 */
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date(user.otp_expires) < new Date()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Resets password.
 * @route POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }

        // Verify OTP again to be safe
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date(user.otp_expires) < new Date()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        const hashedPassword = await hashPassword(newPassword);

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                otp: null,
                otp_expires: null
            })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Updates user profile.
 * @route PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // Middleware attaches as userId from payload

        // When using multer, req.body is populated even for multipart/form-data
        const { username, email, current_password, new_password } = req.body;

        // Find user
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;

        // Handle password change
        if (new_password) {
            if (!current_password) {
                return res.status(400).json({ message: 'Current password is required to set a new one.' });
            }
            const isMatch = await comparePassword(current_password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect current password.' });
            }
            updates.password_hash = await hashPassword(new_password);
        }

        // Handle profile image from multer-s3
        if (req.file) {
            updates.profile_image = req.file.location;
        } else if (req.body.profile_image) {
            // Fallback for direct URL update if needed
            updates.profile_image = req.body.profile_image;
        }

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Generate new token with updated info
        const token = generateToken({
            id: updatedUser.id,
            username: updatedUser.username,
            role: updatedUser.role
        });

        res.status(200).json({
            message: 'Profile updated successfully',
            token,
            user: {
                userId: updatedUser.id,
                username: updatedUser.username,
                role: updatedUser.role,
                email: updatedUser.email,
                profile_image: updatedUser.profile_image
            }
        });

    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
