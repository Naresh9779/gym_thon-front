import { Router } from 'express';
import { planSchedulerService } from '../services/planSchedulerService';
import { connectDB } from '../config/db';
import User from '../models/User';
import Subscription from '../models/Subscription';
import ProgressLog from '../models/ProgressLog';
import GymSettings from '../models/GymSettings';

const router = Router();

function verifyCronRequest(req: any, res: any, next: any) {
  if (process.env.NODE_ENV !== 'production') return next();

  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return res.status(500).json({ ok: false, error: 'Server misconfiguration' });

  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers['authorization'] || '';
  const secret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.secret || req.headers['x-cron-secret']);

  if (secret !== expectedSecret) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
}

/**
 * POST /api/cron/subscription-update
 * Runs daily at 1 AM — auto-expires subscriptions past their endDate
 */
router.get('/subscription-update', verifyCronRequest, async (_req, res) => {
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
router.get('/workout-expiry', verifyCronRequest, async (_req, res) => {
  try {
    await connectDB();
    await planSchedulerService.triggerWorkoutExpiryMark();
    res.json({ ok: true, message: 'Workout expiry mark completed', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/cron/gym-left-update
 * Runs daily — auto-marks members as "left" if subscription expired 14+ days ago with no renewal
 */
router.get('/gym-left-update', verifyCronRequest, async (_req, res) => {
  try {
    await connectDB();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const expiredUserIds = await Subscription.distinct('userId', {
      status:  'expired',
      endDate: { $lt: cutoff },
    });
    const result = await User.updateMany(
      { _id: { $in: expiredUserIds }, gymStatus: { $ne: 'left' } },
      { $set: { gymStatus: 'left', leftAt: new Date(), leftReason: 'auto' } },
    );
    res.json({ ok: true, message: 'Gym-left update completed', updated: result.modifiedCount, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/cron/attendance-auto-markout
 * Runs every 30 minutes — auto marks out users who forgot to mark out
 * after autoMarkOutHours have elapsed since mark-in.
 */
router.get('/attendance-auto-markout', verifyCronRequest, async (_req, res) => {
  try {
    await connectDB();
    const settings = await (GymSettings as any).getOrCreate();
    if (!settings.attendanceEnabled) {
      return res.json({ ok: true, message: 'Attendance disabled, skipped', updated: 0 });
    }

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - (settings.autoMarkOutHours ?? 3));

    // Find logs where marked in but NOT marked out, and markedInAt is old enough
    const staleLogs = await ProgressLog.find({
      'attendance.markedInAt': { $lte: cutoff },
      'attendance.markedOutAt': { $exists: false },
      'attendance.status': 'present',
    });

    let updated = 0;
    for (const log of staleLogs) {
      if (!log.attendance?.markedInAt) continue;
      const autoOut = new Date(log.attendance.markedInAt.getTime() + (settings.autoMarkOutHours * 60 * 60 * 1000));
      log.attendance.markedOutAt = autoOut;
      log.attendance.autoMarkedOut = true;
      log.attendance.markedOutBy = 'auto';
      log.attendance.durationMinutes = settings.autoMarkOutHours * 60;
      await log.save();
      updated++;
    }

    return res.json({ ok: true, message: 'Attendance auto-markout completed', updated, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
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
