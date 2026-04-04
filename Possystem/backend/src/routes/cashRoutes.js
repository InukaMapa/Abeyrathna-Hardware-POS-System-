import express from 'express';
import {
    startShift,
    addMovement,
    getShiftSummary,
    saveCashCount,
    endShift,
    getAllShifts,
    getShiftOrders,
    getShiftMovements,
    getLatestCashCount,
    submitShiftReport,
    approveShiftReport,
    getShiftCounts
} from '../controllers/cashController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

/**
 * Cash Counter Routes
 */

// Shift operations (Cashier)
router.post('/start-shift', protect, authorize('CASHIER'), startShift);
router.post('/add-movement', protect, authorize('CASHIER'), addMovement);
router.get('/summary/:shiftId', protect, authorize('CASHIER', 'ADMIN'), getShiftSummary);
router.post('/count', protect, authorize('CASHIER'), saveCashCount);
router.get('/count/:shiftId', protect, authorize('CASHIER', 'ADMIN'), getLatestCashCount);
router.get('/counts/:shiftId', protect, authorize('CASHIER', 'ADMIN'), getShiftCounts);
router.post('/submit-report', protect, authorize('CASHIER'), submitShiftReport);
router.post('/end-shift', protect, authorize('CASHIER'), endShift);

// Admin & Cashier (Filtering handled in controller)
router.get('/admin/shifts', protect, authorize('ADMIN', 'CASHIER'), getAllShifts);
router.get('/shift-orders/:shiftId', protect, authorize('ADMIN', 'CASHIER'), getShiftOrders);
router.get('/shift-movements/:shiftId', protect, authorize('ADMIN', 'CASHIER'), getShiftMovements);
router.post('/approve-shift/:shiftId', protect, authorize('ADMIN'), approveShiftReport);

export default router;
