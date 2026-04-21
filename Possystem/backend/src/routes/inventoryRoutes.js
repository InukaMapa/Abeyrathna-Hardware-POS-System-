import express from 'express';
import {
    fetchInventoryList,
    updateInventoryItem,
    addInventoryItem,
    fetchInventoryItemDetails,
    deleteInventoryItem,
    fetchInventoryCategories,
    createInventoryCategory,
    deleteInventoryCategory
} from '../controllers/inventoryController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Category Routes (Must be before /:id to not conflict)
router.get('/categories', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryCategories);
router.post('/categories', protect, authorize('ADMIN'), createInventoryCategory);
router.delete('/categories/:id', protect, authorize('ADMIN'), deleteInventoryCategory);

// ADMIN-only routes for inventory management
router.post('/', protect, authorize('ADMIN'), addInventoryItem); // Add new or add stock
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryList);
router.get('/:id', protect, authorize('ADMIN', 'CASHIER'), fetchInventoryItemDetails); // Get details
router.put('/:id', protect, authorize('ADMIN'), updateInventoryItem); // Edit details
router.delete('/:id', protect, authorize('ADMIN'), deleteInventoryItem); // Delete

export default router;
