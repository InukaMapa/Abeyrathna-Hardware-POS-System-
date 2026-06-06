import express from 'express';
import { getDashboardStats, getInventoryReport, getProductReport, getSalesReport, getSalesTrendReport, getSupplierReport } from '../controllers/adminController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

/**
 * Admin Dashboard Routes
 */
router.get('/stats', protect, authorize('ADMIN'), getDashboardStats);
router.get('/reports/sales-trend', protect, authorize('ADMIN'), getSalesTrendReport);
router.get('/reports/sales', protect, authorize('ADMIN'), getSalesReport);
router.get('/reports/products', protect, authorize('ADMIN'), getProductReport);
router.get('/reports/inventory', protect, authorize('ADMIN'), getInventoryReport);
router.get('/reports/suppliers', protect, authorize('ADMIN'), getSupplierReport);

export default router;
