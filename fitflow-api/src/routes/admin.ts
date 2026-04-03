import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin } from '../middleware/auth';
import { planGenerationLimiter, aiOperationLimiter } from '../middleware/rateLimiter';
import User from '../models/User';
import WorkoutPlan from '../models/WorkoutPlan';
import DietPlan from '../models/DietPlan';
import ProgressLog from '../models/ProgressLog';
import MonthlyWorkoutReport from '../models/MonthlyWorkoutReport';
import MonthlyDietReport from '../models/MonthlyDietReport';
import { workoutGenerationService } from '../services/workoutGenerationService';
import { dietGenerationService } from '../services/dietGenerationService';
import { planSchedulerService } from '../services/planSchedulerService';
import { hashPassword } from '../utils/auth';
import { z } from 'zod';
import { checkInSchema, getLastMonthDate } from '../utils/schemas';
import GymHoliday from '../models/GymHoliday';
import Announcement from '../models/Announcement';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Payment from '../models/Payment';
import Subscription from '../models/Subscription';
import GymSettings from '../models/GymSettings';
import PlanRequest from '../models/PlanRequest';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/users - list users with server-side pagination, search and filters
router.get('/users', async (req, res) => {
  try {
    const {
      page = '1', limit = '20', search = '',
      tab = 'all', planName = '',
    } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // Compute tab counts (without search/planName for accurate badges)
    const baseFilter: Record<string, any> = { role: { $ne: 'admin' } };
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const soon = new Date(now); soon.setDate(now.getDate() + 7);
    const [activeSubIds, expiredSubIds, expiringSubIds, pendingPaymentUserIds] = await Promise.all([
      Subscription.distinct('_id', { status: { $in: ['active', 'trial'] }, endDate: { $gt: now } }),
      Subscription.distinct('_id', { status: 'expired' }),
      Subscription.distinct('_id', { status: { $in: ['active', 'trial'] }, endDate: { $gte: now, $lte: soon } }),
      Payment.distinct('userId', { paymentStatus: 'pending' }),
    ]);

    // Build base filter (exclude admins)
    const buildFilter = async (t: string): Promise<Record<string, any>> => {
      const f: Record<string, any> = { role: { $ne: 'admin' } };
      if (search.trim()) {
        f.$or = [
          { name:  { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
        ];
      }
      if (planName && planName !== 'all') {
        const planSubIds = await Subscription.distinct('_id', { planName, status: { $in: ['active', 'trial', 'expired'] } });
        f.activeSubscriptionId = { $in: planSubIds };
      }
      switch (t) {
        case 'active':          f.activeSubscriptionId = { $in: activeSubIds };          break;
        case 'expired':         f.activeSubscriptionId = { $in: expiredSubIds };         break;
        case 'expiring':        f.activeSubscriptionId = { $in: expiringSubIds };        break;
        case 'left_gym':        f.gymStatus = 'left';                                    break;
        case 'pending_payment': f._id = { $in: pendingPaymentUserIds };                  break;
      }
      return f;
    };

    const filter = await buildFilter(tab);

    const [all, active, expired, expiring, leftGym, pendingPayment] = await Promise.all([
      User.countDocuments(baseFilter),
      User.countDocuments({ ...baseFilter, activeSubscriptionId: { $in: activeSubIds } }),
      User.countDocuments({ ...baseFilter, activeSubscriptionId: { $in: expiredSubIds } }),
      User.countDocuments({ ...baseFilter, activeSubscriptionId: { $in: expiringSubIds } }),
      User.countDocuments({ ...baseFilter, gymStatus: 'left' }),
      User.countDocuments({ ...baseFilter, _id: { $in: pendingPaymentUserIds } }),
    ]);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role createdAt profile gymStatus leftAt activeSubscriptionId')
        .populate('activeSubscriptionId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    const usersWithSub = users.map((u: any) => ({ ...u, subscription: u.activeSubscriptionId, activeSubscriptionId: undefined }));

    res.json({
      ok: true,
      data: {
        users: usersWithSub,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        counts: { all, active, expired, expiring, left_gym: leftGym, pending_payment: pendingPayment },
      },
    });
  } catch (err) {
    console.error('[Admin] Error listing users', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to list users' } });
  }
});

// GET /api/admin/users/plan-names — distinct subscription plan names (for filter dropdown)
router.get('/users/plan-names', async (_req, res) => {
  try {
    const names = await Subscription.distinct('planName', { planName: { $exists: true, $ne: '' } });
    res.json({ ok: true, data: { planNames: names.filter(Boolean).sort() } });
  } catch (err) {
    console.error('[Admin] plan-names error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch plan names' } });
  }
});

// GET /api/admin/users/expiring?days=7 - list users whose subscription expires within N days
router.get('/users/expiring', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(String(req.query.days || '7')));
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const expiringSubIds = await Subscription.distinct('_id', {
      endDate: { $gte: now, $lte: cutoff },
      status:  { $in: ['active', 'trial'] },
    });
    const users = await User.find({ role: { $ne: 'admin' }, activeSubscriptionId: { $in: expiringSubIds } })
      .select('name email createdAt activeSubscriptionId')
      .populate('activeSubscriptionId')
      .lean();
    const mapped = (users as any[]).map(u => ({ ...u, subscription: u.activeSubscriptionId, activeSubscriptionId: undefined }));

    return res.json({ ok: true, data: { users: mapped, count: mapped.length } });
  } catch (err) {
    console.error('[Admin] expiring users error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch expiring users' } });
  }
});

// GET /api/admin/users/inactive?days=7 - list active users with no progress log in last N days
router.get('/users/inactive', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(String(req.query.days || '7')));
    const since = new Date();
    since.setDate(since.getDate() - days);

    // All users with active subscriptions
    const activeSubIds = await Subscription.distinct('_id', { status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() } });
    const activeUsers = await User.find({ role: 'user', activeSubscriptionId: { $in: activeSubIds } })
      .select('name email createdAt activeSubscriptionId')
      .populate('activeSubscriptionId')
      .lean();

    // Users who have logged any progress in last N days
    const recentlyActiveIds = await ProgressLog.distinct('userId', { date: { $gte: since } });
    const recentSet = new Set(recentlyActiveIds.map((id: any) => id.toString()));

    // Inactive = active subscription + no recent progress
    const inactive = activeUsers.filter(u => !recentSet.has((u._id as any).toString()));

    return res.json({ ok: true, data: { users: inactive, count: inactive.length } });
  } catch (err) {
    console.error('[Admin] inactive users error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch inactive users' } });
  }
});

// PATCH /api/admin/users/:userId/profile - update a user's profile fields
router.patch('/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };

    const schema = z.object({
      age: z.number().min(0).max(120).optional(),
      weight: z.number().min(0).max(1000).optional(),
      height: z.number().min(0).max(300).optional(),
      bodyFat: z.number().min(0).max(100).optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
      goals: z.array(z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance'])).optional(),
      experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      preferences: z.array(z.string()).optional(),
      restrictions: z.array(z.string()).optional(),
      timezone: z.string().optional(),
      dietPreferences: z.object({
        isVegetarian: z.boolean().optional(),
        dietType: z.enum(['balanced', 'high_protein', 'low_carb', 'mediterranean']).optional(),
        weeklyBudget: z.number().min(0).optional(),
      }).optional(),
    });

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid profile data', details: parsed.error.errors } });
    }

    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    // Build $set payload with only provided keys
    const update: Record<string, any> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (typeof value !== 'undefined') {
        update[`profile.${key}`] = value;
      }
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select('name email role profile');
    return res.json({ ok: true, data: { user: updated } });
  } catch (err) {
    console.error('[Admin] update user profile error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to update user profile' } });
  }
});

router.patch('/users/:userId/subscription', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };

    const schema = z.object({
      status:         z.enum(['active', 'inactive', 'trial', 'expired']).optional(),
      extendByMonths: z.number().min(-120).max(120).optional(),
      extendByDays:   z.number().min(-3650).max(3650).optional(),
      setEndDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    });

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid subscription data', details: parsed.error.errors } });
    }

    const user = await User.findById(userId).select('activeSubscriptionId');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    const sub = await Subscription.findById(user.activeSubscriptionId);
    if (!sub) return res.status(404).json({ ok: false, error: { message: 'No subscription found for this user' } });

    // Block manual status changes if subscription has a received payment
    if (parsed.data.status) {
      const hasReceivedPayment = await Payment.exists({ subscriptionId: sub._id, paymentStatus: 'received' });
      if (hasReceivedPayment && sub.status === 'active') {
        return res.status(409).json({
          ok: false,
          error: { message: 'Cannot manually change status — subscription has a received payment. It will auto-expire on the end date.' },
        });
      }
    }

    const now = new Date();

    if (parsed.data.setEndDate) {
      const newEnd = new Date(parsed.data.setEndDate);
      sub.endDate = newEnd;
      if (newEnd > now && sub.status === 'expired') sub.status = 'active';
    } else if (parsed.data.extendByMonths !== undefined || parsed.data.extendByDays !== undefined) {
      const currentEnd = new Date(sub.endDate);
      if (parsed.data.extendByMonths) currentEnd.setMonth(currentEnd.getMonth() + parsed.data.extendByMonths);
      if (parsed.data.extendByDays)   currentEnd.setDate(currentEnd.getDate() + parsed.data.extendByDays);
      sub.endDate = currentEnd;
      if (currentEnd > now && sub.status === 'expired') sub.status = 'active';
    }

    if (parsed.data.status) sub.status = parsed.data.status as any;

    await sub.save();
    return res.json({ ok: true, data: { subscription: sub } });
  } catch (err) {
    console.error('[Admin] update subscription error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to update subscription' } });
  }
});

