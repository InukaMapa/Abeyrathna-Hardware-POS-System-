import express from 'express';
import { 
    fetchSuppliers, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier 
} from '../controllers/supplierController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

/**
 * Supplier Routes
 */
router.get('/', protect, authorize('ADMIN'), fetchSuppliers);
router.post('/', protect, authorize('ADMIN'), addSupplier);
router.put('/:id', protect, authorize('ADMIN'), updateSupplier);
router.delete('/:id', protect, authorize('ADMIN'), deleteSupplier);

export default router;
