import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { authenticateHost } from '../middleware/auth.middleware';
import { rateLimit } from '../utils/rateLimit';

const router = Router();

// Hosts are a handful of people, so a tight per-IP limit is safe here and stops
// the admin password from being brute forced.
const loginLimiter = rateLimit({
  name: 'login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again in a few minutes.',
});

router.post('/register', authenticateHost, register);
router.post('/login', loginLimiter, login);

export default router;