// POST /api/admin/users - create a new user (role=user)
// Accepts either planId (preferred) or subscriptionDurationMonths (legacy fallback)
router.post('/users', async (req: any, res: any) => {
  try {
    const schema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      mobile: z.string().optional(),
      paymentReceived: z.boolean().optional(),
      planId: z.string().optional(),
      subscriptionDurationMonths: z.number().min(1).max(60).optional(),
      profile: z.object({
        age: z.number({ required_error: 'Age is required' }).min(10, 'Age must be at least 10').max(100, 'Age must be under 100'),
        weight: z.number({ required_error: 'Weight is required' }).min(20, 'Weight must be at least 20 kg').max(300),
        height: z.number({ required_error: 'Height is required' }).min(100, 'Height must be at least 100 cm').max(250),
        gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
        activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active'], { required_error: 'Activity level is required' }),
        goals: z.array(z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance'])).min(1, 'At least one goal is required'),
        experienceLevel: z.enum(['beginner', 'intermediate', 'advanced'], { required_error: 'Experience level is required' }),
        dietPreferences: z.object({
          isVegetarian: z.boolean(),
          dietType: z.enum(['balanced', 'high_protein', 'low_carb', 'mediterranean'], { required_error: 'Diet type is required' }),
          weeklyBudget: z.number().min(0).optional(),
        }),
      }),
    }).refine(d => d.planId || d.subscriptionDurationMonths, {
      message: 'Either planId or subscriptionDurationMonths is required',
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const field = first.path.join('.');
      const msg = first.message;
      return res.status(400).json({ ok: false, error: { message: `${field ? field + ': ' : ''}${msg}`, details: parsed.error.errors } });
    }
    const { name, email, password, mobile, paymentReceived = true, planId, subscriptionDurationMonths, profile } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ ok: false, error: { message: 'Email already registered' } });

    const passwordHash = await hashPassword(password);
    const startDate = new Date();
    const endDate = new Date();

    let subPlan: any = null;
    if (planId) {
      subPlan = await SubscriptionPlan.findById(planId).lean();
      if (!subPlan || !subPlan.isActive) return res.status(400).json({ ok: false, error: { message: 'Subscription plan not found or inactive' } });
      endDate.setDate(endDate.getDate() + subPlan.durationDays);
    } else {
      endDate.setMonth(endDate.getMonth() + subscriptionDurationMonths!);
    }

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
      ...(mobile ? { mobile } : {}),
      profile: {
        age:             profile.age,
        weight:          profile.weight,
        height:          profile.height,
        gender:          profile.gender,
        activityLevel:   profile.activityLevel,
        goals:           profile.goals,
        experienceLevel: profile.experienceLevel,
        dietPreferences: profile.dietPreferences,
      },
    });

    // Create Subscription document
    const sub = await Subscription.create({
      userId:         user._id,
      planId:         subPlan ? subPlan._id : undefined,
      planName:       subPlan ? subPlan.name : 'Manual',
      price:          subPlan ? (subPlan as any).price : 0,
      features:       subPlan ? (subPlan as any).features : { aiWorkoutPlan: false, aiDietPlan: false, leaveRequests: true, progressTracking: true },
      status:         'active',
      startDate,
      endDate,
      durationMonths: subPlan ? Math.round((subPlan as any).durationDays / 30) : (subscriptionDurationMonths ?? 1),
      assignedBy:     req.user?.userId,
    });

    await User.findByIdAndUpdate(user._id, { activeSubscriptionId: sub._id });

    // Record a payment linked to this subscription
    let payment = null;
    if (subPlan) {
      payment = await Payment.create({
        userId:         user._id,
        planId:         subPlan._id,
        subscriptionId: sub._id,
        planSnapshot:   { name: (subPlan as any).name, price: (subPlan as any).price, durationDays: (subPlan as any).durationDays },
        amount:         (subPlan as any).price,
        method:         'cash',
        paymentStatus:  paymentReceived ? 'received' : 'pending',
        recordedBy:     req.user?.userId,
      });
      // Link payment back to subscription
      await Subscription.findByIdAndUpdate(sub._id, { paymentId: payment._id });
    }

    // Auto-create plan request if plan includes AI workout or AI diet
    if (subPlan && ((subPlan as any).features?.aiWorkoutPlan || (subPlan as any).features?.aiDietPlan)) {
      const planTypes: Array<'workout' | 'diet'> = [];
      if ((subPlan as any).features.aiWorkoutPlan) planTypes.push('workout');
      if ((subPlan as any).features.aiDietPlan)    planTypes.push('diet');
      await PlanRequest.create({
        userId:      user._id,
        checkIn:     { currentWeight: profile.weight },
        planTypes,
        status:      'pending',
        requestedAt: new Date(),
      });
    }

    return res.status(201).json({ ok: true, data: { user: { id: user._id, name: user.name, email: user.email, role: user.role, subscription: sub } } });
  } catch (err) {
    console.error('[Admin] Create user error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to create user' } });
  }
});

// GET /api/admin/users/:userId - fetch single user details
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const user = await User.findById(userId)
      .select('name email role createdAt profile gymStatus leftAt leftReason assignedTrainerId activeSubscriptionId')
      .populate('activeSubscriptionId')
      .lean();
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    if (user) (user as any).subscription = (user as any).activeSubscriptionId;
    res.json({ ok: true, data: { user } });
  } catch (err) {
    console.error('[Admin] get user error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch user' } });
  }
});

// GET /api/admin/users/:userId/subscriptions — full subscription history
router.get('/users/:userId/subscriptions', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const subscriptions = await Subscription.find({ userId })
      .sort({ startDate: -1 })
      .populate('planId', 'name color price')
      .populate('assignedBy', 'name email')
      .populate('paymentId', 'paymentStatus amount method paidAt')
      .lean();
    res.json({ ok: true, data: { subscriptions } });
  } catch (err) {
    console.error('[Admin] subscription history error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch subscription history' } });
  }
});

// GET /api/admin/users/:userId/notes - get trainer notes for a user
router.get('/users/:userId/notes', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const user = await User.findById(userId).select('trainerNotes').lean();
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    return res.json({ ok: true, data: { notes: (user as any).trainerNotes || [] } });
  } catch (err) {
    console.error('[Admin] get notes error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch notes' } });
  }
});

// POST /api/admin/users/:userId/notes - add trainer note
router.post('/users/:userId/notes', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const schema = z.object({ text: z.string().min(1).max(1000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: { message: 'Invalid note' } });

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { trainerNotes: { text: parsed.data.text, createdAt: new Date() } } },
      { new: true }
    ).select('trainerNotes');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    return res.status(201).json({ ok: true, data: { notes: (user as any).trainerNotes } });
  } catch (err) {
    console.error('[Admin] add note error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to add note' } });
  }
});

// DELETE /api/admin/users/:userId/notes/:noteId - delete trainer note
router.delete('/users/:userId/notes/:noteId', async (req, res) => {
  try {
    const { userId, noteId } = req.params as { userId: string; noteId: string };
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { trainerNotes: { _id: noteId } } },
      { new: true }
    ).select('trainerNotes');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    return res.json({ ok: true, data: { notes: (user as any).trainerNotes } });
  } catch (err) {
    console.error('[Admin] delete note error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to delete note' } });
  }
});

