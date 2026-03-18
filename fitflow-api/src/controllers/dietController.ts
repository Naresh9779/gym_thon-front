import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { checkInSchema, getMondayOf, getLastMonthDate } from '../utils/schemas';
import DietPlan from '../models/DietPlan';
import MonthlyDietReport from '../models/MonthlyDietReport';
import User from '../models/User';
import { dietGenerationService } from '../services/dietGenerationService';

// Validation schemas
const generateDietSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  previousDayProgressId: z.string().optional(),
});

const generateDailySchema = z.object({
  previousDayProgressId: z.string().optional(),
});

const generateWeeklySchema = z.object({
  checkIn: checkInSchema,
  goalOverride: z.string().optional(),
  dietType: z.enum(['balanced', 'high_protein', 'low_carb', 'mediterranean']).optional(),
  isVegetarian: z.boolean().optional(),
  budget: z.number().min(0).optional(),
  additionalPreferences: z.string().max(500).optional(),
});

/**
 * GET /api/diet
 * Get all diet plans for authenticated user
 */
export async function getUserDietPlans(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    // Parse query parameters
    const { startDate, endDate, limit = '30' } = req.query;

    // Build query — support both legacy date field and new weekStartDate
    const query: any = { userId };
    if (startDate || endDate) {
      query.weekStartDate = {};
      if (startDate) query.weekStartDate.$gte = new Date(startDate as string);
      if (endDate) query.weekStartDate.$lte = new Date(endDate as string);
    }

    // Fetch diet plans — sort by weekStartDate descending (weekly plans)
    const dietPlans = await DietPlan.find(query)
      .sort({ weekStartDate: -1, createdAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    return res.json({
      ok: true,
      data: {
        dietPlans,
        count: dietPlans.length,
      },
    });
  } catch (error) {
    console.error('[DietController] Error fetching diet plans:', error);
    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to fetch diet plans' },
    });
  }
}

/**
 * GET /api/diet/:id
 * Get specific diet plan by ID
 */
export async function getDietPlanById(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    const dietPlan = await DietPlan.findOne({ _id: id, userId }).lean();

    if (!dietPlan) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Diet plan not found' },
      });
    }

    return res.json({
      ok: true,
      data: { dietPlan },
    });
  } catch (error) {
    console.error('[DietController] Error fetching diet plan:', error);
    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to fetch diet plan' },
    });
  }
}

/**
 * POST /api/diet/generate
 * Generate a diet plan for a specific date using AI (legacy)
 */
export async function generateDietPlan(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    // Validate request body
    const validation = generateDietSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: {
          message: 'Invalid request data',
          details: validation.error.errors,
        },
      });
    }

    const { date, previousDayProgressId } = validation.data;
    const targetDate = new Date(date);

    console.log(`[DietController] Generating diet plan for ${date}...`);

    // Generate diet plan using AI
    const generatedPlan = await dietGenerationService.generateDietPlan(
      userId,
      targetDate,
      previousDayProgressId
    );

    // Save to database
    const savedPlan = await dietGenerationService.saveDietPlan(
      userId,
      targetDate,
      generatedPlan,
      'ai',
      previousDayProgressId
    );

    console.log(`[DietController] Diet plan generated successfully: ${savedPlan._id}`);

    return res.status(201).json({
      ok: true,
      data: {
        dietPlan: savedPlan,
        message: 'Diet plan generated successfully',
      },
    });
  } catch (error: any) {
    console.error('[DietController] Error generating diet plan:', error);

    if (error.message?.includes('User profile incomplete')) {
      return res.status(400).json({
        ok: false,
        error: {
          message: error.message,
          code: 'INCOMPLETE_PROFILE',
        },
      });
    }

    if (error.message?.includes('OpenRouter')) {
      return res.status(503).json({
        ok: false,
        error: {
          message: 'AI service temporarily unavailable',
          details: error.message,
        },
      });
    }

    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to generate diet plan' },
    });
  }
}

/**
 * POST /api/diet/generate-daily
 * Generate diet plan for today (legacy / used by cron job)
 */
export async function generateDailyDietPlan(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    const validation = generateDailySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: {
          message: 'Invalid request data',
          details: validation.error.errors,
        },
      });
    }

    const { previousDayProgressId } = validation.data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`[DietController] Generating daily diet plan for user ${userId}...`);

    const generatedPlan = await dietGenerationService.generateDietPlan(
      userId,
      today,
      previousDayProgressId
    );

    const savedPlan = await dietGenerationService.saveDietPlan(
      userId,
      today,
      generatedPlan,
      'auto-daily',
      previousDayProgressId
    );

    console.log(`[DietController] Daily diet plan generated: ${savedPlan._id}`);

    return res.status(201).json({
      ok: true,
      data: {
        dietPlan: savedPlan,
        message: 'Daily diet plan generated successfully',
      },
    });
  } catch (error: any) {
    console.error('[DietController] Error generating daily diet plan:', error);

    if (error.message?.includes('User profile incomplete')) {
      return res.status(400).json({
        ok: false,
        error: {
          message: error.message,
          code: 'INCOMPLETE_PROFILE',
        },
      });
    }

    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to generate daily diet plan' },
    });
  }
}

