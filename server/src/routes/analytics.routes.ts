import { Router } from 'express';
import { authenticateHost } from '../middleware/auth.middleware';
import { getQuestionAnalytics, exportEventAnalytics } from '../controllers/analytics.controller';

const router = Router();

router.get('/questions/:id', authenticateHost, getQuestionAnalytics);
router.get('/events/:id/export', authenticateHost, exportEventAnalytics);

export default router;
