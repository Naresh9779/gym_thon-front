import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { checkInSchema, getMondayOf } from '../utils/schemas';
import { requireActiveSubscription } from '../middleware/subscription';
import User from '../models/User';
import Subscription, { ISubscriptionFeatures } from '../models/Subscription';
import WorkoutPlan from '../models/WorkoutPlan';
import DietPlan from '../models/DietPlan';
import PlanRequest from '../models/PlanRequest';

const router = Router();
router.use(authenticate, requireActiveSubscription);

const RENEW_WINDOW_DAYS = 7; // allow check-in when plan has ≤7 days left

/** Single truth source for whether a user can check in right now */
async function getPlanStatus(userId: string) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const renewCutoff = new Date(now);
  renewCutoff.setDate(renewCutoff.getDate() + RENEW_WINDOW_DAYS);

  const activeSub = await Subscription.findOne({
    userId,
    status:  { $in: ['active', 'trial'] },
    endDate: { $gt: now },
  }).lean();
  const features = (activeSub?.features ?? {}) as ISubscriptionFeatures;
  const canUseWorkout = features.aiWorkoutPlan !== false;
  const canUseDiet    = features.aiDietPlan    !== false;

  // Workout: active and NOT within renewal window
  const activeWorkout = await WorkoutPlan.findOne({
    userId,
    status: { $ne: 'cancelled' },
    endDate: { $gt: renewCutoff }, // more than 7 days left
  }).lean();

  // Workout: expiring within window (or expired)
  const expiringWorkout = await WorkoutPlan.findOne({
    userId,
    status: { $ne: 'cancelled' },
    endDate: { $gte: now, $lte: renewCutoff },
  }).lean();

  // Diet: plan for current week
  const thisMonday = getMondayOf(now);
  const nextMonday = new Date(thisMonday); nextMonday.setDate(thisMonday.getDate() + 7);
  const thisDietPlan = await DietPlan.findOne({ userId, weekStartDate: thisMonday }).lean();
  const nextDietPlan = await DietPlan.findOne({ userId, weekStartDate: nextMonday }).lean();

  // Days until Sunday of current week (0 = Sun, so days left = 7 - getDay() or 0 if Sun)
  const todayDow = new Date().getDay();
  const daysLeftInWeek = todayDow === 0 ? 0 : 7 - todayDow;
  const isWeekEnd = daysLeftInWeek <= 2; // Fri/Sat/Sun → prepare next week

  // Pending request
  const pendingRequest = await PlanRequest.findOne({ userId, status: 'pending' })
    .sort({ requestedAt: -1 }).lean();

  // Generated but user hasn't seen the notification yet
  const readyRequest = await PlanRequest.findOne({ userId, status: 'generated', userNotifiedAt: { $exists: false } })
    .sort({ generatedAt: -1 }).lean();

  // Workout plan days left
  const workoutDaysLeft = expiringWorkout
    ? Math.ceil((new Date((expiringWorkout as any).endDate).getTime() - Date.now()) / 86400000)
    : activeWorkout
    ? Math.ceil((new Date((activeWorkout as any).endDate).getTime() - Date.now()) / 86400000)
    : null;

  const hasNoWorkout = !activeWorkout && !expiringWorkout;
  // Gate by feature flags: if aiWorkoutPlan is disabled the user cannot request workout plans
  const workoutNeedsRenewal = canUseWorkout && (hasNoWorkout || !!expiringWorkout);

  // Diet needs renewal: no plan this week, OR we're at week end and no plan for next week
  // Gate by feature flags: if aiDietPlan is disabled the user cannot request diet plans
  const dietNeedsRenewal = canUseDiet && (!thisDietPlan || (isWeekEnd && !nextDietPlan));

  const canCheckIn = workoutNeedsRenewal || dietNeedsRenewal;

  return {
    canCheckIn,
    workoutNeedsRenewal,
    dietNeedsRenewal,
    features: { aiWorkoutPlan: canUseWorkout, aiDietPlan: canUseDiet },
    workoutDaysLeft,
    workoutEndDate: expiringWorkout ? (expiringWorkout as any).endDate : activeWorkout ? (activeWorkout as any).endDate : null,
    thisDietPlanExists: !!thisDietPlan,
    nextDietPlanExists: !!nextDietPlan,
    isWeekEnd,
    pendingRequest: pendingRequest || null,
    readyRequest: readyRequest || null,
    // Which week to generate diet for
    targetDietWeek: (!thisDietPlan || !isWeekEnd) ? thisMonday : nextMonday,
  };
}

// GET /api/plans/status - single truth source for check-in availability
router.get('/status', async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    const status = await getPlanStatus(userId);
    return res.json({ ok: true, data: status });
  } catch (err) {
    console.error('[Plans] status error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch plan status' } });
  }
});

// POST /api/plans/request - user submits check-in to trainer
router.post('/request', async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    // Guard: block if plans are still fully active
    const status = await getPlanStatus(userId);
    if (!status.canCheckIn) {
      return res.status(409).json({
        ok: false,
        error: {
          code: 'PLANS_STILL_ACTIVE',
          message: `Your plans are still active. Check-in available when your workout plan has ≤${RENEW_WINDOW_DAYS} days remaining.`,
          daysLeft: status.workoutDaysLeft,
        },
      });
    }

    const schema = z.object({
      checkIn: checkInSchema,
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid data', details: parsed.error.errors } });
    }

    const { checkIn } = parsed.data;

    // Auto-determine planTypes
    const planTypes: string[] = [];
    if (status.workoutNeedsRenewal) planTypes.push('workout');
    if (status.dietNeedsRenewal) planTypes.push('diet');

    // Update user profile weight if provided
    if (checkIn.currentWeight) {
      await User.findByIdAndUpdate(userId, { 'profile.weight': checkIn.currentWeight });
    }

    // If pending request exists, update it; otherwise create new
    const existing = await PlanRequest.findOne({ userId, status: 'pending' });
    let request;
    if (existing) {
      request = await PlanRequest.findByIdAndUpdate(
        existing._id,
        { checkIn, planTypes, requestedAt: new Date() },
        { new: true }
      );
    } else {
      request = await PlanRequest.create({ userId, checkIn, planTypes });
    }

    return res.status(201).json({ ok: true, data: { request, message: 'Check-in submitted to your trainer!' } });
  } catch (err) {
    console.error('[Plans] request error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to submit request' } });
  }
});

// POST /api/plans/mark-notified - user dismisses the "plan is ready" banner
router.post('/mark-notified', async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    await PlanRequest.updateMany(
      { userId, status: 'generated', userNotifiedAt: { $exists: false } },
      { userNotifiedAt: new Date() }
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to mark notification' } });
  }
});

// GET /api/plans/my-requests - user views their own requests
router.get('/my-requests', async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    const requests = await PlanRequest.find({ userId }).sort({ requestedAt: -1 }).limit(5).lean();
    return res.json({ ok: true, data: { requests } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch requests' } });
  }
});

export default router;
