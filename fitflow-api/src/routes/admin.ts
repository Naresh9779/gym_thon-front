import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import User from '../models/User';
import WorkoutPlan from '../models/WorkoutPlan';
import DietPlan from '../models/DietPlan';
import { workoutGenerationService } from '../services/workoutGenerationService';
import { dietGenerationService } from '../services/dietGenerationService';
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

// POST /api/admin/users - create a new user (role=user)
router.post('/users', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      profile: z
        .object({
          age: z.number().optional(),
          weight: z.number().optional(),
          height: z.number().optional(),
          activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
          goals: z.array(z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance'])).optional(),
        })
        .optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid user data', details: parsed.error.errors } });
    }
    const { name, email, password, profile } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ ok: false, error: { message: 'Email already registered' } });

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
      profile: profile ? { ...profile } : undefined,
      subscription: { plan: 'free', status: 'active' },
    });

    return res.status(201).json({ ok: true, data: { user: { id: user._id, name: user.name, email: user.email, role: user.role } } });
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
router.post('/users/:userId/generate-workout-cycle', async (req, res) => {
  try {
    const schema = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      durationWeeks: z.number().min(1).max(16).default(4),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { startDate, durationWeeks } = parsed.data;

    // Validate user exists
    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

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

    const plan = await workoutGenerationService.generateWorkoutCycle(userId, start, durationWeeks);
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

    // Validate user exists
    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

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
router.post('/users/:userId/generate-diet-daily', async (req, res) => {
  try {
    const schema = z.object({ previousDayProgressId: z.string().optional() });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request data', details: parsed.error.errors } });
    }

    const { userId } = req.params as { userId: string };
    const { previousDayProgressId } = parsed.data;

    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

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

export default router;
