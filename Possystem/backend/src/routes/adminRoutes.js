import express from 'express';
import { getDashboardStats } from '../controllers/adminController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

/**
 * Admin Dashboard Routes
 */
router.get('/stats', protect, authorize('ADMIN'), getDashboardStats);

export default router;
