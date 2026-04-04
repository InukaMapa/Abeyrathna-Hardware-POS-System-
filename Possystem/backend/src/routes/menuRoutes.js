import express from 'express';

import { fetchCategories, fetchLiveMenu, fetchAllMenuItems, fetchMenuStats, createMenuItem, updateMenuItem, deleteMenuItem, toggleItemStatus, createCategory, updateCategory, deleteCategory } from '../controllers/menuController.js';
import { protect, authenticateToken } from '../middlewares/authMiddleware.js';
import { authorize, authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Public routes (for QR code ordering - no auth required)
router.get('/categories', fetchCategories);
router.get('/live', fetchLiveMenu);

// Protected routes - CASHIER and ADMIN can view menu items
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchAllMenuItems);
router.get('/stats', protect, authorize('ADMIN', 'CASHIER'), fetchMenuStats);
// Category Management
router.post('/categories', authenticateToken, createCategory);
router.put('/categories/:id', authenticateToken, updateCategory);
router.delete('/categories/:id', authenticateToken, deleteCategory);


// Management Routes

// Admin-only routes for menu management (Create, Update, Delete)
router.post('/', protect, authorize('ADMIN'), createMenuItem);
router.put('/:id', protect, authorize('ADMIN'), updateMenuItem);
router.delete('/:id', protect, authorize('ADMIN'), deleteMenuItem);
router.patch('/:id/status', protect, authorize('ADMIN'), toggleItemStatus);

export default router;
