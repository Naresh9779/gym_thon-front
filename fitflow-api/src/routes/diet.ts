import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';
import {
  getUserDietPlans,
  getDietPlanById,
  deleteDietPlan,
} from '../controllers/dietController';

const router = Router();

// All diet routes require authentication
router.use(authenticate);
router.use(requireActiveSubscription);

// Get all diet plans for user
router.get('/', getUserDietPlans);

// Get specific diet plan
router.get('/:id', getDietPlanById);

// Delete diet plan
router.delete('/:id', deleteDietPlan);

export default router;