// GET /api/admin/metrics - basic counts for dashboard
router.get('/metrics', async (_req, res) => {
  try {
    const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0, 0, 0, 0);

    const nonAdminUserIds = await User.distinct('_id', { role: { $ne: 'admin' } });

    const [
      usersCount, workoutPlansCount, activeWorkoutPlans, dietPlansCount,
      activeSubscriptions,
      revenueAgg, pendingAgg, pendingCount,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      WorkoutPlan.countDocuments(),
      WorkoutPlan.countDocuments({ status: 'active' }),
      DietPlan.countDocuments(),
      Subscription.countDocuments({ status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() }, userId: { $in: nonAdminUserIds } }),
      Payment.aggregate([{ $match: { paymentStatus: 'received', paidAt: { $gte: thisMonthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { paymentStatus: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.countDocuments({ paymentStatus: 'pending' }),
    ]);

    res.json({ ok: true, data: {
      usersCount, workoutPlansCount, activeWorkoutPlans, dietPlansCount,
      activeSubscriptions,
      revenueThisMonth: revenueAgg[0]?.total || 0,
      pendingAmount:    pendingAgg[0]?.total || 0,
      pendingCount,
    }});
  } catch (err) {
    console.error('[Admin] Error metrics', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch metrics' } });
  }
});

// POST /api/admin/users/:userId/generate-workout-cycle - generate workout plan for a user
// Rate limited to prevent spam and excessive API usage
router.post('/users/:userId/generate-workout-cycle', planGenerationLimiter, aiOperationLimiter, async (req, res) => {
  try {
    const schema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      durationWeeks: z.number().min(1).max(16).default(4),
      daysPerWeek: z.number().min(3).max(6).optional(),
      exercisesPerDay: z.number().min(3).max(10).optional(),
      goal: z.string().optional(),
      experience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      preferences: z.string().optional(),
      checkIn: checkInSchema.optional(),
      adminNote: z.string().max(1000).optional(),       // reason for override
      additionalContext: z.string().max(1000).optional(), // extra AI instructions
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { startDate, durationWeeks, daysPerWeek, exercisesPerDay, goal, experience, checkIn, adminNote, additionalContext } = parsed.data;
    const preferences = parsed.data.preferences;
    // Build additionalInstructions: combine adminNote + additionalContext into one prominent AI section
    const instructionParts = [
      adminNote ? `Reason for override: ${adminNote}` : null,
      additionalContext || null,
    ].filter(Boolean);
    const additionalInstructions = instructionParts.length ? instructionParts.join('\n') : undefined;

    // Validate user exists and check subscription
    const [user, activeSub] = await Promise.all([
      User.findById(userId).select('_id').lean(),
      Subscription.findOne({ userId, status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() } }).select('features').lean(),
    ]);
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    if (!activeSub) return res.status(403).json({ ok: false, error: { message: 'Cannot generate workout plan for user with expired subscription', code: 'USER_SUBSCRIPTION_EXPIRED' } });
    if (!activeSub.features?.aiWorkoutPlan) {
      return res.status(403).json({ ok: false, error: { message: 'User\'s subscription plan does not include AI Workout Plan generation.', code: 'FEATURE_NOT_INCLUDED' } });
    }

    // Check overlap
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + durationWeeks * 7 - 1);

    const overlap = await WorkoutPlan.findOne({
      userId,
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });

    if (overlap) {
      return res.status(409).json({ ok: false, error: { message: 'Workout plan overlaps existing cycle', existingPlanId: overlap._id } });
    }

    // Fetch last month's workout report for progressive planning
    const { year: lastMonthYear, month: lastMonthMonth } = getLastMonthDate();
    const lastMonthReport = await MonthlyWorkoutReport.findOne({
      userId,
      year: lastMonthYear,
      month: lastMonthMonth,
    }).lean();

    const plan = await workoutGenerationService.generateWorkoutCycle(
      userId,
      start,
      durationWeeks,
      daysPerWeek,
      goal,
      experience,
      preferences,
      checkIn,
      lastMonthReport ? {
        completedWorkouts: lastMonthReport.completedWorkouts ?? 0,
        totalWorkouts: lastMonthReport.totalWorkouts ?? 0,
        adherenceScore: lastMonthReport.adherenceScore ?? 0,
        avgDuration: lastMonthReport.avgDuration ?? 0,
      } : undefined,
      exercisesPerDay,
      additionalInstructions
    );
    return res.status(201).json({ ok: true, data: { workoutPlan: plan, message: 'Workout cycle generated successfully' } });
  } catch (err: any) {
    console.error('[Admin] generate-workout-cycle error', err);
    if (err.message?.includes('User profile incomplete')) {
      return res.status(400).json({ ok: false, error: { message: err.message, code: 'INCOMPLETE_PROFILE' } });
    }
    return res.status(500).json({ ok: false, error: { message: 'Failed to generate workout cycle' } });
  }
});

// POST /api/admin/users/:userId/generate-diet - generate diet plan for a specific date
router.post('/users/:userId/generate-diet', async (req, res) => {
  try {
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
      previousDayProgressId: z.string().optional(),
      goalOverride: z.string().optional(),
      dietType: z.enum(['balanced', 'high_protein', 'low_carb', 'mediterranean']).optional(),
      isVegetarian: z.boolean().optional(),
      budget: z.number().min(0).optional(),
      additionalPreferences: z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { date, previousDayProgressId, goalOverride, dietType, isVegetarian, budget, additionalPreferences } = parsed.data;
    const overrides = (goalOverride || dietType || isVegetarian || budget || additionalPreferences)
      ? { goalOverride, dietType, isVegetarian, budget, additionalPreferences }
      : undefined;
    const targetDate = new Date(date);

    // Validate user exists and check subscription
    const [user, activeSub] = await Promise.all([
      User.findById(userId).select('_id').lean(),
      Subscription.findOne({ userId, status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() } }).select('features').lean(),
    ]);
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    if (!activeSub) return res.status(403).json({ ok: false, error: { message: 'Cannot generate diet plan for user with expired subscription', code: 'USER_SUBSCRIPTION_EXPIRED' } });
    if (!activeSub.features?.aiDietPlan) {
      return res.status(403).json({ ok: false, error: { message: 'User\'s subscription plan does not include AI Diet Plan generation.', code: 'FEATURE_NOT_INCLUDED' } });
    }

    // Check if plan exists
    const existingPlan = await DietPlan.findOne({ userId, date: targetDate });
    if (existingPlan) {
      return res.status(409).json({ ok: false, error: { message: 'Diet plan already exists for this date', existingPlanId: existingPlan._id } });
    }

  const generatedPlan = await dietGenerationService.generateDietPlan(userId, targetDate, previousDayProgressId, overrides);
  const savedPlan = await dietGenerationService.saveDietPlan(userId, targetDate, generatedPlan, 'ai', previousDayProgressId);

    return res.status(201).json({ ok: true, data: { dietPlan: savedPlan, message: 'Diet plan generated successfully' } });
  } catch (err: any) {
    console.error('[Admin] generate-diet error', err);
    if (err.message?.includes('User profile incomplete')) {
      return res.status(400).json({ ok: false, error: { message: err.message, code: 'INCOMPLETE_PROFILE' } });
    }
    return res.status(500).json({ ok: false, error: { message: 'Failed to generate diet plan' } });
  }
});

// POST /api/admin/users/:userId/generate-diet-daily - generate diet for today if not exists
// Rate limited to prevent spam and excessive API usage
router.post('/users/:userId/generate-diet-daily', planGenerationLimiter, aiOperationLimiter, async (req, res) => {
  try {
    const schema = z.object({
      previousDayProgressId: z.string().optional(),
      goalOverride: z.string().optional(),
      dietType: z.enum(['balanced', 'high_protein', 'low_carb', 'mediterranean']).optional(),
      isVegetarian: z.boolean().optional(),
      budget: z.number().min(0).optional(),
      additionalPreferences: z.string().max(500).optional(),
      checkIn: checkInSchema.optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { previousDayProgressId, goalOverride, dietType, isVegetarian, budget, additionalPreferences, checkIn } = parsed.data;
    const overrides = (goalOverride || dietType || isVegetarian || budget || additionalPreferences)
      ? { goalOverride, dietType, isVegetarian, budget, additionalPreferences }
      : undefined;

    // Validate user exists and check subscription
    const [user, activeSub] = await Promise.all([
      User.findById(userId).select('_id').lean(),
      Subscription.findOne({ userId, status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() } }).select('features').lean(),
    ]);
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    if (!activeSub) return res.status(403).json({ ok: false, error: { message: 'Cannot generate diet plan for user with expired subscription', code: 'USER_SUBSCRIPTION_EXPIRED' } });
    if (!activeSub.features?.aiDietPlan) {
      return res.status(403).json({ ok: false, error: { message: 'User\'s subscription plan does not include AI Diet Plan generation.', code: 'FEATURE_NOT_INCLUDED' } });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingPlan = await DietPlan.findOne({ userId, date: today });
    if (existingPlan) {
      return res.json({ ok: true, data: { dietPlan: existingPlan, message: 'Diet plan already exists for today', alreadyExists: true } });
    }

    // Fetch last month's diet report for progressive planning
    const { year: lastMonthYear, month: lastMonthMonth } = getLastMonthDate();
    const lastMonthDietReport = await MonthlyDietReport.findOne({
      userId,
      year: lastMonthYear,
      month: lastMonthMonth,
    }).lean();

  const generatedPlan = await dietGenerationService.generateDietPlan(
    userId, today, previousDayProgressId, overrides, checkIn,
    lastMonthDietReport ? {
      adherenceScore: lastMonthDietReport.adherenceScore ?? 0,
      avgDailyCalories: lastMonthDietReport.avgDailyCalories ?? 0,
      avgMacros: {
        protein: lastMonthDietReport.avgMacros?.protein ?? 0,
        carbs: lastMonthDietReport.avgMacros?.carbs ?? 0,
        fats: lastMonthDietReport.avgMacros?.fats ?? 0,
      },
      totalDaysLogged: lastMonthDietReport.totalDaysLogged ?? 0,
    } : undefined
  );
  const savedPlan = await dietGenerationService.saveDietPlan(userId, today, generatedPlan, 'auto-daily', previousDayProgressId);

    return res.status(201).json({ ok: true, data: { dietPlan: savedPlan, message: 'Daily diet plan generated successfully' } });
  } catch (err: any) {
    console.error('[Admin] generate-diet-daily error', err);
    if (err.message?.includes('User profile incomplete')) {
      return res.status(400).json({ ok: false, error: { message: err.message, code: 'INCOMPLETE_PROFILE' } });
    }
    return res.status(500).json({ ok: false, error: { message: 'Failed to generate daily diet plan' } });
  }
});

// POST /api/admin/users/:userId/generate-diet-weekly - generate weekly diet plan for a user
router.post('/users/:userId/generate-diet-weekly', planGenerationLimiter, aiOperationLimiter, async (req, res) => {
  try {
    const schema = z.object({
      goalOverride: z.string().optional(),
      dietType: z.enum(['balanced', 'high_protein', 'low_carb', 'mediterranean']).optional(),
      isVegetarian: z.boolean().optional(),
      budget: z.number().min(0).optional(),
      additionalPreferences: z.string().max(500).optional(),
      checkIn: checkInSchema.optional(),
      adminNote: z.string().max(1000).optional(),       // reason for override
      additionalContext: z.string().max(1000).optional(), // extra AI instructions
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { goalOverride, dietType, isVegetarian, budget, checkIn, adminNote, additionalContext } = parsed.data;
    const overrides = (goalOverride || dietType || isVegetarian !== undefined || budget)
      ? { goalOverride, dietType, isVegetarian, budget }
      : undefined;
    // Build additionalInstructions: combine adminNote + additionalContext into one prominent AI section
    const dietInstructionParts = [
      adminNote ? `Reason for override: ${adminNote}` : null,
      additionalContext || null,
    ].filter(Boolean);
    const dietAdditionalInstructions = dietInstructionParts.length ? dietInstructionParts.join('\n') : undefined;

    const [user, activeSub] = await Promise.all([
      User.findById(userId).select('_id').lean(),
      Subscription.findOne({ userId, status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() } }).select('features').lean(),
    ]);
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    if (!activeSub) return res.status(403).json({ ok: false, error: { message: 'Cannot generate diet plan for user with expired subscription', code: 'USER_SUBSCRIPTION_EXPIRED' } });
    if (!activeSub.features?.aiDietPlan) {
      return res.status(403).json({ ok: false, error: { message: 'User\'s subscription plan does not include AI Diet Plan generation.', code: 'FEATURE_NOT_INCLUDED' } });
    }

    // Compute Monday of the current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - daysToMonday);
    weekStartDate.setHours(0, 0, 0, 0);

    const existingPlan = await DietPlan.findOne({ userId, weekStartDate });
    if (existingPlan) {
      return res.json({ ok: true, data: { dietPlan: existingPlan, message: 'Weekly diet plan already exists for this week', alreadyExists: true } });
    }

    const { year: lastMonthYear, month: lastMonthMonth } = getLastMonthDate();
    const lastMonthDietReport = await MonthlyDietReport.findOne({
      userId,
      year: lastMonthYear,
      month: lastMonthMonth,
    }).lean();

    const generated = await dietGenerationService.generateWeeklyDietPlan(
      userId, weekStartDate, overrides, checkIn,
      lastMonthDietReport ? {
        adherenceScore: lastMonthDietReport.adherenceScore ?? 0,
        avgDailyCalories: lastMonthDietReport.avgDailyCalories ?? 0,
        avgMacros: {
          protein: lastMonthDietReport.avgMacros?.protein ?? 0,
          carbs: lastMonthDietReport.avgMacros?.carbs ?? 0,
          fats: lastMonthDietReport.avgMacros?.fats ?? 0,
        },
        totalDaysLogged: lastMonthDietReport.totalDaysLogged ?? 0,
      } : undefined,
      dietAdditionalInstructions
    );
    const savedPlan = await dietGenerationService.saveWeeklyDietPlan(userId, weekStartDate, generated, 'admin', checkIn);

    return res.status(201).json({ ok: true, data: { dietPlan: savedPlan, message: 'Weekly diet plan generated successfully' } });
  } catch (err: any) {
    console.error('[Admin] generate-diet-weekly error', err);
    if (err.message?.includes('User profile incomplete')) {
      return res.status(400).json({ ok: false, error: { message: err.message, code: 'INCOMPLETE_PROFILE' } });
    }
    return res.status(500).json({ ok: false, error: { message: 'Failed to generate weekly diet plan' } });
  }
});

// GET /api/admin/users/:userId/workouts - list workout plans for a specific user
router.get('/users/:userId/workouts', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const { page = '1', limit = '5' } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    const [workoutPlans, total] = await Promise.all([
      WorkoutPlan.find({ userId })
        .sort({ startDate: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      WorkoutPlan.countDocuments({ userId }),
    ]);

    return res.json({ ok: true, data: { workoutPlans, total, page: pageNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error('[Admin] list user workouts error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to list workout plans' } });
  }
});

// GET /api/admin/workouts/:planId - fetch a specific workout plan
router.get('/workouts/:planId', async (req, res) => {
  try {
    const { planId } = req.params as { planId: string };
    const plan = await WorkoutPlan.findById(planId).lean();
    if (!plan) return res.status(404).json({ ok: false, error: { message: 'Workout plan not found' } });
    return res.json({ ok: true, data: { workoutPlan: plan } });
  } catch (err) {
    console.error('[Admin] get workout plan error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch workout plan' } });
  }
});

// GET /api/admin/users/:userId/diet - list diet plans for a specific user
router.get('/users/:userId/diet', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const { page = '1', limit = '5' } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    const [dietPlans, total] = await Promise.all([
      DietPlan.find({ userId })
        .sort({ date: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      DietPlan.countDocuments({ userId }),
    ]);

    return res.json({ ok: true, data: { dietPlans, total, page: pageNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error('[Admin] list user diet error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to list diet plans' } });
  }
});

// GET /api/admin/diet/:planId - fetch a specific diet plan
router.get('/diet/:planId', async (req, res) => {
  try {
    const { planId } = req.params as { planId: string };
    const plan = await DietPlan.findById(planId).lean();
    if (!plan) return res.status(404).json({ ok: false, error: { message: 'Diet plan not found' } });
    return res.json({ ok: true, data: { dietPlan: plan } });
  } catch (err) {
    console.error('[Admin] get diet plan error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch diet plan' } });
  }
});

// PATCH /api/admin/workouts/:planId - update a workout plan (admin)
router.patch('/workouts/:planId', async (req, res) => {
  try {
    const { planId } = req.params as { planId: string };

    const schema = z.object({
      name: z.string().min(1).optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      durationWeeks: z.number().min(1).max(52).optional(),
      status: z.enum(['active', 'completed', 'cancelled']).optional(),
      days: z.any().optional(), // accept any valid days array; validated on client-side for now
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const update: any = {};
    if (parsed.data.name) update.name = parsed.data.name;
    if (parsed.data.startDate) {
      const start = new Date(parsed.data.startDate);
      update.startDate = start;
      if (parsed.data.durationWeeks) {
        const end = new Date(start);
        end.setDate(end.getDate() + parsed.data.durationWeeks * 7 - 1);
        update.endDate = end;
        update.duration = parsed.data.durationWeeks;
      }
    }
    if (parsed.data.durationWeeks && !parsed.data.startDate) {
      // update endDate relative to existing startDate if available
      const existing = await WorkoutPlan.findById(planId).select('startDate');
      if (!existing) return res.status(404).json({ ok: false, error: { message: 'Workout plan not found' } });
      const end = new Date(existing.startDate);
      end.setDate(end.getDate() + parsed.data.durationWeeks * 7 - 1);
      update.endDate = end;
      update.duration = parsed.data.durationWeeks;
    }
    if (parsed.data.status) update.status = parsed.data.status;
    if (parsed.data.days) update.days = parsed.data.days;

    const updated = await WorkoutPlan.findByIdAndUpdate(planId, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ ok: false, error: { message: 'Workout plan not found' } });

    return res.json({ ok: true, data: { workoutPlan: updated } });
  } catch (err) {
    console.error('[Admin] update workout plan error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to update workout plan' } });
  }
});

// PATCH /api/admin/diet/:planId - update a diet plan (admin)
router.patch('/diet/:planId', async (req, res) => {
  try {
    const { planId } = req.params as { planId: string };

    const schema = z.object({
      name: z.string().min(1).optional(),
      weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      avgDailyCalories: z.number().min(0).optional(),
      avgMacros: z
        .object({ protein: z.number().min(0), carbs: z.number().min(0), fats: z.number().min(0) })
        .partial()
        .optional(),
      days: z.any().optional(),
      notes: z.string().max(1000).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const update: any = { ...parsed.data };
    if (parsed.data.weekStartDate) update.weekStartDate = new Date(parsed.data.weekStartDate);

    const updated = await DietPlan.findByIdAndUpdate(planId, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ ok: false, error: { message: 'Diet plan not found' } });

    return res.json({ ok: true, data: { dietPlan: updated } });
  } catch (err) {
    console.error('[Admin] update diet plan error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to update diet plan' } });
  }
});

