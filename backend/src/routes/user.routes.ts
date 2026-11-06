import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

// Sub-dealer management for Agent B and Admin A
router.post('/subdealers', requireRole('AGENT', 'ADMIN'), UserController.createSubDealer);
router.put('/subdealers/:id', requireRole('AGENT', 'ADMIN'), UserController.updateSubDealer);
router.delete('/subdealers/:id', requireRole('AGENT', 'ADMIN'), UserController.deleteSubDealer);
router.get('/subdealers', requireRole('AGENT', 'ADMIN'), UserController.listSubDealers);

export default router;
