import express from 'express';
import { createOrder, fetchAllOrders, updateOrderStatus, closeOrder, addOrderItem, getOrderItem, cancelOrder, removeOrderItem, getOrderById, updateOrderCart } from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// GET /api/orders - Get all orders (filtered by query params)
// Accessible by ADMIN and CASHIER
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchAllOrders);

// GET /api/orders/:id - Get order by ID
// Accessible by ADMIN and CASHIER
router.get('/:id', protect, authorize('ADMIN', 'CASHIER'), getOrderById);

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

// PUT /api/orders/:id/cart - Update entire cart natively
// CASHIER only
router.put('/:id/cart', protect, authorize('CASHIER'), updateOrderCart);

// PATCH /api/orders/:id/close - Close order (mark as paid)
// CASHIER only
router.patch('/:id/close', protect, authorize('CASHIER'), closeOrder);

// DELETE /api/orders/:id - Cancel order
// CASHIER only
router.delete('/:id', protect, authorize('CASHIER'), cancelOrder);

// DELETE /api/orders/items/:orderItemId - Remove an item
// CASHIER only
router.delete('/items/:orderItemId', protect, authorize('CASHIER'), removeOrderItem);

export default router;
