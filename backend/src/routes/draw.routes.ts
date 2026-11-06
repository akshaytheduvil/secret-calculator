import { Router } from 'express';
import { DrawController } from '../controllers/draw.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public / Authenticated read endpoints
router.get('/overview', DrawController.getOverview);
router.get('/results', authenticateToken, DrawController.getResults);

// Admin-only management endpoints
router.post('/results/publish', authenticateToken, requireRole('ADMIN'), DrawController.publishResult);
router.post('/manual-status', authenticateToken, requireRole('ADMIN'), DrawController.setManualStatus);
router.post('/update-timing', authenticateToken, requireRole('ADMIN'), DrawController.updateTiming);

export default router;
