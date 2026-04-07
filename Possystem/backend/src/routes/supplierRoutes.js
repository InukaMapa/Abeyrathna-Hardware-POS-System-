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

// All supplier routes are protected and require ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', fetchSuppliers);
router.post('/', addSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;
