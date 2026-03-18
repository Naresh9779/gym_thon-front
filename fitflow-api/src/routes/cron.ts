import { Router } from 'express';
import { planSchedulerService } from '../services/planSchedulerService';
import { connectDB } from '../config/db';

const router = Router();

function verifyCronRequest(req: any, res: any, next: any) {
  const secret = req.query.secret || req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV !== 'production') return next();

  if (!expectedSecret) {
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }
  if (secret !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

/**
 * POST /api/cron/subscription-update
 * Runs daily at 1 AM — auto-expires subscriptions past their endDate
 */
router.post('/subscription-update', verifyCronRequest, async (_req, res) => {
  try {
    await connectDB();
    await planSchedulerService.triggerSubscriptionUpdate();
    res.json({ ok: true, message: 'Subscription update completed', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/cron/workout-expiry
 * Runs daily at 2 AM — marks expired workout plans as completed (housekeeping)
 */
router.post('/workout-expiry', verifyCronRequest, async (_req, res) => {
  try {
    await connectDB();
    await planSchedulerService.triggerWorkoutExpiryMark();
    res.json({ ok: true, message: 'Workout expiry mark completed', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/cron/health
 */
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    message: 'Cron endpoints healthy',
    endpoints: [
      'POST /api/cron/subscription-update',
      'POST /api/cron/workout-expiry',
    ],
  });
});

export default router;
