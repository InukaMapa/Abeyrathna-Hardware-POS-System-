import express from 'express';
import { login, register, verifyEmail, forgotPassword, resetPassword, verifyOTP, updateProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/s3Upload.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/verify-email', verifyEmail); // Can be GET if using link directly, but POST is safer for API
router.get('/verify-email', verifyEmail); // Support GET for direct link clicking
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Profile routes
router.put('/profile', protect, upload.single('profile_image'), updateProfile);

export default router;
