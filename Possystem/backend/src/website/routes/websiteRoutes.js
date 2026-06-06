import express from 'express';
import * as contactController from '../controllers/contactController.js';
import * as websiteFeatureController from '../controllers/websiteFeatureController.js';

const router = express.Router();

// POST /api/website/contact - Submit a message
router.post('/contact', contactController.submitContact);

// GET /api/website/contact - Get all messages (Admin)
router.get('/contact', contactController.getAllContacts);

// PATCH /api/website/contact/:id/status - Update message status
router.patch('/contact/:id/status', contactController.updateContactStatus);

// POST /api/website/reservations - Submit a reservation
router.post('/reservations', websiteFeatureController.submitReservation);

// POST /api/website/inquiries - Submit an event inquiry
router.post('/inquiries', websiteFeatureController.submitEventInquiry);

export default router;
