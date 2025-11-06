import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserDietPlans,
  getDietPlanById,
  generateDietPlan,
  generateDailyDietPlan,
  deleteDietPlan,
} from '../controllers/dietController';

const router = Router();

// All diet routes require authentication
router.use(authenticate);

// Get all diet plans for user
router.get('/', getUserDietPlans);

// Get specific diet plan
router.get('/:id', getDietPlanById);

// Generate diet plan for specific date (AI-powered)
router.post('/generate', generateDietPlan);

// Generate today's diet plan (used by cron or manual trigger)
router.post('/generate-daily', generateDailyDietPlan);

// Delete diet plan
router.delete('/:id', deleteDietPlan);

export default router;
