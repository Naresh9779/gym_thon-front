import { Router } from 'express';
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

// GET /api/admin/users/expiring?days=7 - list users whose subscription expires within N days
router.get('/users/expiring', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(String(req.query.days || '7')));
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const users = await User.find({
      'subscription.endDate': { $gte: now, $lte: cutoff },
      'subscription.status': { $in: ['active', 'trial'] },
    }).select('name email subscription createdAt').lean();

    return res.json({ ok: true, data: { users, count: users.length } });
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
    const activeUsers = await User.find({
      'subscription.status': { $in: ['active', 'trial'] },
    }).select('name email subscription createdAt').lean();

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
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      subscriptionDurationMonths: z.number().min(1).max(60),
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
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const field = first.path.join('.');
      const msg = first.message;
      return res.status(400).json({ ok: false, error: { message: `${field ? field + ': ' : ''}${msg}`, details: parsed.error.errors } });
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
      profile: {
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        gender: profile.gender,
        activityLevel: profile.activityLevel,
        goals: profile.goals,
        experienceLevel: profile.experienceLevel,
        dietPreferences: profile.dietPreferences,
      },
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

    const user = await User.findById(userId).select('_id subscription');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    if (user.subscription) {
      const now = new Date();
      const endDate = user.subscription.endDate ? new Date(user.subscription.endDate) : null;
      if (!endDate || now > endDate || user.subscription.status === 'expired') {
        return res.status(403).json({
          ok: false,
          error: { message: 'Cannot generate diet plan for user with expired subscription', code: 'USER_SUBSCRIPTION_EXPIRED' }
        });
      }
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
      const totalProtein = progressLogs.reduce((s, l) => s + (l.meals?.reduce((ms, meal) => ms + (meal.macros?.p || 0), 0) || 0), 0);
      const totalCarbs = progressLogs.reduce((s, l) => s + (l.meals?.reduce((ms, meal) => ms + (meal.macros?.c || 0), 0) || 0), 0);
      const totalFats = progressLogs.reduce((s, l) => s + (l.meals?.reduce((ms, meal) => ms + (meal.macros?.f || 0), 0) || 0), 0);
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

    const activeUsers = await User.find({
      role: 'user',
      'subscription.status': { $in: ['active', 'trial'] },
      'subscription.endDate': { $gt: now },
    }).select('_id').lean();

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

    const activeUsers = await User.find({
      role: 'user',
      'subscription.status': { $in: ['active', 'trial'] },
      'subscription.endDate': { $gt: now },
    }).select('_id').lean();

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
import PlanRequest from '../models/PlanRequest';
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
      .populate('userId', 'name email profile subscription assignedTrainerId')
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

export default router;
