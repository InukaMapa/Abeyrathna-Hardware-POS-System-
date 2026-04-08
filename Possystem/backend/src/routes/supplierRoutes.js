import express from 'express';
<<<<<<< HEAD
import { 
    fetchSuppliers, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier 
=======
import {
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier
>>>>>>> Pasindu_dev
} from '../controllers/supplierController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

<<<<<<< HEAD
/**
 * Supplier Routes
 */
router.get('/', protect, authorize('ADMIN'), fetchSuppliers);
router.post('/', protect, authorize('ADMIN'), addSupplier);
router.put('/:id', protect, authorize('ADMIN'), updateSupplier);
router.delete('/:id', protect, authorize('ADMIN'), deleteSupplier);
=======
// All supplier routes are protected and require ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', fetchSuppliers);
router.post('/', addSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
>>>>>>> Pasindu_dev

export default router;
