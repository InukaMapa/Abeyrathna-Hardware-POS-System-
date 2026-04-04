import express from 'express';
import { addTable, fetchAllTables, updateTable, deleteTable } from '../controllers/tableController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// GET /api/tables - Get all tables
// Accessible by ADMIN and CASHIER
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchAllTables);

// POST /api/tables - Add a new table
// ADMIN only
router.post('/', protect, authorize('ADMIN'), addTable);

// PUT /api/tables/:id - Update a table
// ADMIN only
router.put('/:id', protect, authorize('ADMIN'), updateTable);

// DELETE /api/tables/:id - Delete a table
// ADMIN only
router.delete('/:id', protect, authorize('ADMIN'), deleteTable);

export default router;
