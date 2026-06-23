import express from 'express';
import { 
    fetchSuppliers, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier,
    getSupplierInventoryValue 
} from '../controllers/supplierController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

/**
 * Supplier Routes
 */
router.get('/', protect, authorize('ADMIN', 'CASHIER'), fetchSuppliers);
router.post('/', protect, authorize('ADMIN'), addSupplier);
router.get('/:id/inventory-value', protect, authorize('ADMIN'), getSupplierInventoryValue);
router.put('/:id', protect, authorize('ADMIN'), updateSupplier);
router.delete('/:id', protect, authorize('ADMIN'), deleteSupplier);

export default router;
