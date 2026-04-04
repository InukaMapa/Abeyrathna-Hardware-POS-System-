import express from 'express';
import { getTablesOverview, getCashierStats } from '../controllers/cashierController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

/**
 * Cashier-specific routes
 * All routes require JWT authentication and CASHIER role
 */

// GET /api/cashier/tables - Get all tables grouped by place with active order status
router.get('/tables', protect, authorize('CASHIER', 'ADMIN'), getTablesOverview);

// GET /api/cashier/stats - Get cashier dashboard statistics
router.get('/stats', protect, authorize('CASHIER', 'ADMIN'), getCashierStats);

export default router;
