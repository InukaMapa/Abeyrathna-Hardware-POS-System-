import express from 'express';
import {
    fetchInventoryList,
    updateInventoryItem,
    receiveInventoryStock,
    addInventoryItem,
    fetchInventoryItemDetails,
    deleteInventoryItem,
    fetchInventoryCategories,
    createInventoryCategory,
    deleteInventoryCategory,
    fetchPayoutRequests,
    completePayoutRequest
} from '../controllers/inventoryController.js';
import {
    fetchSupplierReturns as fetchReturns,
    createSupplierReturn as createReturn,
    updateReturnStatus as updateStatus,
    resolveSupplierReturn as resolveReturn
} from '../controllers/returnController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Category Routes (Must be before /:id to not conflict)
router.get('/categories', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryCategories);
router.post('/categories', protect, authorize('ADMIN'), createInventoryCategory);
router.delete('/categories/:id', protect, authorize('ADMIN'), deleteInventoryCategory);

// Payout Routes
router.get('/payout-requests', protect, authorize('ADMIN', 'CASHIER'), fetchPayoutRequests);
router.post('/payout-requests/:id/complete', protect, authorize('CASHIER'), completePayoutRequest);
// Return Routes
router.get('/returns', protect, authorize('ADMIN', 'CASHIER'), fetchReturns);
router.post('/returns', protect, authorize('ADMIN'), createReturn);
router.put('/returns/:id/status', protect, authorize('ADMIN'), updateStatus);
router.post('/returns/:id/resolve', protect, authorize('ADMIN'), resolveReturn);

// ADMIN-only routes for inventory management
router.post('/', protect, authorize('ADMIN'), addInventoryItem); // Add new or add stock
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryList);
router.post('/:id/receive', protect, authorize('ADMIN'), receiveInventoryStock); // Receive stock for existing item
router.get('/:id', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryItemDetails); // Get details
router.put('/:id', protect, authorize('ADMIN'), updateInventoryItem); // Edit details
router.delete('/:id', protect, authorize('ADMIN'), deleteInventoryItem); // Delete

export default router;
