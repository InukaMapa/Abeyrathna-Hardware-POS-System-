import express from 'express';
import ocrUpload from '../middlewares/ocrUploadMiddleware.js';
import * as ocrController from '../controllers/ocrController.js';

const router = express.Router();

// Route to upload image and get extracted JSON back
router.post('/upload-bill', ocrUpload.single('billImage'), ocrController.extractText);

// Route to log the successful scan in the db
router.post('/log-scan', express.json(), ocrController.logBillScan);

// Route to save/learn a new template
router.post('/save-template', express.json(), ocrController.saveTemplate);

export default router;
