import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUserProfile, updateUserProfile } from '../controllers/userController';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get user profile
router.get('/profile', getUserProfile);

// Update user profile
router.patch('/profile', updateUserProfile);

export default router;
