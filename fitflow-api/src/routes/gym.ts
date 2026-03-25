import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import GymHoliday from '../models/GymHoliday';
import Announcement from '../models/Announcement';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Subscription from '../models/Subscription';

const router = Router();
router.use(authenticate);

router.get('/today', async (_req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const now = new Date();

    const [holiday, announcements] = await Promise.all([
      GymHoliday.findOne({ date: todayStr }).lean(),
      Announcement.find({ startsAt: { $lte: now }, expiresAt: { $gte: now } }).sort({ startsAt: -1 }).lean(),
    ]);

    res.json({
      ok: true,
      data: {
        isHoliday: !!holiday,
        holiday: holiday ? { reason: (holiday as any).reason } : undefined,
        announcements,
      },
    });
  } catch (err) {
    console.error('[Gym] today error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch gym info' } });
  }
});

// GET /api/gym/subscription — user's current subscription details + available upgrade plans
router.get('/subscription', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const [activeSub, lastSub, allPlans] = await Promise.all([
      Subscription.findOne({ userId, status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() } }).lean(),
      Subscription.findOne({ userId }).sort({ endDate: -1 }).lean(),
      SubscriptionPlan.find({ isActive: true }).lean(),
    ]);

    const currentPlanId    = activeSub?.planId?.toString();
    const currentPlanPrice = activeSub?.price ?? 0;

    const upgradePlans = allPlans
      .filter((p: any) => p._id.toString() !== currentPlanId && p.planType !== 'trial' && p.price > currentPlanPrice)
      .map((p: any) => ({
        _id:            p._id,
        name:           p.name,
        price:          p.price,
        color:          p.color,
        features:       p.features,
        durationMonths: Math.round(p.durationDays / 30),
        planType:       p.planType,
      }));

    // lastSubscription is only populated when there's no active sub (for display purposes)
    const lastSubscription = activeSub ? null : (lastSub ?? null);

    res.json({ ok: true, data: { subscription: activeSub ?? null, lastSubscription, upgradePlans } });
  } catch (err) {
    console.error('[Gym] subscription error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch subscription' } });
  }
});

export default router;
