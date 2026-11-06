import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken, requireRole('ADMIN'));

router.get('/dashboard', AdminController.getDashboard);
router.post('/agents', AdminController.createAgent);
router.get('/agents', AdminController.listAgents);
router.put('/agents/:id', AdminController.updateAgent);
router.post('/agents/:id/reset-password', AdminController.resetPassword);
router.delete('/users/:id', AdminController.deleteUser);

router.get('/prizes', AdminController.getPrizes);
router.put('/prizes', AdminController.updatePrizes);

export default router;