// DELETE /api/admin/workouts/:planId - delete a workout plan (admin)
router.delete('/workouts/:planId', async (req, res) => {
  try {
    const { planId } = req.params as { planId: string };
    const deleted = await WorkoutPlan.findByIdAndDelete(planId);
    if (!deleted) return res.status(404).json({ ok: false, error: { message: 'Workout plan not found' } });
    return res.json({ ok: true, data: { message: 'Workout plan deleted' } });
  } catch (err) {
    console.error('[Admin] delete workout plan error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to delete workout plan' } });
  }
});

// DELETE /api/admin/diet/:planId - delete a diet plan (admin)
router.delete('/diet/:planId', async (req, res) => {
  try {
    const { planId } = req.params as { planId: string };
    const deleted = await DietPlan.findByIdAndDelete(planId);
    if (!deleted) return res.status(404).json({ ok: false, error: { message: 'Diet plan not found' } });
    return res.json({ ok: true, data: { message: 'Diet plan deleted' } });
  } catch (err) {
    console.error('[Admin] delete diet plan error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to delete diet plan' } });
  }
});

// GET /api/admin/users/:userId/trends?days=30 - get user progress trends (admin)
router.get('/users/:userId/trends', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const days = parseInt(String(req.query.days || '30')) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const logs = await ProgressLog.find({ userId, date: { $gte: since } }).lean();

    const series: { date: string; workouts: number; meals: number; active: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayLog = logs.find(l => {
        const ld = new Date(l.date);
        ld.setHours(0, 0, 0, 0);
        return ld.toISOString().slice(0, 10) === dateKey;
      });
      const workouts = dayLog && dayLog.workout && (dayLog.workout.completedExercises || 0) > 0 ? 1 : 0;
      const meals = dayLog?.meals?.length || 0;
      const active = workouts > 0 || meals > 0 ? 1 : 0;
      series.push({ date: dateKey, workouts, meals, active });
    }

    return res.json({ ok: true, data: { series } });
  } catch (err) {
    console.error('[Admin] user trends error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch user trends' } });
  }
});

// GET /api/admin/scheduler/status - get scheduler status
router.get('/scheduler/status', async (_req, res) => {
  try {
    const status = planSchedulerService.getStatus();
    return res.json({ 
      ok: true, 
      data: status
    });
  } catch (err) {
    console.error('[Admin] scheduler status error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to get scheduler status' } });
  }
});

// GET /api/admin/users/:userId/reports/workout/monthly/:year/:month
router.get('/users/:userId/reports/workout/monthly/:year/:month', async (req, res) => {
  try {
    const { userId, year: y, month: m } = req.params as { userId: string; year: string; month: string };
    const year = parseInt(y); const month = parseInt(m);
    if (isNaN(year) || isNaN(month)) return res.status(400).json({ ok: false, error: { message: 'Invalid year/month' } });

    let report = await MonthlyWorkoutReport.findOne({ userId, year, month });
    if (!report) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      const workoutPlans = await WorkoutPlan.find({ userId, $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }] }).lean();
      const progressLogs = await ProgressLog.find({ userId, date: { $gte: startDate, $lte: endDate } }).lean();
      const completedWorkouts = progressLogs.filter(l => l.workout && (l.workout.completedExercises || 0) > 0).length;
      const totalDuration = progressLogs.reduce((s, l) => s + (l.workout?.durationSec || 0), 0);
      const avgDuration = completedWorkouts > 0 ? Math.round(totalDuration / completedWorkouts) : 0;
      let expectedWorkouts = 0;
      if (workoutPlans.length > 0) {
        const weeksInMonth = new Date(year, month, 0).getDate() / 7;
        const workoutDays = workoutPlans[0].days?.filter((d: any) => !d.isRestDay).length || 0;
        expectedWorkouts = Math.round(workoutDays * weeksInMonth);
      }
      const adherenceScore = expectedWorkouts > 0 ? Math.min(100, Math.round((completedWorkouts / expectedWorkouts) * 100)) : 0;
      report = new MonthlyWorkoutReport({ userId, year, month, workoutPlanId: workoutPlans[0]?._id, completedWorkouts, totalWorkouts: expectedWorkouts || 0, adherenceScore, avgDuration, generatedAt: new Date() });
      await report.save();
    }
    return res.json({ ok: true, data: { report } });
  } catch (err) {
    console.error('[Admin] user workout report error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch workout report' } });
  }
});

// GET /api/admin/users/:userId/reports/diet/monthly/:year/:month
router.get('/users/:userId/reports/diet/monthly/:year/:month', async (req, res) => {
  try {
    const { userId, year: y, month: m } = req.params as { userId: string; year: string; month: string };
    const year = parseInt(y); const month = parseInt(m);
    if (isNaN(year) || isNaN(month)) return res.status(400).json({ ok: false, error: { message: 'Invalid year/month' } });

    let report = await MonthlyDietReport.findOne({ userId, year, month });
    if (!report) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      const dietPlans = await DietPlan.find({ userId, date: { $gte: startDate, $lte: endDate } }).lean();
      const progressLogs = await ProgressLog.find({ userId, date: { $gte: startDate, $lte: endDate } }).lean();
      const totalDaysLogged = progressLogs.filter(l => l.meals && l.meals.length > 0).length;
      const totalCalories = progressLogs.reduce((s, l) => s + (l.meals?.reduce((ms, meal) => ms + (meal.calories || 0), 0) || 0), 0);
      const totalProtein = progressLogs.reduce((s, l) => s + (l.meals?.reduce((ms, meal) => ms + (meal.macros?.protein || 0), 0) || 0), 0);
      const totalCarbs = progressLogs.reduce((s, l) => s + (l.meals?.reduce((ms, meal) => ms + (meal.macros?.carbs || 0), 0) || 0), 0);
      const totalFats = progressLogs.reduce((s, l) => s + (l.meals?.reduce((ms, meal) => ms + (meal.macros?.fats || 0), 0) || 0), 0);
      const avgDailyCalories = totalDaysLogged > 0 ? Math.round(totalCalories / totalDaysLogged) : 0;
      const avgPlanned = dietPlans.length > 0 ? dietPlans.reduce((s, p) => s + ((p as any).avgDailyCalories || (p as any).dailyCalories || 0), 0) / dietPlans.length : 0;
      const adherenceScore = avgPlanned > 0 ? Math.min(100, Math.round((avgDailyCalories / avgPlanned) * 100)) : 0;
      report = new MonthlyDietReport({ userId, year, month, dailyPlans: dietPlans.map(p => p._id), dailyProgress: progressLogs.map(l => l._id), adherenceScore, avgDailyCalories, avgMacros: { protein: totalDaysLogged > 0 ? Math.round(totalProtein / totalDaysLogged) : 0, carbs: totalDaysLogged > 0 ? Math.round(totalCarbs / totalDaysLogged) : 0, fats: totalDaysLogged > 0 ? Math.round(totalFats / totalDaysLogged) : 0 }, totalDaysLogged, generatedAt: new Date() });
      await report.save();
    }
    return res.json({ ok: true, data: { report } });
  } catch (err) {
    console.error('[Admin] user diet report error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch diet report' } });
  }
});

