import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/sales', ReportController.sales);
router.get('/winning', ReportController.winning);
router.get('/daily', ReportController.daily);
router.get('/commission', ReportController.commission);
router.get('/today', ReportController.today);

export default router;
