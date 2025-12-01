import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { planGenerationLimiter, aiOperationLimiter } from '../middleware/rateLimiter';
import User from '../models/User';
import WorkoutPlan from '../models/WorkoutPlan';
import DietPlan from '../models/DietPlan';
import ProgressLog from '../models/ProgressLog';
import { workoutGenerationService } from '../services/workoutGenerationService';
import { dietGenerationService } from '../services/dietGenerationService';
import { planSchedulerService } from '../services/planSchedulerService';
import { hashPassword } from '../utils/auth';
import { z } from 'zod';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/users - list users (safe fields)
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find().select('name email role createdAt profile subscription').lean();
    res.json({ ok: true, data: { users } });
  } catch (err) {
    console.error('[Admin] Error listing users', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to list users' } });
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
      activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
      goals: z.array(z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance'])).optional(),
      preferences: z.array(z.string()).optional(),
      restrictions: z.array(z.string()).optional(),
      timezone: z.string().optional(),
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

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select('name email role profile subscription');
    return res.json({ ok: true, data: { user: updated } });
  } catch (err) {
    console.error('[Admin] update user profile error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to update user profile' } });
  }
});

// PATCH /api/admin/users/:userId/subscription - update user subscription
router.patch('/users/:userId/subscription', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };

    const schema = z.object({
      status: z.enum(['active', 'inactive', 'trial', 'expired']).optional(),
      extendByMonths: z.number().min(-120).max(120).optional(), // Extend or reduce by months
      extendByDays: z.number().min(-3650).max(3650).optional(), // Extend or reduce by days
      setEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // Set specific end date
    });

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid subscription data', details: parsed.error.errors } });
    }

    const user = await User.findById(userId).select('subscription');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    const update: Record<string, any> = {};
    
    // Handle date modifications first
    if (parsed.data.setEndDate) {
      // Set specific end date
      const newEndDate = new Date(parsed.data.setEndDate);
      update['subscription.endDate'] = newEndDate;
      
      // Auto-activate if new end date is in the future
      const now = new Date();
      if (newEndDate > now && user.subscription?.status === 'expired') {
        update['subscription.status'] = 'active';
      }
    } else if (parsed.data.extendByMonths !== undefined || parsed.data.extendByDays !== undefined) {
      // Extend or reduce from current end date
      const currentEnd = user.subscription?.endDate ? new Date(user.subscription.endDate) : new Date();
      
      if (parsed.data.extendByMonths) {
        currentEnd.setMonth(currentEnd.getMonth() + parsed.data.extendByMonths);
      }
      
      if (parsed.data.extendByDays) {
        currentEnd.setDate(currentEnd.getDate() + parsed.data.extendByDays);
      }
      
      update['subscription.endDate'] = currentEnd;
      
      // Auto-activate if new end date is in the future
      const now = new Date();
      if (currentEnd > now && user.subscription?.status === 'expired') {
        update['subscription.status'] = 'active';
      }
      
      // Recalculate duration if we have a start date
      if (user.subscription?.startDate) {
        const startDate = new Date(user.subscription.startDate);
        const monthsDiff = (currentEnd.getFullYear() - startDate.getFullYear()) * 12 + 
                          (currentEnd.getMonth() - startDate.getMonth());
        update['subscription.durationMonths'] = Math.max(0, monthsDiff);
      }
    }
    
    // Update status if explicitly provided (overrides auto-activation)
    if (parsed.data.status) {
      update['subscription.status'] = parsed.data.status;
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select('name email role subscription');
    return res.json({ ok: true, data: { user: updated } });
  } catch (err) {
    console.error('[Admin] update subscription error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to update subscription' } });
  }
});

// POST /api/admin/users - create a new user (role=user)
router.post('/users', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      subscriptionDurationMonths: z.number().min(1).max(60).default(1), // Default 1 month
      profile: z
        .object({
          age: z.number().optional(),
          weight: z.number().optional(),
          height: z.number().optional(),
          gender: z.enum(['male', 'female', 'other']).optional(),
          activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
          goals: z.array(z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance'])).optional(),
          preferences: z.array(z.string()).optional(),
          restrictions: z.array(z.string()).optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid user data', details: parsed.error.errors } });
    }
    const { name, email, password, subscriptionDurationMonths, profile } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ ok: false, error: { message: 'Email already registered' } });

    const passwordHash = await hashPassword(password);
    
    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + subscriptionDurationMonths);
    
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
      profile: profile ? { ...profile } : undefined,
      subscription: { 
        plan: 'free', 
        status: 'active',
        startDate,
        endDate,
        durationMonths: subscriptionDurationMonths
      },
    });

    return res.status(201).json({ ok: true, data: { user: { id: user._id, name: user.name, email: user.email, role: user.role, subscription: user.subscription } } });
  } catch (err) {
    console.error('[Admin] Create user error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to create user' } });
  }
});

