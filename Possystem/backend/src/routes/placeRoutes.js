import express from 'express';
import { addPlace, fetchAllPlaces, fetchPlaceById, updatePlace, deletePlace } from '../controllers/placeController.js';
import { fetchTablesByPlaceId } from '../controllers/tableController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// GET /api/places - Get all places
// Accessible by ADMIN and CASHIER
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchAllPlaces);

// GET /api/places/:id - Get a single place
// Accessible by ADMIN and CASHIER
router.get('/:id', protect, authorize('ADMIN', 'CASHIER'), fetchPlaceById);

// GET /api/places/:placeId/tables - Get all tables for a specific place
// Accessible by ADMIN and CASHIER
router.get('/:placeId/tables', protect, authorize('ADMIN', 'CASHIER'), fetchTablesByPlaceId);

// POST /api/places - Add a new place
// ADMIN only
router.post('/', protect, authorize('ADMIN'), addPlace);

// PUT /api/places/:id - Update a place
// ADMIN only
router.put('/:id', protect, authorize('ADMIN'), updatePlace);

// DELETE /api/places/:id - Delete a place
// ADMIN only
router.delete('/:id', protect, authorize('ADMIN'), deletePlace);

export default router;
