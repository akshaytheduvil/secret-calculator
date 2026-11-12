import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/submit', BookingController.submit);
router.put('/bill/:billId', BookingController.edit);
router.post('/edit/:billId', BookingController.edit);
router.post('/cancel/:billId', BookingController.cancel);
router.delete('/bill/:billId', BookingController.cancel);
router.get('/last-sale/:gameCode', BookingController.lastSale);

export default router;
