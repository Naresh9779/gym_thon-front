import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';
import {
  getUserWorkoutPlans,
  getWorkoutPlanById,
  generateWorkoutCycle,
  deleteWorkoutPlan,
} from '../controllers/workoutController';
import WorkoutPlan from '../models/WorkoutPlan';
import LeaveRequest from '../models/LeaveRequest';
import GymHoliday from '../models/GymHoliday';

const router = Router();

router.use(authenticate);
router.use(requireActiveSubscription);

router.get('/', getUserWorkoutPlans);

router.get('/active-day', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const plan = await WorkoutPlan.findOne({ userId, status: 'active' }).sort({ startDate: -1 }).lean();
    if (!plan || !plan.startDate || !Array.isArray(plan.days) || plan.days.length === 0) {
      return res.json({ ok: true, data: { dayIndex: 0, activeDays: 0, offDays: [] } });
    }

    const start = new Date(plan.startDate); start.setUTCHours(0, 0, 0, 0);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const startStr = start.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    if (todayStr < startStr) {
      return res.json({ ok: true, data: { dayIndex: 0, activeDays: 0, offDays: [] } });
    }

    const [leaveRequests, holidays] = await Promise.all([
      LeaveRequest.find({ userId, status: 'approved', dates: { $elemMatch: { $gte: startStr, $lte: todayStr } } }).lean(),
      GymHoliday.find({ date: { $gte: startStr, $lte: todayStr } }).lean(),
    ]);

    const leaveDateSet = new Set<string>(
      (leaveRequests as any[]).flatMap(r => (r.dates as string[]).filter((d: string) => d >= startStr && d <= todayStr))
    );
    const holidaySet = new Set<string>((holidays as any[]).map(h => h.date as string));

    const offDays: string[] = [];
    let activeDays = 0;
    const cur = new Date(start);
    while (cur <= today) {
      const ds = cur.toISOString().slice(0, 10);
      if (leaveDateSet.has(ds) || holidaySet.has(ds)) {
        offDays.push(ds);
      } else {
        activeDays++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const dayIndex = plan.days.length > 0 ? Math.max(0, activeDays - 1) % plan.days.length : 0;
    return res.json({ ok: true, data: { dayIndex, activeDays, offDays } });
  } catch (err) {
    console.error('[Workouts] active-day error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to compute active day' } });
  }
});

router.get('/:id', getWorkoutPlanById);

// Backward-compatible generate endpoint (alias of generate-cycle)
router.post('/generate', generateWorkoutCycle);

router.post('/generate-cycle', generateWorkoutCycle);

router.delete('/:id', deleteWorkoutPlan);

export default router;
