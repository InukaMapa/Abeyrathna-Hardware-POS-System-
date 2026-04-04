import express from 'express';
import { createOrder, fetchAllOrders, updateOrderStatus, closeOrder, addOrderItem, getOrderItem } from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// GET /api/orders - Get all orders (filtered by query params)
// Accessible by ADMIN and CASHIER
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchAllOrders);

// POST /api/orders - Create new order
// CASHIER only
router.post('/', protect, authorize('CASHIER'), createOrder);

// POST /api/orders/:orderId/items - Add item to existing order (with variants)
// CASHIER only
router.post('/:orderId/items', protect, authorize('CASHIER'), addOrderItem);

// GET /api/orders/items/:orderItemId - Get order item with variant details
// CASHIER and ADMIN
router.get('/items/:orderItemId', protect, authorize('ADMIN', 'CASHIER'), getOrderItem);

// PATCH /api/orders/:id/status - Update order status
// CASHIER only
router.patch('/:id/status', protect, authorize('CASHIER'), updateOrderStatus);

// PATCH /api/orders/:id/close - Close order (mark as paid)
// CASHIER only
router.patch('/:id/close', protect, authorize('CASHIER'), closeOrder);

export default router;