// GET /api/admin/users/:userId/progress-summary - quick progress overview for admin
router.get('/users/:userId/progress-summary', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const since = new Date(); since.setDate(since.getDate() - 30); since.setHours(0, 0, 0, 0);
    const logs = await ProgressLog.find({ userId, date: { $gte: since } }).lean();
    const workoutsCompleted = logs.filter(l => l.workout && (l.workout.completedExercises || 0) > 0).length;
    const totalMealsLogged = logs.reduce((s, l) => s + (l.meals?.length || 0), 0);
    const activeDays = logs.filter(l => (l.workout?.completedExercises || 0) > 0 || (l.meals?.length || 0) > 0).length;
    const latestMeasurement = await ProgressLog.findOne({ userId, measurements: { $exists: true } }).sort({ date: -1 }).lean();
    return res.json({ ok: true, data: { workoutsCompleted, totalMealsLogged, activeDays, latestMeasurement: (latestMeasurement as any)?.measurements || null } });
  } catch (err) {
    console.error('[Admin] progress summary error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch progress summary' } });
  }
});

// GET /api/admin/bulk/status - count users needing plans
router.get('/bulk/status', async (_req, res) => {
  try {
    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const activeUserIds = await Subscription.distinct('userId', {
      status: { $in: ['active', 'trial'] },
      endDate: { $gt: now },
    });
    const activeUsers = await User.find({ _id: { $in: activeUserIds }, role: 'user' }).select('_id').lean();

    const activeIds = activeUsers.map(u => u._id);

    // Users without any workout plan
    const usersWithWorkout = await WorkoutPlan.distinct('userId', { userId: { $in: activeIds } });
    const missingWorkout = activeIds.length - usersWithWorkout.length;

    // Users without today's diet plan
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const usersWithDiet = await DietPlan.distinct('userId', { userId: { $in: activeIds }, date: { $gte: today, $lt: tomorrow } });
    const missingDiet = activeIds.length - usersWithDiet.length;

    return res.json({ ok: true, data: { activeUsers: activeIds.length, missingWorkout, missingDiet } });
  } catch (err) {
    console.error('[Admin] bulk status error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to get bulk status' } });
  }
});

// POST /api/admin/bulk/generate-diet - generate today's diet for all active users missing one
router.post('/bulk/generate-diet', aiOperationLimiter, async (_req, res) => {
  try {
    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const bulkActiveIds = await Subscription.distinct('userId', {
      status: { $in: ['active', 'trial'] },
      endDate: { $gt: now },
    });
    const activeUsers = await User.find({ _id: { $in: bulkActiveIds }, role: 'user' }).select('_id').lean();

    const activeIds = activeUsers.map(u => u._id);
    const usersWithDiet = await DietPlan.distinct('userId', { userId: { $in: activeIds }, date: { $gte: today, $lt: tomorrow } });
    const withDietSet = new Set(usersWithDiet.map((id: any) => id.toString()));
    const needsDiet = activeUsers.filter(u => !withDietSet.has((u._id as any).toString()));

    let success = 0; const errors: string[] = [];

    for (const u of needsDiet) {
      try {
        const userId = (u._id as any).toString();
        const plan = await dietGenerationService.generateDietPlan(userId, today);
        await dietGenerationService.saveDietPlan(userId, today, plan, 'ai');
        success++;
      } catch (e: any) {
        errors.push(`User ${(u._id as any).toString()}: ${e.message}`);
      }
    }

    return res.json({ ok: true, data: { processed: needsDiet.length, success, errors } });
  } catch (err) {
    console.error('[Admin] bulk generate diet error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to run bulk diet generation' } });
  }
});

// ── PLAN REQUESTS ──────────────────────────────────────────────────────────
import LeaveRequest from '../models/LeaveRequest';
import Session from '../models/Session';

// GET /api/admin/plan-requests?status=pending&trainerId=xxx
router.get('/plan-requests', async (req: any, res) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const { trainerId } = req.query as { trainerId?: string };

    // If trainerId specified, only return requests for users assigned to that trainer
    let userFilter: Record<string, any> | undefined;
    if (trainerId) {
      const assignedUsers = await User.find({ assignedTrainerId: trainerId }).select('_id').lean();
      userFilter = { userId: { $in: assignedUsers.map(u => u._id) } };
    }

    const requests = await PlanRequest.find({ status, ...userFilter })
      .populate('userId', 'name email profile assignedTrainerId')
      .sort({ requestedAt: -1 })
      .limit(50)
      .lean();
    return res.json({ ok: true, data: { requests, count: requests.length } });
  } catch (err) {
    console.error('[Admin] plan-requests error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch plan requests' } });
  }
});

// POST /api/admin/plan-requests/bulk-generate - generate plans for multiple pending requests
router.post('/plan-requests/bulk-generate', planGenerationLimiter, aiOperationLimiter, async (req: any, res) => {
  const { requestIds, adminNote } = req.body;
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return res.status(400).json({ ok: false, error: { message: 'requestIds array required' } });
  }
  const bulkNote: string | undefined = adminNote || undefined;

  const results = await Promise.allSettled(
    requestIds.map(async (requestId: string) => {
      const request = await PlanRequest.findById(requestId).lean();
      if (!request) throw new Error('Request not found');

      const userId = (request.userId as any).toString();
      const checkIn = request.checkIn as any;

      const { year: lastMonthYear, month: lastMonthMonth } = getLastMonthDate();
      const [lastMonthWorkout, lastMonthDiet] = await Promise.all([
        MonthlyWorkoutReport.findOne({ userId, year: lastMonthYear, month: lastMonthMonth }).lean(),
        MonthlyDietReport.findOne({ userId, year: lastMonthYear, month: lastMonthMonth }).lean(),
      ]);

      const planResults: Record<string, any> = {};
      const errors: string[] = [];

      // Generate workout if requested
      if (!request.planTypes || request.planTypes.includes('workout')) {
        try {
          const today = new Date();
          const start = new Date(today); start.setHours(0, 0, 0, 0);
          const end = new Date(start); end.setDate(end.getDate() + 27);
          const overlap = await WorkoutPlan.findOne({ userId, $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }] });
          if (!overlap) {
            const plan = await workoutGenerationService.generateWorkoutCycle(
              userId, start, 4, undefined, undefined, undefined, undefined, checkIn,
              lastMonthWorkout ? { completedWorkouts: lastMonthWorkout.completedWorkouts ?? 0, totalWorkouts: lastMonthWorkout.totalWorkouts ?? 0, adherenceScore: lastMonthWorkout.adherenceScore ?? 0, avgDuration: lastMonthWorkout.avgDuration ?? 0 } : undefined,
              undefined,
              bulkNote
            );
            await WorkoutPlan.findByIdAndUpdate(plan._id, { checkIn });
            planResults.workoutPlan = plan;
          } else {
            planResults.workoutPlanSkipped = 'Active plan already exists';
          }
        } catch (e: any) {
          errors.push(`Workout: ${e.message}`);
        }
      }

      // Generate weekly diet if requested
      if (!request.planTypes || request.planTypes.includes('diet')) {
        try {
          const today = new Date();
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const thisMonday = new Date(today);
          thisMonday.setDate(today.getDate() - daysToMonday);
          thisMonday.setHours(0, 0, 0, 0);

          // Handle week-end logic
          const todayDow = today.getDay();
          const daysLeftInWeek = todayDow === 0 ? 0 : 7 - todayDow;
          const isWeekEnd = daysLeftInWeek <= 2;
          const thisWeekPlan = await DietPlan.findOne({ userId, weekStartDate: thisMonday });
          let weekStartDate = thisMonday;
          if (thisWeekPlan && isWeekEnd) {
            weekStartDate = new Date(thisMonday);
            weekStartDate.setDate(thisMonday.getDate() + 7);
          }

          const existing = await DietPlan.findOne({ userId, weekStartDate });
          if (!existing) {
            const userDoc = await User.findById(userId).lean();
            const dp = (userDoc as any)?.profile?.dietPreferences;
            const dietOverrides = (dp?.dietType || dp?.isVegetarian || dp?.weeklyBudget)
              ? { dietType: dp.dietType, isVegetarian: dp.isVegetarian, budget: dp.weeklyBudget }
              : undefined;

            const generated = await dietGenerationService.generateWeeklyDietPlan(
              userId, weekStartDate, dietOverrides, checkIn,
              lastMonthDiet ? { adherenceScore: lastMonthDiet.adherenceScore ?? 0, avgDailyCalories: lastMonthDiet.avgDailyCalories ?? 0, avgMacros: { protein: lastMonthDiet.avgMacros?.protein ?? 0, carbs: lastMonthDiet.avgMacros?.carbs ?? 0, fats: lastMonthDiet.avgMacros?.fats ?? 0 }, totalDaysLogged: lastMonthDiet.totalDaysLogged ?? 0 } : undefined,
              bulkNote
            );
            const saved = await dietGenerationService.saveWeeklyDietPlan(userId, weekStartDate, generated, 'admin', checkIn);
            planResults.dietPlan = saved;
          } else {
            planResults.dietPlanSkipped = 'Weekly diet plan already exists for this week';
          }
        } catch (e: any) {
          errors.push(`Diet: ${e.message}`);
        }
      }

      // Only mark generated if at least one plan was actually created
      const anyGenerated = !!(planResults.workoutPlan || planResults.dietPlan);
      if (anyGenerated) {
        await PlanRequest.findByIdAndUpdate(requestId, {
          status: 'generated',
          generatedAt: new Date(),
          generatedBy: req.user?.userId,
          ...(bulkNote ? { adminNote: bulkNote } : {}),
        });
      }
      if (errors.length > 0 && !anyGenerated) throw new Error(errors.join('; '));

      return { ...planResults, errors };
    })
  );

  const formatted = results.map((r, i) => ({
    requestId: requestIds[i],
    ok: r.status === 'fulfilled',
    error: r.status === 'rejected' ? (r.reason as any)?.message : undefined,
    data: r.status === 'fulfilled' ? r.value : undefined,
  }));

  return res.json({ ok: true, data: { results: formatted } });
});

