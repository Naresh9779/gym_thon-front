import { Router } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import WorkoutPlan from '../models/WorkoutPlan';
import DietPlan from '../models/DietPlan';
import ProgressLog from '../models/ProgressLog';

const router = Router();

// All analytics endpoints require admin privileges
router.use(authenticate, requireAdmin);

// GET /api/analytics/overview - platform-wide KPIs
router.get('/overview', async (_req, res) => {
  try {
    const [usersCount, workoutPlansCount, dietPlansCount] = await Promise.all([
      User.countDocuments(),
      WorkoutPlan.countDocuments(),
      DietPlan.countDocuments(),
    ]);

    // Active users = users with any progress in last 7 days
    const since7 = new Date();
    since7.setDate(since7.getDate() - 7);
    since7.setHours(0, 0, 0, 0);

    const activeUsersAgg = await ProgressLog.aggregate([
      { $match: { date: { $gte: since7 } } },
      { $group: { _id: '$userId' } },
      { $count: 'active' },
    ]);
    const activeUsers7d = activeUsersAgg?.[0]?.active || 0;

    // Last 30 days totals
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    since30.setHours(0, 0, 0, 0);

    const logs30 = await ProgressLog.find({ date: { $gte: since30 } }).lean();
    const workoutsThis30d = logs30.filter(l => l.workout && (l.workout.completedExercises || 0) > 0).length;
    const mealsThis30d = logs30.reduce((s, l) => s + (l.meals?.length || 0), 0);

    // Adherence: average active days per user over 30 days as %
    const byUser: Record<string, number> = {};
    for (const l of logs30) {
      const active = (l.workout && (l.workout.completedExercises || 0) > 0) || (l.meals && l.meals.length > 0);
      if (active) byUser[String(l.userId)] = (byUser[String(l.userId)] || 0) + 1;
    }
    const userIds = Object.keys(byUser);
    const adherenceAvg30d = userIds.length
      ? Math.round((userIds.reduce((a, u) => a + (byUser[u] / 30), 0) / userIds.length) * 100)
      : 0;

    return res.json({
      ok: true,
      data: {
        usersCount,
        workoutPlansCount,
        dietPlansCount,
        activeUsers7d,
        workoutsThis30d,
        mealsThis30d,
        adherenceAvg30d,
      },
    });
  } catch (err) {
    console.error('[Analytics] overview error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to compute overview analytics' } });
  }
});

// GET /api/analytics/user/:id - per-user analytics (last 30 days)
router.get('/user/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params as { id: string };
    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);

    const [logs, workoutPlansCount, dietPlansCount] = await Promise.all([
      ProgressLog.find({ userId: id, date: { $gte: since } }).lean(),
      WorkoutPlan.countDocuments({ userId: id }),
      DietPlan.countDocuments({ userId: id }),
    ]);

    const workoutsCompleted = logs.filter(l => l.workout && (l.workout.completedExercises || 0) > 0).length;
    const totalMealsLogged = logs.reduce((s, l) => s + (l.meals?.length || 0), 0);
    const activeDays = logs.filter(l => (l.workout && (l.workout.completedExercises || 0) > 0) || (l.meals && l.meals.length > 0)).length;

    // streak from today backwards
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byDate: Record<string, boolean> = {};
    for (const l of logs) {
      const d = new Date(l.date);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const active = (l.workout && (l.workout.completedExercises || 0) > 0) || (l.meals && l.meals.length > 0);
      if (active) byDate[key] = true;
    }
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (byDate[key]) currentStreak++; else break;
    }

    return res.json({
      ok: true,
      data: {
        workoutsCompleted,
        totalMealsLogged,
        activeDays,
        currentStreak,
        workoutPlansCount,
        dietPlansCount,
      },
    });
  } catch (err) {
    console.error('[Analytics] user analytics error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to compute user analytics' } });
  }
});

// GET /api/analytics/trends?days=30 - platform trends per day
router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(String(req.query.days || '30')) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const logs = await ProgressLog.find({ date: { $gte: since } }).lean();
    const map: Record<string, { date: string; workouts: number; meals: number; activeUsers: Set<string> } > = {} as any;

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { date: key, workouts: 0, meals: 0, activeUsers: new Set<string>() };
    }

    for (const l of logs) {
      const d = new Date(l.date);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      if (!map[key]) continue;
      if (l.workout && (l.workout.completedExercises || 0) > 0) map[key].workouts += 1;
      map[key].meals += (l.meals?.length || 0);
      const uid = String((l as any).userId);
      map[key].activeUsers.add(uid);
    }

    const series = Object.values(map).map(v => ({ date: v.date, workouts: v.workouts, meals: v.meals, activeUsers: v.activeUsers.size }));
    return res.json({ ok: true, data: { series } });
  } catch (err) {
    console.error('[Analytics] trends error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to compute trends' } });
  }
});

export default router;
