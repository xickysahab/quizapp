import { Router } from 'express';
import { joinEvent, submitResponse } from '../controllers/participant.controller';
import { rateLimit } from '../utils/rateLimit';

const router = Router();

// Deliberately loose. A venue full of participants shares one NAT IP, so a tight
// limit here would lock out the audience this endpoint exists for; it is only a
// guard against a script hammering the join endpoint.
const joinLimiter = rateLimit({
  name: 'join',
  windowMs: 60 * 1000,
  max: Number(process.env.JOIN_RATE_LIMIT_PER_MINUTE) || 600,
  message: 'The room is receiving too many join requests. Please try again in a moment.',
});

router.post('/join', joinLimiter, joinEvent);
router.post('/response', submitResponse);

export default router;
