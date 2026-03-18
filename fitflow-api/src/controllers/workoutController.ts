import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { checkInSchema, getLastMonthDate } from '../utils/schemas';
import WorkoutPlan from '../models/WorkoutPlan';
import MonthlyWorkoutReport from '../models/MonthlyWorkoutReport';
import User from '../models/User';
import { workoutGenerationService } from '../services/workoutGenerationService';

const generateCycleSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationWeeks: z.number().min(1).max(16).default(4),
});

const selfGenerateSchema = z.object({
  checkIn: checkInSchema,
  durationWeeks: z.number().min(1).max(16).default(4),
  daysPerWeek: z.number().min(1).max(7).optional(),
  goal: z.string().optional(),
  experience: z.string().optional(),
  preferences: z.string().optional(),
});

export async function getUserWorkoutPlans(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    const { startDate, endDate, limit = '20' } = req.query;
    const query: any = { userId };
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate as string);
      if (endDate) query.startDate.$lte = new Date(endDate as string);
    }

    const plans = await WorkoutPlan.find(query).sort({ startDate: -1 }).limit(parseInt(limit as string)).lean();

    return res.json({ ok: true, data: { workoutPlans: plans, count: plans.length } });
  } catch (e) {
    console.error('[WorkoutController] getUserWorkoutPlans:', e);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch workout plans' } });
  }
}

export async function getWorkoutPlanById(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    const plan = await WorkoutPlan.findOne({ _id: id, userId }).lean();
    if (!plan) return res.status(404).json({ ok: false, error: { message: 'Workout plan not found' } });

    return res.json({ ok: true, data: { workoutPlan: plan } });
  } catch (e) {
    console.error('[WorkoutController] getWorkoutPlanById:', e);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch workout plan' } });
  }
}

export async function generateWorkoutCycle(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    const parsed = generateCycleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request', details: parsed.error.errors } });
    }

    const { startDate, durationWeeks } = parsed.data;

    // Check if overlapping plan exists
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + durationWeeks * 7 - 1);

    const overlap = await WorkoutPlan.findOne({
      userId,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlap) {
      return res.status(409).json({ ok: false, error: { message: 'Workout plan overlaps existing cycle', existingPlanId: overlap._id } });
    }

    const plan = await workoutGenerationService.generateWorkoutCycle(userId, start, durationWeeks);

    return res.status(201).json({ ok: true, data: { workoutPlan: plan, message: 'Workout cycle generated successfully' } });
  } catch (e: any) {
    console.error('[WorkoutController] generateWorkoutCycle:', e);
    if (e.message?.includes('User profile incomplete')) {
      return res.status(400).json({ ok: false, error: { message: e.message, code: 'INCOMPLETE_PROFILE' } });
    }
    return res.status(500).json({ ok: false, error: { message: 'Failed to generate workout cycle' } });
  }
}

/**
 * POST /api/workouts/self-generate
 * User self-generates a workout cycle with check-in data
 */
export async function selfGenerateWorkoutCycle(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    const parsed = selfGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid request', details: parsed.error.errors } });
    }

    const { checkIn, durationWeeks, daysPerWeek, goal, experience, preferences } = parsed.data;

    // Update user profile weight from check-in
    if (checkIn?.currentWeight) {
      await User.findByIdAndUpdate(userId, { 'profile.weight': checkIn.currentWeight });
    }

    // Use today as start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + durationWeeks * 7 - 1);

    // Guard: block if there's a plan with more than 7 days remaining
    const RENEW_WINDOW_DAYS = 7;
    const renewCutoff = new Date(today);
    renewCutoff.setDate(renewCutoff.getDate() + RENEW_WINDOW_DAYS);

    const blockingPlan = await WorkoutPlan.findOne({
      userId,
      status: { $ne: 'cancelled' },
      endDate: { $gt: renewCutoff },
    }).lean();

    if (blockingPlan) {
      const daysLeft = Math.ceil((new Date((blockingPlan as any).endDate).getTime() - Date.now()) / 86400000);
      return res.status(409).json({
        ok: false,
        error: {
          code: 'PLAN_STILL_ACTIVE',
          message: `Your current workout plan has ${daysLeft} days remaining. Check-in is available when ≤${RENEW_WINDOW_DAYS} days remain.`,
          daysLeft,
        },
      });
    }

    // Fetch last month's workout report
    const { year: lastMonthYear, month: lastMonthMonth } = getLastMonthDate();
    const lastMonthWorkoutReport = await MonthlyWorkoutReport.findOne({
      userId,
      year: lastMonthYear,
      month: lastMonthMonth,
    }).lean();

    const lastMonthReport = lastMonthWorkoutReport ? {
      completedWorkouts: lastMonthWorkoutReport.completedWorkouts ?? 0,
      totalWorkouts: lastMonthWorkoutReport.totalWorkouts ?? 0,
      adherenceScore: lastMonthWorkoutReport.adherenceScore ?? 0,
      avgDuration: lastMonthWorkoutReport.avgDuration ?? 0,
    } : undefined;

    console.log(`[WorkoutController] Self-generating workout cycle for user ${userId}...`);

    const plan = await workoutGenerationService.generateWorkoutCycle(
      userId,
      today,
      durationWeeks,
      daysPerWeek,
      goal,
      experience,
      preferences,
      checkIn,
      lastMonthReport,
      undefined,
      undefined
    );

    // Store checkIn on the workout plan
    await WorkoutPlan.findByIdAndUpdate(plan._id, { checkIn });

    console.log(`[WorkoutController] Self-generated workout cycle: ${plan._id}`);

    return res.status(201).json({
      ok: true,
      data: { workoutPlan: { ...plan.toObject(), checkIn }, message: 'Workout cycle generated successfully' },
    });
  } catch (e: any) {
    console.error('[WorkoutController] selfGenerateWorkoutCycle:', e);
    if (e.message?.includes('User profile incomplete')) {
      return res.status(400).json({ ok: false, error: { message: e.message, code: 'INCOMPLETE_PROFILE' } });
    }
    return res.status(500).json({ ok: false, error: { message: 'Failed to self-generate workout cycle' } });
  }
}

export async function deleteWorkoutPlan(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });

    const removed = await WorkoutPlan.findOneAndDelete({ _id: id, userId });
    if (!removed) return res.status(404).json({ ok: false, error: { message: 'Workout plan not found' } });

    return res.json({ ok: true, data: { message: 'Workout plan deleted successfully' } });
  } catch (e) {
    console.error('[WorkoutController] deleteWorkoutPlan:', e);
    return res.status(500).json({ ok: false, error: { message: 'Failed to delete workout plan' } });
  }
}
