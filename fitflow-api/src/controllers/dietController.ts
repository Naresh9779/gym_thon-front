import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import DietPlan from '../models/DietPlan';
import { dietGenerationService } from '../services/dietGenerationService';

// Validation schemas
const generateDietSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  previousDayProgressId: z.string().optional(),
});

const generateDailySchema = z.object({
  previousDayProgressId: z.string().optional(),
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

    // Build query
    const query: any = { userId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    // Fetch diet plans
    const dietPlans = await DietPlan.find(query)
      .sort({ date: -1 })
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
 * Generate a diet plan for a specific date using AI
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

    // Check if diet plan already exists for this date
    const existingPlan = await DietPlan.findOne({
      userId,
      date: targetDate,
    });

    if (existingPlan) {
      return res.status(409).json({
        ok: false,
        error: {
          message: 'Diet plan already exists for this date',
          existingPlanId: existingPlan._id,
        },
      });
    }

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

    // Handle specific errors
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
 * Generate diet plan for today (used by cron job)
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

    // Validate request body
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

    // Use today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if diet plan already exists for today
    const existingPlan = await DietPlan.findOne({
      userId,
      date: today,
    });

    if (existingPlan) {
      return res.json({
        ok: true,
        data: {
          dietPlan: existingPlan,
          message: 'Diet plan already exists for today',
          alreadyExists: true,
        },
      });
    }

    console.log(`[DietController] Generating daily diet plan for user ${userId}...`);

    // Generate diet plan using AI
    const generatedPlan = await dietGenerationService.generateDietPlan(
      userId,
      today,
      previousDayProgressId
    );

    // Save to database with 'auto-daily' flag
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

    // Handle specific errors
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