// POST /api/admin/plan-requests/:id/generate - generate plans for a pending request
router.post('/plan-requests/:id/generate', planGenerationLimiter, aiOperationLimiter, async (req: any, res) => {
  try {
    const request = await PlanRequest.findById(req.params.id).lean();
    if (!request) return res.status(404).json({ ok: false, error: { message: 'Request not found' } });

    const userId = (request.userId as any).toString();
    const checkIn = request.checkIn as any;
    const adminNote: string | undefined = (req.body as any)?.adminNote || undefined;

    // Fetch last month's reports for context
    const { year: lastMonthYear, month: lastMonthMonth } = getLastMonthDate();
    const [lastMonthWorkout, lastMonthDiet] = await Promise.all([
      MonthlyWorkoutReport.findOne({ userId, year: lastMonthYear, month: lastMonthMonth }).lean(),
      MonthlyDietReport.findOne({ userId, year: lastMonthYear, month: lastMonthMonth }).lean(),
    ]);

    const results: Record<string, any> = {};
    const errors: string[] = [];

    // Generate workout if requested
    if (!request.planTypes || request.planTypes.includes('workout')) {
      try {
        const today = new Date();
        const start = new Date(today); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 27);
        const overlap = await WorkoutPlan.findOne({ userId, $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }] });
        if (!overlap) {
          const plan = await workoutGenerationService.generateWorkoutCycle(
            userId, start, 4, undefined, undefined, undefined, undefined, checkIn,
            lastMonthWorkout ? { completedWorkouts: lastMonthWorkout.completedWorkouts ?? 0, totalWorkouts: lastMonthWorkout.totalWorkouts ?? 0, adherenceScore: lastMonthWorkout.adherenceScore ?? 0, avgDuration: lastMonthWorkout.avgDuration ?? 0 } : undefined,
            undefined,
            adminNote
          );
          await WorkoutPlan.findByIdAndUpdate(plan._id, { checkIn });
          results.workoutPlan = plan;
        } else {
          results.workoutPlanSkipped = 'Active plan already exists';
        }
      } catch (e: any) {
        errors.push(`Workout: ${e.message}`);
      }
    }

    // Generate weekly diet if requested
    if (!request.planTypes || request.planTypes.includes('diet')) {
      try {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() - daysToMonday);
        thisMonday.setHours(0, 0, 0, 0);

        // Handle week-end logic: if thisWeek plan exists AND isWeekEnd → use nextMonday
        const todayDow = today.getDay();
        const daysLeftInWeek = todayDow === 0 ? 0 : 7 - todayDow;
        const isWeekEnd = daysLeftInWeek <= 2;
        const thisWeekPlan = await DietPlan.findOne({ userId, weekStartDate: thisMonday });
        let weekStartDate = thisMonday;
        if (thisWeekPlan && isWeekEnd) {
          weekStartDate = new Date(thisMonday);
          weekStartDate.setDate(thisMonday.getDate() + 7);
        }

        const existing = await DietPlan.findOne({ userId, weekStartDate });
        if (!existing) {
          const userDoc = await User.findById(userId).lean();
          const dp = (userDoc as any)?.profile?.dietPreferences;
          const dietOverrides = (dp?.dietType || dp?.isVegetarian || dp?.weeklyBudget)
            ? { dietType: dp.dietType, isVegetarian: dp.isVegetarian, budget: dp.weeklyBudget }
            : undefined;

          const generated = await dietGenerationService.generateWeeklyDietPlan(
            userId, weekStartDate, dietOverrides, checkIn,
            lastMonthDiet ? { adherenceScore: lastMonthDiet.adherenceScore ?? 0, avgDailyCalories: lastMonthDiet.avgDailyCalories ?? 0, avgMacros: { protein: lastMonthDiet.avgMacros?.protein ?? 0, carbs: lastMonthDiet.avgMacros?.carbs ?? 0, fats: lastMonthDiet.avgMacros?.fats ?? 0 }, totalDaysLogged: lastMonthDiet.totalDaysLogged ?? 0 } : undefined,
            adminNote
          );
          const saved = await dietGenerationService.saveWeeklyDietPlan(userId, weekStartDate, generated, 'admin', checkIn);
          results.dietPlan = saved;
        } else {
          results.dietPlanSkipped = 'Weekly diet plan already exists for this week';
        }
      } catch (e: any) {
        errors.push(`Diet: ${e.message}`);
      }
    }

    // Only mark as generated if at least one plan was actually created (not just skipped)
    const anyGenerated = !!(results.workoutPlan || results.dietPlan);
    if (anyGenerated) {
      await PlanRequest.findByIdAndUpdate(req.params.id, {
        status: 'generated',
        generatedAt: new Date(),
        generatedBy: req.user?.userId,
        ...(adminNote ? { adminNote } : {}),
      });
    }

    if (errors.length > 0 && !anyGenerated) {
      return res.status(500).json({ ok: false, error: { message: errors.join('; ') }, data: { errors } });
    }

    return res.json({ ok: true, data: { ...results, errors, message: anyGenerated ? 'Plans generated from request' : 'Plans already exist — nothing generated' } });
  } catch (err: any) {
    console.error('[Admin] plan-request generate error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to generate plans from request' } });
  }
});

// PATCH /api/admin/plan-requests/:id/dismiss
router.patch('/plan-requests/:id/dismiss', async (req, res) => {
  try {
    const request = await PlanRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'dismissed', adminNote: (req.body as any).note },
      { new: true }
    );
    if (!request) return res.status(404).json({ ok: false, error: { message: 'Request not found' } });
    return res.json({ ok: true, data: { request } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to dismiss request' } });
  }
});

// GET /api/admin/trainers - list all admin users who can act as trainers
router.get('/trainers', async (_req, res) => {
  try {
    const trainers = await User.find({ role: 'admin' }).select('name email').lean();
    return res.json({ ok: true, data: { trainers } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch trainers' } });
  }
});

// PATCH /api/admin/users/:userId/trainer - assign or unassign a trainer
router.patch('/users/:userId/trainer', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const { trainerId } = req.body as { trainerId: string | null };

    const user = await User.findByIdAndUpdate(
      userId,
      { assignedTrainerId: trainerId || null },
      { new: true }
    ).select('name email assignedTrainerId').lean();

    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    return res.json({ ok: true, data: { user } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to assign trainer' } });
  }
});

// PATCH /api/admin/users/:userId/gym-status - manually mark member as left or reactivate
router.patch('/users/:userId/gym-status', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const schema = z.object({
      gymStatus: z.enum(['member', 'left']),
      leftReason: z.enum(['moved', 'health', 'cost', 'other']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: { message: 'Invalid data' } });

    const update: Record<string, any> = { gymStatus: parsed.data.gymStatus };
    if (parsed.data.gymStatus === 'left') {
      update.leftAt = new Date();
      update.leftReason = parsed.data.leftReason || 'other';
    } else {
      update.$unset = { leftAt: '', leftReason: '' };
      delete update.leftAt; delete update.leftReason;
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).lean();
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    return res.json({ ok: true, data: { user } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to update gym status' } });
  }
});

// PATCH /api/admin/users/:userId/workout-plans/:planId - edit a workout plan day/exercises
router.patch('/users/:userId/workout-plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params as { userId: string; planId: string };
    const { days, name } = req.body as { days?: any[]; name?: string };

    const update: Record<string, any> = {};
    if (days !== undefined) update.days = days;
    if (name) update.name = name;

    const plan = await WorkoutPlan.findByIdAndUpdate(planId, update, { new: true }).lean();
    if (!plan) return res.status(404).json({ ok: false, error: { message: 'Plan not found' } });
    return res.json({ ok: true, data: { workoutPlan: plan } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to update workout plan' } });
  }
});

// PATCH /api/admin/users/:userId/diet-plans/:planId - edit a weekly diet plan day/meals
router.patch('/users/:userId/diet-plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params as { userId: string; planId: string };
    const { days, avgDailyCalories } = req.body as { days?: any[]; avgDailyCalories?: number };

    const update: Record<string, any> = {};
    if (days !== undefined) update.days = days;
    if (avgDailyCalories !== undefined) update.avgDailyCalories = avgDailyCalories;

    const plan = await DietPlan.findByIdAndUpdate(planId, update, { new: true }).lean();
    if (!plan) return res.status(404).json({ ok: false, error: { message: 'Plan not found' } });
    return res.json({ ok: true, data: { dietPlan: plan } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to update diet plan' } });
  }
});

// POST /api/admin/plan-requests/bulk-dismiss - dismiss multiple requests with a reason
router.post('/plan-requests/bulk-dismiss', async (req: any, res) => {
  const { requestIds, note } = req.body;
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return res.status(400).json({ ok: false, error: { message: 'requestIds array required' } });
  }

  try {
    const result = await PlanRequest.updateMany(
      { _id: { $in: requestIds }, status: 'pending' },
      { status: 'dismissed', adminNote: note || '', generatedBy: req.user?.userId }
    );
    return res.json({ ok: true, data: { dismissed: result.modifiedCount } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: { message: 'Failed to bulk dismiss' } });
  }
});

// DELETE /api/admin/users/:userId — delete user + all associated data
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    if (user.role === 'admin') return res.status(403).json({ ok: false, error: { message: 'Cannot delete admin accounts' } });

    await Promise.all([
      WorkoutPlan.deleteMany({ userId }),
      DietPlan.deleteMany({ userId }),
      ProgressLog.deleteMany({ userId }),
      MonthlyWorkoutReport.deleteMany({ userId }),
      MonthlyDietReport.deleteMany({ userId }),
      PlanRequest.deleteMany({ userId }),
      LeaveRequest.deleteMany({ userId }),
      Session.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    console.log(`[Admin] User ${userId} (${user.email}) deleted with all associated data`);
    res.json({ ok: true, data: { message: `User ${user.name} and all associated data deleted` } });
  } catch (err) {
    console.error('[Admin] Delete user error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to delete user' } });
  }
});

