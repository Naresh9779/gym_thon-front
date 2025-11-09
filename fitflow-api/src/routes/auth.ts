import { Router } from 'express';
import { register, login, getCurrentUser, refreshAccessToken, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public signup disabled: only admin can provision users
router.post('/register', (_req, res) => {
  return res.status(403).json({ ok: false, error: { message: 'Signup disabled - admin only' } });
});
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

export default router;
