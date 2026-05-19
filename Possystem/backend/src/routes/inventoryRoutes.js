import express from 'express';
import {
    fetchInventoryList,
    updateInventoryItem,
    addInventoryItem,
    fetchInventoryItemDetails,
    deleteInventoryItem,
    fetchInventoryCategories,
    createInventoryCategory,
    deleteInventoryCategory,
    fetchInventoryBatches,
    createInventoryBatch,
    updateInventoryBatch,
    settleBatchPayment,
    fetchPayoutRequests,
    completePayoutRequest,
    fetchRefundBatches,
    completeRefundBatch
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

// Batch Routes
router.get('/batches', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryBatches);
router.post('/batches', protect, authorize('ADMIN'), createInventoryBatch);
router.put('/batches/:id', protect, authorize('ADMIN'), updateInventoryBatch);
router.post('/batches/:id/pay', protect, authorize('ADMIN'), settleBatchPayment);
router.get('/payout-requests', protect, authorize('ADMIN', 'CASHIER'), fetchPayoutRequests);
router.post('/payout-requests/:id/complete', protect, authorize('CASHIER'), completePayoutRequest);
router.get('/refund-batches', protect, authorize('ADMIN', 'CASHIER'), fetchRefundBatches);
router.post('/refund-batches/:id/complete', protect, authorize('CASHIER'), completeRefundBatch);

// Return Routes
router.get('/returns', protect, authorize('ADMIN', 'CASHIER'), fetchReturns);
router.post('/returns', protect, authorize('ADMIN'), createReturn);
router.put('/returns/:id/status', protect, authorize('ADMIN'), updateStatus);
router.post('/returns/:id/resolve', protect, authorize('ADMIN'), resolveReturn);

// ADMIN-only routes for inventory management
router.post('/', protect, authorize('ADMIN'), addInventoryItem); // Add new or add stock
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryList);
router.get('/:id', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryItemDetails); // Get details
router.put('/:id', protect, authorize('ADMIN'), updateInventoryItem); // Edit details
router.delete('/:id', protect, authorize('ADMIN'), deleteInventoryItem); // Delete

export default router;