// ---- HOLIDAYS ----
router.get('/holidays', async (_req, res) => {
  try {
    const holidays = await GymHoliday.find().sort({ date: 1 }).lean();
    res.json({ ok: true, data: { holidays } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to fetch holidays' } }); }
});

router.post('/holidays', async (req: any, res) => {
  try {
    const { date, reason } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ ok: false, error: { message: 'date (YYYY-MM-DD) required' } });
    if (!reason?.trim()) return res.status(400).json({ ok: false, error: { message: 'reason required' } });
    const existing = await GymHoliday.findOne({ date });
    if (existing) return res.status(409).json({ ok: false, error: { message: 'Holiday already exists for this date' } });
    const holiday = await GymHoliday.create({ date, reason: reason.trim(), createdBy: req.user.userId });
    res.status(201).json({ ok: true, data: { holiday } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to create holiday' } }); }
});

router.delete('/holidays/:date', async (_req: any, res: any) => {
  try {
    const result = await GymHoliday.deleteOne({ date: _req.params.date });
    if (result.deletedCount === 0) return res.status(404).json({ ok: false, error: { message: 'Holiday not found' } });
    res.json({ ok: true, data: { deleted: true } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to delete holiday' } }); }
});

// ---- ANNOUNCEMENTS ----
router.get('/announcements', async (_req, res) => {
  try {
    const announcements = await Announcement.find().sort({ startsAt: -1 }).lean();
    res.json({ ok: true, data: { announcements } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to fetch announcements' } }); }
});

router.post('/announcements', async (req: any, res: any) => {
  try {
    const schema = z.object({
      title:     z.string().min(1),
      message:   z.string().min(1),
      type:      z.enum(['info', 'warning', 'promo']).default('info'),
      startsAt:  z.coerce.date(),
      expiresAt: z.coerce.date(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: { message: parsed.error.errors[0].message } });
    const { title, message, type, startsAt, expiresAt } = parsed.data;
    if (expiresAt <= startsAt) return res.status(400).json({ ok: false, error: { message: 'expiresAt must be after startsAt' } });
    const ann = await Announcement.create({ title, message, type, startsAt, expiresAt, createdBy: req.user.userId });
    res.status(201).json({ ok: true, data: { announcement: ann } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to create announcement' } }); }
});

router.delete('/announcements/:id', async (req: any, res: any) => {
  try {
    const result = await Announcement.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ ok: false, error: { message: 'Announcement not found' } });
    res.json({ ok: true, data: { deleted: true } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to delete announcement' } }); }
});

// ─── SUBSCRIPTION PLANS ──────────────────────────────────────────────────────

// GET /api/admin/subscription-plans
router.get('/subscription-plans', async (_req, res) => {
  try {
    const [plans, counts] = await Promise.all([
      SubscriptionPlan.find().sort({ price: 1 }).lean(),
      Subscription.aggregate([
        { $match: { planId: { $exists: true }, status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() } } },
        { $group: { _id: '$planId', count: { $sum: 1 } } },
      ]),
    ]);
    const countMap: Record<string, number> = {};
    for (const c of counts) countMap[String(c._id)] = c.count;
    const plansWithCounts = plans.map(p => ({ ...p, activeUserCount: countMap[String((p as any)._id)] || 0 }));
    res.json({ ok: true, data: { plans: plansWithCounts } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to fetch plans' } }); }
});

// POST /api/admin/subscription-plans
router.post('/subscription-plans', async (req, res) => {
  try {
    const schema = z.object({
      name:         z.string().min(1).max(80),
      price:        z.number().min(0),
      durationDays: z.number().int().min(1),
      features: z.object({
        aiWorkoutPlan:    z.boolean().default(false),
        aiDietPlan:       z.boolean().default(false),
        leaveRequests:    z.boolean().default(true),
        progressTracking: z.boolean().default(true),
      }).default({}),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: { message: parsed.error.errors[0].message } });
    const plan = await SubscriptionPlan.create(parsed.data);
    res.status(201).json({ ok: true, data: { plan } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to create plan' } }); }
});

// PATCH /api/admin/subscription-plans/:id
router.patch('/subscription-plans/:id', async (req, res) => {
  try {
    const schema = z.object({
      name:         z.string().min(1).max(80).optional(),
      price:        z.number().min(0).optional(),
      durationDays: z.number().int().min(1).optional(),
      features: z.object({
        aiWorkoutPlan:    z.boolean(),
        aiDietPlan:       z.boolean(),
        leaveRequests:    z.boolean(),
        progressTracking: z.boolean(),
      }).partial().optional(),
      color:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: { message: parsed.error.errors[0].message } });
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { new: true });
    if (!plan) return res.status(404).json({ ok: false, error: { message: 'Plan not found' } });
    // Sync updated features to all active Subscription docs currently on this plan
    if (parsed.data.features) {
      await Subscription.updateMany(
        { planId: req.params.id, status: { $in: ['active', 'trial'] }, endDate: { $gt: new Date() } },
        { $set: { features: parsed.data.features } },
      );
    }
    res.json({ ok: true, data: { plan } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to update plan' } }); }
});

// DELETE /api/admin/subscription-plans/:id  (hard delete — blocked if active users exist)
router.delete('/subscription-plans/:id', async (req, res) => {
  try {
    const activeCount = await Subscription.countDocuments({
      planId: req.params.id,
      status: { $in: ['active', 'trial'] },
      endDate: { $gt: new Date() },
    });
    if (activeCount > 0) {
      return res.status(409).json({
        ok: false,
        error: { message: `Cannot delete: ${activeCount} active member${activeCount !== 1 ? 's' : ''} are on this plan. Deactivate it instead.` },
      });
    }
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ ok: false, error: { message: 'Plan not found' } });
    res.json({ ok: true, data: { deleted: true } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to delete plan' } }); }
});

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

// GET /api/admin/payments?userId=&paymentStatus=&method=&page=&limit=
router.get('/payments', async (req, res) => {
  try {
    const { userId, paymentStatus, method, page = '1', limit = '20' } = req.query as Record<string, string>;
    const filter: any = {};
    if (userId) filter.userId = userId;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (method) filter.method = method;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name email')
        .populate('planId', 'name color')
        .lean(),
      Payment.countDocuments(filter),
    ]);
    res.json({ ok: true, data: { payments, total, page: parseInt(page) } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to fetch payments' } }); }
});

// GET /api/admin/users/:userId/payments
router.get('/users/:userId/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.params.userId })
      .sort({ paidAt: -1 })
      .populate('planId', 'name color')
      .lean();
    res.json({ ok: true, data: { payments } });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to fetch payments' } }); }
});

// POST /api/admin/payments — record payment and activate/extend user subscription
router.post('/payments', async (req: any, res: any) => {
  try {
    const schema = z.object({
      userId:        z.string(),
      planId:        z.string(),
      amount:        z.number().min(0),
      method:        z.enum(['cash', 'upi', 'card', 'other']).default('cash'),
      paymentStatus: z.enum(['received', 'pending']).default('received'),
      paidAt:        z.string().optional(),
      note:          z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: { message: parsed.error.errors[0].message } });

    const { userId, planId, amount, method, paymentStatus, paidAt, note } = parsed.data;

    const [user, plan] = await Promise.all([
      User.findById(userId),
      SubscriptionPlan.findById(planId).lean(),
    ]);
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    if (!plan || !(plan as any).isActive) return res.status(400).json({ ok: false, error: { message: 'Plan not found or inactive' } });

    // Derive subscription status from the plan's planType — client has no say
    const subscriptionStatus: 'active' | 'trial' = (plan as any).planType === 'trial' ? 'trial' : 'active';

    // Block if user already has a non-expired active subscription
    const now = new Date();
    const existingSub = await Subscription.findOne({ userId, status: { $in: ['active', 'trial'] }, endDate: { $gt: now } });
    if (subscriptionStatus === 'active' && existingSub) {
      const expiry = new Date(existingSub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return res.status(409).json({
        ok: false,
        error: { message: `User already has an active subscription until ${expiry}. New plan can only be assigned after it expires.` },
      });
    }

    const base = existingSub?.endDate && new Date(existingSub.endDate) > now
      ? new Date(existingSub.endDate)
      : now;
    const newEndDate = new Date(base);
    newEndDate.setDate(newEndDate.getDate() + (plan as any).durationDays);

    // Create new Subscription document
    const sub = await Subscription.create({
      userId,
      planId:         (plan as any)._id,
      planName:       (plan as any).name,
      price:          Math.max(0, amount),
      features:       (plan as any).features,
      status:         subscriptionStatus,
      startDate:      now,
      endDate:        newEndDate,
      durationMonths: Math.round((plan as any).durationDays / 30),
      assignedBy:     req.user?.userId,
    });

    // Point user to new subscription; re-activate if they were marked as left
    const userUpdate: any = { activeSubscriptionId: sub._id };
    if ((user as any).gymStatus === 'left') {
      userUpdate.gymStatus  = 'member';
      userUpdate.leftAt     = null;
      userUpdate.leftReason = null;
    }
    await User.findByIdAndUpdate(userId, { $set: userUpdate });

    // Trial plans: no payment record
    if (subscriptionStatus === 'trial') {
      return res.status(201).json({ ok: true, data: { payment: null, subscription: sub } });
    }

    // Paid plans: create Payment linked to the new Subscription
    const payment = await Payment.create({
      userId,
      planId:         planId,
      subscriptionId: sub._id,
      planSnapshot:   { name: (plan as any).name, price: (plan as any).price, durationDays: (plan as any).durationDays },
      amount:         Math.max(0, amount),
      method,
      paymentStatus,
      paidAt:         paidAt ? new Date(paidAt) : now,
      note,
      recordedBy:     req.user?.userId,
    });

    // Link payment back to subscription
    await Subscription.findByIdAndUpdate(sub._id, { paymentId: payment._id });

    res.status(201).json({ ok: true, data: { payment, subscription: sub } });
  } catch (err) {
    console.error('[Admin] Record payment error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to record payment' } });
  }
});

// PATCH /api/admin/payments/:id/mark-received — mark a pending payment as received
router.patch('/payments/:id/mark-received', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ ok: false, error: { message: 'Payment not found' } });
    if ((payment as any).paymentStatus !== 'pending') return res.status(400).json({ ok: false, error: { message: 'Payment is not pending' } });
    (payment as any).paymentStatus = 'received';
    await payment.save();
    return res.json({ ok: true, data: { payment } });
  } catch { return res.status(500).json({ ok: false, error: { message: 'Failed to mark payment as received' } }); }
});

// PATCH /api/admin/payments/:id/cancel — void a pending payment + expire linked subscription
router.patch('/payments/:id/cancel', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ ok: false, error: { message: 'Payment not found' } });
    if ((payment as any).paymentStatus !== 'pending') return res.status(400).json({ ok: false, error: { message: 'Only pending payments can be cancelled' } });
    (payment as any).paymentStatus = 'cancelled';
    await payment.save();
    // Expire the subscription linked to this payment
    await Subscription.updateOne(
      { paymentId: payment._id, status: 'active' },
      { status: 'expired' }
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ ok: false, error: { message: 'Failed to cancel payment' } }); }
});

// GET /api/admin/payments/stats — revenue trend, plan distribution, method breakdown
router.get('/payments/stats', async (_req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Monthly revenue trend: last 12 months (received only)
    const monthlyTrend = await Payment.aggregate([
      { $match: { paymentStatus: 'received', paidAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build full 12-month array (fill gaps with 0)
    const trendMap: Record<string, { revenue: number; count: number }> = {};
    for (const r of monthlyTrend) {
      const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
      trendMap[key] = { revenue: r.revenue, count: r.count };
    }
    const revenueByMonth: { month: string; revenue: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      revenueByMonth.push({ month: label, revenue: trendMap[key]?.revenue || 0, count: trendMap[key]?.count || 0 });
    }

    // Plan distribution: received vs pending revenue per plan
    const [revenueByPlanAgg, allPlans] = await Promise.all([
      Payment.aggregate([
        { $match: { paymentStatus: { $in: ['received', 'pending'] } } },
        {
          $group: {
            _id: { plan: { $ifNull: ['$planSnapshot.name', '$planName'] }, status: '$paymentStatus' },
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      SubscriptionPlan.find().select('name color').lean(),
    ]);

    const planColorMap: Record<string, string> = {};
    for (const p of allPlans) planColorMap[(p as any).name] = (p as any).color || '#6B7280';

    const planMap: Record<string, { received: number; pending: number; transactions: number }> = {};
    for (const r of revenueByPlanAgg) {
      const planName: string = r._id.plan || 'Unknown';
      if (!planMap[planName]) planMap[planName] = { received: 0, pending: 0, transactions: 0 };
      if (r._id.status === 'received') planMap[planName].received += r.amount;
      else if (r._id.status === 'pending') planMap[planName].pending += r.amount;
      planMap[planName].transactions += r.count;
    }
    const planDistribution = Object.entries(planMap)
      .map(([name, data]) => ({
        name,
        received: data.received,
        pending: data.pending,
        total: data.received + data.pending,
        transactions: data.transactions,
        color: planColorMap[name] || '#6B7280',
      }))
      .sort((a, b) => b.total - a.total);

    // Payment method breakdown (all time)
    const methodBreakdown = await Payment.aggregate([
      { $group: { _id: '$method', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    // Summary totals
    const [allTimeRevenue, pendingData, pendingCount, mtdRevenue] = await Promise.all([
      Payment.aggregate([{ $match: { paymentStatus: 'received' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { paymentStatus: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.countDocuments({ paymentStatus: 'pending' }),
      Payment.aggregate([{ $match: { paymentStatus: 'received', paidAt: { $gte: thisMonthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    res.json({
      ok: true,
      data: {
        summary: {
          allTimeRevenue: allTimeRevenue[0]?.total || 0,
          revenueThisMonth: mtdRevenue[0]?.total || 0,
          pendingAmount: pendingData[0]?.total || 0,
          pendingCount,
        },
        revenueByMonth,
        planDistribution,
        methodBreakdown: methodBreakdown.map((m: any) => ({ method: m._id || 'other', count: m.count, total: m.total })),
      },
    });
  } catch (err) {
    console.error('[Admin] payments/stats error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to compute payment stats' } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GYM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/gym-settings */
router.get('/gym-settings', async (_req, res) => {
  try {
    const settings = await (GymSettings as any).getOrCreate();
    res.json({ ok: true, data: settings });
  } catch {
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch settings' } });
  }
});

/** PATCH /api/admin/gym-settings */
router.patch('/gym-settings', async (req, res) => {
  try {
    const { attendanceEnabled, autoMarkOutHours, qrTokenExpiryMinutes } = req.body as {
      attendanceEnabled?: boolean;
      autoMarkOutHours?: number;
      qrTokenExpiryMinutes?: number;
    };
    const settings = await (GymSettings as any).getOrCreate();
    if (attendanceEnabled !== undefined) {
      const wasPreviouslyEnabled = settings.attendanceEnabled;
      settings.attendanceEnabled = attendanceEnabled;
      // Record the exact day attendance was enabled (reset if toggled off then on again)
      if (attendanceEnabled && !wasPreviouslyEnabled) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        settings.attendanceEnabledAt = today;
      } else if (!attendanceEnabled) {
        settings.attendanceEnabledAt = null;
      }
    }
    if (autoMarkOutHours !== undefined) settings.autoMarkOutHours = Math.min(6, Math.max(1, autoMarkOutHours));
    if (qrTokenExpiryMinutes !== undefined) settings.qrTokenExpiryMinutes = Math.min(60, Math.max(5, qrTokenExpiryMinutes));
    await settings.save();
    res.json({ ok: true, data: settings });
  } catch {
    res.status(500).json({ ok: false, error: { message: 'Failed to update settings' } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE — QR TOKEN + TODAY OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/attendance/qr-token
 * Issues a short-lived JWT that the QR code encodes.
 * Users scan → browser opens /scan?token=... → POST /api/attendance/mark-in
 */
router.get('/attendance/qr-token', async (_req, res) => {
  try {
    const settings = await (GymSettings as any).getOrCreate();
    if (!settings.attendanceEnabled) {
      return res.status(403).json({ ok: false, error: { message: 'Attendance is not enabled' } });
    }
    const expirySeconds = (settings.qrTokenExpiryMinutes ?? 15) * 60;
    const token = jwt.sign(
      { type: 'gym-checkin' },
      process.env.JWT_SECRET!,
      { expiresIn: expirySeconds },
    );
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return res.json({
      ok: true,
      data: {
        token,
        scanUrl: `${appUrl}/scan?token=${token}`,
        expiresInMinutes: settings.qrTokenExpiryMinutes,
      },
    });
  } catch {
    return res.status(500).json({ ok: false, error: { message: 'Failed to generate QR token' } });
  }
});

/**
 * GET /api/admin/attendance/today
 * Returns all active users with their today's attendance status.
 * Supports ?sort=name|time&order=asc|desc&status=all|present|absent
 */
router.get('/attendance/today', async (req, res) => {
  try {
    const settings = await (GymSettings as any).getOrCreate();
    if (!settings.attendanceEnabled) {
      return res.json({ ok: true, data: { attendanceEnabled: false, records: [] } });
    }

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const { sort = 'name', order = 'asc', status = 'all' } = req.query as {
      sort?: string; order?: string; status?: string;
    };

    // Get all active subscriber user IDs
    const activeUserIds = await Subscription.distinct('userId', {
      status: { $in: ['active', 'trial'] },
      endDate: { $gt: now },
    });

    // Fetch users + today's logs in parallel
    const [users, logs] = await Promise.all([
      User.find({ _id: { $in: activeUserIds }, role: 'user' })
        .select('name email')
        .lean(),
      ProgressLog.find({ userId: { $in: activeUserIds }, date: { $gte: todayStart, $lte: todayEnd } })
        .select('userId attendance')
        .lean(),
    ]);

    const logMap: Record<string, any> = {};
    for (const l of logs) logMap[String(l.userId)] = l.attendance;

    let records = users.map((u: any) => {
      const att = logMap[String(u._id)];
      const isPresent = att?.markedInAt != null;
      return {
        userId: u._id,
        name: u.name,
        email: u.email,
        status: isPresent ? 'present' : 'absent',
        markedInAt: att?.markedInAt ?? null,
        markedOutAt: att?.markedOutAt ?? null,
        durationMinutes: att?.durationMinutes ?? null,
        currentlyIn: isPresent && !att?.markedOutAt,
      };
    });

    // Filter
    if (status !== 'all') {
      records = records.filter((r: any) => r.status === status);
    }

    // Sort
    records.sort((a: any, b: any) => {
      let cmp = 0;
      if (sort === 'time') {
        const ta = a.markedInAt ? new Date(a.markedInAt).getTime() : 0;
        const tb = b.markedInAt ? new Date(b.markedInAt).getTime() : 0;
        cmp = ta - tb;
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return order === 'desc' ? -cmp : cmp;
    });

    const presentCount = records.filter((r: any) => r.status === 'present').length;
    const absentCount  = records.filter((r: any) => r.status === 'absent').length;
    const currentlyIn  = records.filter((r: any) => r.currentlyIn).length;

    return res.json({
      ok: true,
      data: {
        attendanceEnabled: true,
        date: todayStart.toISOString().slice(0, 10),
        summary: { total: records.length, presentCount, absentCount, currentlyIn },
        records,
      },
    });
  } catch (err) {
    console.error('[Admin] attendance/today error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch today attendance' } });
  }
});

/**
 * GET /api/admin/attendance/user/:userId/history?days=60
 * Returns attendance history for a specific user (admin view).
 */
router.get('/attendance/user/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const maxDays = Math.min(parseInt(req.query.days as string) || 60, 90);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const windowFrom = new Date(today); windowFrom.setDate(today.getDate() - maxDays + 1);

    const gymSettings = await (GymSettings as any).getOrCreate();
    if (!gymSettings.attendanceEnabled) {
      return res.json({ ok: true, data: { attendanceEnabled: false, records: [], summary: null } });
    }
    const midnight = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const anchor = gymSettings.attendanceEnabledAt ? midnight(new Date(gymSettings.attendanceEnabledAt)) : windowFrom;
    const effectiveFrom = anchor > windowFrom ? anchor : windowFrom;

    const DAY = 86400000;
    const totalDays = Math.round((today.getTime() - effectiveFrom.getTime()) / DAY) + 1;
    const dateRange = Array.from({ length: totalDays }, (_, i) =>
      new Date(today.getTime() - i * DAY).toISOString().slice(0, 10),
    );

    const [logs, leaves, gymHolidays] = await Promise.all([
      ProgressLog.find({ userId, date: { $gte: effectiveFrom } }).lean(),
      LeaveRequest.find({ userId, status: 'approved' }).lean(),
      GymHoliday.find({ date: { $in: dateRange } }).lean(),
    ]);

    const attMap = new Map(
      logs.filter(l => l.attendance?.markedInAt).map(l => [l.date.toISOString().slice(0, 10), l.attendance!]),
    );
    const holidayMap = new Map(gymHolidays.map(h => [h.date, h.reason]));
    const leaveSet = new Set<string>();
    for (const lr of leaves) {
      for (const d of lr.dates) { if (!lr.forcedDates.includes(d)) leaveSet.add(d); }
    }

    const records = dateRange.map(dateStr => {
      const att = attMap.get(dateStr);
      if (att) return { date: dateStr, status: 'present' as const,
        markedInAt: att.markedInAt ?? null, markedOutAt: att.markedOutAt ?? null,
        durationMinutes: att.durationMinutes ?? null, autoMarkedOut: att.autoMarkedOut };
      if (leaveSet.has(dateStr))   return { date: dateStr, status: 'leave' as const };
      if (holidayMap.has(dateStr)) return { date: dateStr, status: 'holiday' as const, reason: holidayMap.get(dateStr) };
      return { date: dateStr, status: 'absent' as const };
    });

    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays  = records.filter(r => r.status === 'absent').length;
    const leaveDays   = records.filter(r => r.status === 'leave').length;
    const holidayDays = records.filter(r => r.status === 'holiday').length;
    const totalMinutes = records.reduce((s, r) => s + (('durationMinutes' in r ? r.durationMinutes : 0) ?? 0), 0);

    return res.json({
      ok: true,
      data: { attendanceEnabled: gymSettings.attendanceEnabled, records, summary: { presentDays, absentDays, leaveDays, holidayDays, totalDays, totalMinutes } },
    });
  } catch (err) {
    console.error('[Admin] attendance/user history error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch user attendance history' } });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Admin resets a member's password directly (no email flow yet).
 */
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ ok: false, error: { message: 'Password must be at least 8 characters' } });
    }
    const hash = await hashPassword(newPassword);
    const user = await User.findByIdAndUpdate(id, { passwordHash: hash }).lean();
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    return res.json({ ok: true, data: { message: 'Password reset successfully' } });
  } catch {
    return res.status(500).json({ ok: false, error: { message: 'Failed to reset password' } });
  }
});

export default router;
