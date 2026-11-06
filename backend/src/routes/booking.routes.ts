import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/submit', BookingController.submit);
router.post('/cancel/:billId', BookingController.cancel);
router.get('/last-sale/:gameCode', BookingController.lastSale);

export default router;
