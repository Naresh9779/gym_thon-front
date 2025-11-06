import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import ProgressLog from '../models/ProgressLog';
import { z } from 'zod';

const router = Router();

// All progress routes require authentication
router.use(authenticate);

// GET /api/progress - get user's progress logs
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 30;
    
    const logs = await ProgressLog.find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    
    res.json({ ok: true, data: { items: logs, count: logs.length } });
  } catch (err) {
    console.error('[Progress] GET error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch progress' } });
  }
});

// POST /api/progress/workout - log workout completion
router.post('/workout', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      day: z.string().optional(),
      completedExercises: z.number().min(0).default(0),
      totalExercises: z.number().min(0).default(0),
      durationSec: z.number().min(0).optional(),
    });
    
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid data', details: parsed.error.errors } });
    }
    
    const { date, day, completedExercises, totalExercises, durationSec } = parsed.data;
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);
    
    // Find or create progress log for this date
    let log = await ProgressLog.findOne({ userId, date: logDate });
    
    if (!log) {
      log = new ProgressLog({
        userId,
        date: logDate,
        workout: { day, completedExercises, totalExercises, durationSec },
        meals: []
      });
    } else {
      log.workout = { day, completedExercises, totalExercises, durationSec };
    }
    
    await log.save();
    
    res.status(201).json({ ok: true, data: { log } });
  } catch (err) {
    console.error('[Progress] POST workout error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to log workout' } });
  }
});

// POST /api/progress/meal - log meal completion
router.post('/meal', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mealName: z.string(),
      calories: z.number().min(0).optional(),
      macros: z.object({
        p: z.number().min(0).optional(),
        c: z.number().min(0).optional(),
        f: z.number().min(0).optional(),
      }).optional(),
    });
    
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid data', details: parsed.error.errors } });
    }
    
    const { date, mealName, calories, macros } = parsed.data;
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);
    
    // Find or create progress log for this date
    let log = await ProgressLog.findOne({ userId, date: logDate });

    if (!log) {
      log = new ProgressLog({
        userId,
        date: logDate,
        meals: []
      });
    } else {
      // Prevent duplicate meal logging for the same meal name (case-insensitive) on the same day
      const normalized = mealName.trim().toLowerCase();
      const alreadyLogged = (log.meals || []).some(m => (m.mealName || '').trim().toLowerCase() === normalized);
      if (alreadyLogged) {
        return res.status(409).json({ ok: false, error: { message: 'Meal already logged for today', code: 'MEAL_ALREADY_LOGGED' } });
      }
    }

    // Add meal to meals array
    log.meals.push({
      mealName,
      loggedAt: new Date(),
      calories,
      macros,
    } as any);

    await log.save();

    res.status(201).json({ ok: true, data: { log } });
  } catch (err) {
    console.error('[Progress] POST meal error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to log meal' } });
  }
});

// GET /api/progress/stats - get aggregated stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const days = parseInt(req.query.days as string) || 30;
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    
    const logs = await ProgressLog.find({
      userId,
      date: { $gte: since }
    }).lean();
    
    const workoutsCompleted = logs.filter(l => l.workout && (l.workout.completedExercises || 0) > 0).length;
    const totalMealsLogged = logs.reduce((sum, l) => sum + (l.meals?.length || 0), 0);
    const activeDays = logs.filter(l => (l.workout && (l.workout.completedExercises || 0) > 0) || (l.meals && l.meals.length > 0)).length;
    
    // Calculate streak
    let streak = 0;
    const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = new Date(sortedLogs[i].date);
      logDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (logDate.getTime() === expectedDate.getTime() && 
          ((sortedLogs[i].workout && (sortedLogs[i].workout?.completedExercises || 0) > 0) || 
           (sortedLogs[i].meals && sortedLogs[i].meals.length > 0))) {
        streak++;
      } else {
        break;
      }
    }
    
    res.json({
      ok: true,
      data: {
        workoutsCompleted,
        totalMealsLogged,
        activeDays,
        currentStreak: streak,
        logs: sortedLogs
      }
    });
  } catch (err) {
    console.error('[Progress] GET stats error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch stats' } });
  }
});

// GET /api/progress/trends?days=30 - per-user daily series
router.get('/trends', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
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
        const ld = new Date(l.date); ld.setHours(0,0,0,0);
        return ld.toISOString().slice(0,10) === dateKey;
      });
      const workouts = dayLog && dayLog.workout && (dayLog.workout.completedExercises || 0) > 0 ? 1 : 0;
      const meals = dayLog?.meals?.length || 0;
      const active = (workouts > 0 || meals > 0) ? 1 : 0;
      series.push({ date: dateKey, workouts, meals, active });
    }

    return res.json({ ok: true, data: { series } });
  } catch (err) {
    console.error('[Progress] trends error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch progress trends' } });
  }
});

export default router;