// GET /api/admin/metrics - basic counts for dashboard
router.get('/metrics', async (_req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const workoutPlansCount = await WorkoutPlan.countDocuments();
    const activeWorkoutPlans = await WorkoutPlan.countDocuments({ status: 'active' });
    const dietPlansCount = await DietPlan.countDocuments();

    res.json({ ok: true, data: { usersCount, workoutPlansCount, activeWorkoutPlans, dietPlansCount } });
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
      goal: z.string().optional(),
      experience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      preferences: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { startDate, durationWeeks, daysPerWeek, goal, experience, preferences } = parsed.data;

    // Validate user exists and check subscription
    const user = await User.findById(userId).select('_id subscription');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    // Check if user's subscription is active
    if (user.subscription) {
      const now = new Date();
      const endDate = user.subscription.endDate ? new Date(user.subscription.endDate) : null;
      
      if (!endDate || now > endDate || user.subscription.status === 'expired') {
        return res.status(403).json({ 
          ok: false, 
          error: { 
            message: 'Cannot generate workout plan for user with expired subscription',
            code: 'USER_SUBSCRIPTION_EXPIRED'
          } 
        });
      }
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

    const plan = await workoutGenerationService.generateWorkoutCycle(
      userId, 
      start, 
      durationWeeks,
      daysPerWeek,
      goal,
      experience,
      preferences
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
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { date, previousDayProgressId } = parsed.data;
    const targetDate = new Date(date);

    // Validate user exists and check subscription
    const user = await User.findById(userId).select('_id subscription');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    // Check if user's subscription is active
    if (user.subscription) {
      const now = new Date();
      const endDate = user.subscription.endDate ? new Date(user.subscription.endDate) : null;
      
      if (!endDate || now > endDate || user.subscription.status === 'expired') {
        return res.status(403).json({ 
          ok: false, 
          error: { 
            message: 'Cannot generate diet plan for user with expired subscription',
            code: 'USER_SUBSCRIPTION_EXPIRED'
          } 
        });
      }
    }

    // Check if plan exists
    const existingPlan = await DietPlan.findOne({ userId, date: targetDate });
    if (existingPlan) {
      return res.status(409).json({ ok: false, error: { message: 'Diet plan already exists for this date', existingPlanId: existingPlan._id } });
    }

  const generatedPlan = await dietGenerationService.generateDietPlan(userId, targetDate, previousDayProgressId);
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
    const schema = z.object({ previousDayProgressId: z.string().optional() });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { previousDayProgressId } = parsed.data;

    // Validate user exists and check subscription
    const user = await User.findById(userId).select('_id subscription');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    // Check if user's subscription is active
    if (user.subscription) {
      const now = new Date();
      const endDate = user.subscription.endDate ? new Date(user.subscription.endDate) : null;
      
      if (!endDate || now > endDate || user.subscription.status === 'expired') {
        return res.status(403).json({ 
          ok: false, 
          error: { 
            message: 'Cannot generate diet plan for user with expired subscription',
            code: 'USER_SUBSCRIPTION_EXPIRED'
          } 
        });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingPlan = await DietPlan.findOne({ userId, date: today });
    if (existingPlan) {
      return res.json({ ok: true, data: { dietPlan: existingPlan, message: 'Diet plan already exists for today', alreadyExists: true } });
    }

  const generatedPlan = await dietGenerationService.generateDietPlan(userId, today, previousDayProgressId);
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

// GET /api/admin/users/:userId/workouts - list workout plans for a specific user
router.get('/users/:userId/workouts', async (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    const workoutPlans = await WorkoutPlan.find({ userId })
      .sort({ startDate: -1 })
      .lean();

    return res.json({ ok: true, data: { workoutPlans, count: workoutPlans.length } });
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
    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    const dietPlans = await DietPlan.find({ userId })
      .sort({ date: -1 })
      .lean();

    return res.json({ ok: true, data: { dietPlans, count: dietPlans.length } });
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
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dailyCalories: z.number().min(0).optional(),
      macros: z
        .object({ protein: z.number().min(0), carbs: z.number().min(0), fats: z.number().min(0) })
        .partial()
        .optional(),
      meals: z.any().optional(), // accept structure from client
      notes: z.string().max(1000).optional(),
      generatedFrom: z.enum(['manual', 'ai', 'auto-daily']).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const update: any = { ...parsed.data };
    if (parsed.data.date) update.date = new Date(parsed.data.date);

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

// POST /api/admin/scheduler/trigger-daily-diet - manually trigger daily diet generation
router.post('/scheduler/trigger-daily-diet', async (_req, res) => {
  try {
    console.log('[Admin] Manual trigger: Daily diet generation');
    // Run in background (don't wait for completion)
    planSchedulerService.triggerDailyDietGeneration().catch(err => {
      console.error('[Admin] Daily diet generation error:', err);
    });
    return res.json({ 
      ok: true, 
      data: { message: 'Daily diet generation triggered. Check server logs for progress.' } 
    });
  } catch (err) {
    console.error('[Admin] trigger daily diet error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to trigger daily diet generation' } });
  }
});

// POST /api/admin/scheduler/trigger-workout-expiry - manually trigger workout expiry check
router.post('/scheduler/trigger-workout-expiry', async (_req, res) => {
  try {
    console.log('[Admin] Manual trigger: Workout expiry check');
    // Run in background (don't wait for completion)
    planSchedulerService.triggerWorkoutExpiryCheck().catch(err => {
      console.error('[Admin] Workout expiry check error:', err);
    });
    return res.json({ 
      ok: true, 
      data: { message: 'Workout expiry check triggered. Check server logs for progress.' } 
    });
  } catch (err) {
    console.error('[Admin] trigger workout expiry error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to trigger workout expiry check' } });
  }
});

// GET /api/admin/scheduler/status - get cronjob status and execution info
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

export default router;
