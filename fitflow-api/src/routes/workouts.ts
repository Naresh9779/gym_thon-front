import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';
import {
  getUserWorkoutPlans,
  getWorkoutPlanById,
  generateWorkoutCycle,
  deleteWorkoutPlan,
} from '../controllers/workoutController';

const router = Router();

router.use(authenticate);
router.use(requireActiveSubscription);

router.get('/', getUserWorkoutPlans);

router.get('/:id', getWorkoutPlanById);

// Backward-compatible generate endpoint (alias of generate-cycle)
router.post('/generate', generateWorkoutCycle);

router.post('/generate-cycle', generateWorkoutCycle);

router.delete('/:id', deleteWorkoutPlan);

export default router;
