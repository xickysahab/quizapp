import { Router } from 'express';
import { createEvent, getHostEvents, getEventById, deleteEvent } from '../controllers/event.controller';
import { authenticateHost } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateHost); // All event routes require host authentication

router.post('/', createEvent);
router.get('/', getHostEvents);
router.get('/:id', getEventById);
router.delete('/:id', deleteEvent);

export default router;