/**
 * POST /api/diet/generate-weekly
 * User self-generates their weekly diet plan
 * Accepts checkIn + optional overrides, fetches last month's report, generates weekly plan
 */
export async function generateWeeklyDietPlan(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    const validation = generateWeeklySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: {
          message: 'Invalid request data',
          details: validation.error.errors,
        },
      });
    }

    const { checkIn, goalOverride, dietType, isVegetarian, budget, additionalPreferences } = validation.data;
    const overrides = (goalOverride || dietType || isVegetarian !== undefined || budget || additionalPreferences)
      ? { goalOverride, dietType, isVegetarian, budget, additionalPreferences }
      : undefined;

    // Update user profile weight from check-in
    if (checkIn?.currentWeight) {
      await User.findByIdAndUpdate(userId, { 'profile.weight': checkIn.currentWeight });
    }

    // Compute Monday of the current week
    const thisMonday = getMondayOf(new Date());

    // If it's Fri/Sat/Sun (isWeekEnd) and this week's plan already exists, generate for NEXT week
    const dayOfWeek = new Date().getDay();
    const daysLeftInWeek = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const isWeekEnd = daysLeftInWeek <= 2; // Fri=2, Sat=1, Sun=0
    const thisDietPlan = await DietPlan.findOne({ userId, weekStartDate: thisMonday });

    let weekStartDate: Date;
    if (thisDietPlan && isWeekEnd) {
      // Generate for next week
      weekStartDate = new Date(thisMonday);
      weekStartDate.setDate(thisMonday.getDate() + 7);
    } else {
      weekStartDate = thisMonday;
    }

    // Check if plan already exists for target week
    const existingPlan = await DietPlan.findOne({ userId, weekStartDate });
    if (existingPlan) {
      return res.status(409).json({
        ok: false,
        error: {
          message: thisDietPlan && isWeekEnd
            ? 'Diet plan already exists for next week'
            : 'Weekly diet plan already exists for this week',
          existingPlanId: existingPlan._id,
        },
      });
    }

    // Fetch last month's diet report
    const { year: lastMonthYear, month: lastMonthMonth } = getLastMonthDate();
    const lastMonthDietReport = await MonthlyDietReport.findOne({
      userId,
      year: lastMonthYear,
      month: lastMonthMonth,
    }).lean();

    const lastMonthReport = lastMonthDietReport ? {
      adherenceScore: lastMonthDietReport.adherenceScore ?? 0,
      avgDailyCalories: lastMonthDietReport.avgDailyCalories ?? 0,
      avgMacros: {
        protein: lastMonthDietReport.avgMacros?.protein ?? 0,
        carbs: lastMonthDietReport.avgMacros?.carbs ?? 0,
        fats: lastMonthDietReport.avgMacros?.fats ?? 0,
      },
      totalDaysLogged: lastMonthDietReport.totalDaysLogged ?? 0,
    } : undefined;

    console.log(`[DietController] Generating weekly diet plan for user ${userId}, week starting ${weekStartDate.toISOString().split('T')[0]}`);

    const generated = await dietGenerationService.generateWeeklyDietPlan(
      userId,
      weekStartDate,
      overrides,
      checkIn,
      lastMonthReport,
      undefined
    );

    const savedPlan = await dietGenerationService.saveWeeklyDietPlan(
      userId,
      weekStartDate,
      generated,
      'user-self',
      checkIn
    );

    console.log(`[DietController] Weekly diet plan generated: ${savedPlan._id}`);

    return res.status(201).json({
      ok: true,
      data: {
        dietPlan: savedPlan,
        message: 'Weekly diet plan generated successfully',
      },
    });
  } catch (error: any) {
    console.error('[DietController] Error generating weekly diet plan:', error);

    if (error.message?.includes('User profile incomplete')) {
      return res.status(400).json({
        ok: false,
        error: {
          message: error.message,
          code: 'INCOMPLETE_PROFILE',
        },
      });
    }

    if (error.message?.includes('OpenRouter')) {
      return res.status(503).json({
        ok: false,
        error: {
          message: 'AI service temporarily unavailable',
          details: error.message,
        },
      });
    }

    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to generate weekly diet plan' },
    });
  }
}

/**
 * DELETE /api/diet/:id
 * Delete a diet plan
 */
export async function deleteDietPlan(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    const dietPlan = await DietPlan.findOneAndDelete({ _id: id, userId });

    if (!dietPlan) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Diet plan not found' },
      });
    }

    return res.json({
      ok: true,
      data: { message: 'Diet plan deleted successfully' },
    });
  } catch (error) {
    console.error('[DietController] Error deleting diet plan:', error);
    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to delete diet plan' },
    });
  }
}
