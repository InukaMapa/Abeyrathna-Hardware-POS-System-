import express from 'express';
import { getAllStaff, addStaff, updateStaff, toggleStaffStatus, resetStaffPassword, deleteStaff } from '../controllers/staffController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// All staff management routes require authentication and the ADMIN role
router.get('/', protect, authorize('ADMIN'), getAllStaff);
router.post('/', protect, authorize('ADMIN'), addStaff);
router.put('/:id', protect, authorize('ADMIN'), updateStaff);
router.patch('/:id/status', protect, authorize('ADMIN'), toggleStaffStatus);
router.patch('/:id/reset-password', protect, authorize('ADMIN'), resetStaffPassword);
router.delete('/:id', protect, authorize('ADMIN'), deleteStaff);

export default router;
