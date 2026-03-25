import { Router } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import WorkoutPlan from '../models/WorkoutPlan';
import DietPlan from '../models/DietPlan';
import ProgressLog from '../models/ProgressLog';
import PlanRequest from '../models/PlanRequest';
import MonthlyWorkoutReport from '../models/MonthlyWorkoutReport';
import MonthlyDietReport from '../models/MonthlyDietReport';
import LeaveRequest from '../models/LeaveRequest';
import Payment from '../models/Payment';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Subscription from '../models/Subscription';

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

// GET /api/analytics/summary - comprehensive monthly summary for admin analytics page
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();

    // ── Trend window: ?from=YYYY-MM-DD&to=YYYY-MM-DD  OR  ?days=N ──
    let trendStart: Date;
    let trendEnd: Date = new Date(now);
    let trendDays: number;

    const fromParam = req.query.from as string | undefined;
    const toParam   = req.query.to   as string | undefined;

    if (fromParam && toParam) {
      trendStart = new Date(fromParam); trendStart.setHours(0, 0, 0, 0);
      trendEnd   = new Date(toParam);   trendEnd.setHours(23, 59, 59, 999);
      trendDays  = Math.ceil((trendEnd.getTime() - trendStart.getTime()) / 86400000) + 1;
    } else {
      trendDays  = Math.min(parseInt(String(req.query.days || '30')) || 30, 365);
      trendStart = new Date(now); trendStart.setDate(now.getDate() - (trendDays - 1)); trendStart.setHours(0, 0, 0, 0);
    }

    // Current month boundaries
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Fixed windows for operational metrics (independent of trend filter)
    const day14Ago = new Date(now); day14Ago.setDate(now.getDate() - 14); day14Ago.setHours(0, 0, 0, 0);
    const day28Ago = new Date(now); day28Ago.setDate(now.getDate() - 28); day28Ago.setHours(0, 0, 0, 0);
    const day30Ago = new Date(now); day30Ago.setDate(now.getDate() - 30);
    const day60Ago = new Date(now); day60Ago.setDate(now.getDate() - 60);
    const day90Ago = new Date(now); day90Ago.setDate(now.getDate() - 90);
    const dow90Ago = new Date(now); dow90Ago.setDate(now.getDate() - 89); dow90Ago.setHours(0, 0, 0, 0);

    // ── Pre-fetch active subscriber userIds for cohort retention queries ──
    const activeSubUserIds = await Subscription.distinct('userId', {
      status: { $in: ['active', 'trial'] },
      endDate: { $gt: now },
    });

    // ── Main subscription + plan counts ──
    const [
      totalUsers, activeUsers, expiredUsers, trialUsers,
      newThisMonth, newLastMonth,
      activeThisMonth, expiredThisMonth,
      workoutPlansThisMonth, dietPlansThisMonth,
      pendingRequests, generatedRequests, approvedLeavesThisMonth,
      // Retention cohorts (of members who joined N+ days ago, how many are still active)
      cohort30, retained30,
      cohort60, retained60,
      cohort90, retained90,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Subscription.countDocuments({ status: 'active',  endDate: { $gt: now } }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'trial',   endDate: { $gt: now } }),
      User.countDocuments({ createdAt: { $gte: thisMonthStart }, role: 'user' }),
      User.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, role: 'user' }),
      Subscription.countDocuments({ status: 'active',  startDate: { $gte: thisMonthStart } }),
      Subscription.countDocuments({ status: 'expired', endDate:   { $gte: thisMonthStart } }),
      WorkoutPlan.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      DietPlan.countDocuments({    createdAt: { $gte: thisMonthStart } }),
      PlanRequest.countDocuments({ status: 'pending' }),
      PlanRequest.countDocuments({ status: 'generated', generatedAt: { $gte: thisMonthStart } }),
      LeaveRequest.countDocuments({ status: 'approved', updatedAt: { $gte: thisMonthStart } }),
      User.countDocuments({ createdAt: { $lte: day30Ago }, role: 'user' }),
      User.countDocuments({ createdAt: { $lte: day30Ago }, _id: { $in: activeSubUserIds } }),
      User.countDocuments({ createdAt: { $lte: day60Ago }, role: 'user' }),
      User.countDocuments({ createdAt: { $lte: day60Ago }, _id: { $in: activeSubUserIds } }),
      User.countDocuments({ createdAt: { $lte: day90Ago }, role: 'user' }),
      User.countDocuments({ createdAt: { $lte: day90Ago }, _id: { $in: activeSubUserIds } }),
    ]);

    // Left gym this month (manually or auto-marked)
    const leftThisMonth = await User.countDocuments({
      gymStatus: 'left',
      leftAt: { $gte: thisMonthStart },
    });
    const totalLeftMembers = await User.countDocuments({ gymStatus: 'left' });

    // Expiring in next 7 days
    const in7 = new Date(now); in7.setDate(now.getDate() + 7);
    const expiringSoon = await Subscription.countDocuments({
      endDate: { $gte: now, $lte: in7 },
      status:  { $in: ['active', 'trial'] },
    });

    // ── Trend: registration + activity per day ──
    const regAgg = await User.aggregate([
      { $match: { createdAt: { $gte: trendStart, $lte: trendEnd } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const regMap: Record<string, number> = {};
    regAgg.forEach((r: any) => { regMap[r._id] = r.count; });

    const registrationTrend: { date: string; count: number }[] = [];
    for (let i = 0; i < trendDays; i++) {
      const d = new Date(trendStart); d.setDate(trendStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      registrationTrend.push({ date: key, count: regMap[key] || 0 });
    }

    const logs = await ProgressLog.find({ date: { $gte: trendStart, $lte: trendEnd } }).select('date userId workout meals').lean();
    const actMap: Record<string, Set<string>> = {};
    for (const l of logs) {
      const key = new Date(l.date).toISOString().slice(0, 10);
      if (!actMap[key]) actMap[key] = new Set();
      const active = (l.workout && (l.workout.completedExercises || 0) > 0) || ((l.meals?.length || 0) > 0);
      if (active) actMap[key].add(String((l as any).userId));
    }
    const activityTrend = registrationTrend.map(r => ({ date: r.date, activeUsers: actMap[r.date]?.size || 0, newUsers: r.count }));

    // ── Day-of-week activity pattern (fixed: last 90 days) ──
    const dowAgg = await ProgressLog.aggregate([
      { $match: { date: { $gte: dow90Ago } } },
      { $group: { _id: { $dayOfWeek: '$date' }, count: { $sum: 1 } } }, // 1=Sun … 7=Sat
    ]);
    const dowMap: Record<number, number> = {};
    dowAgg.forEach((d: any) => { dowMap[d._id] = d.count; });
    const dayOfWeekPattern = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({
      day,
      count: dowMap[i + 1] || 0,
    }));

    // ── Retention rates ──
    const retention = {
      day30: cohort30 > 0 ? Math.round((retained30 / cohort30) * 100) : null,
      day60: cohort60 > 0 ? Math.round((retained60 / cohort60) * 100) : null,
      day90: cohort90 > 0 ? Math.round((retained90 / cohort90) * 100) : null,
    };

    // ── At-risk members: active in prior 14d but dropped >50% in recent 14d ──
    const [recentLogs, priorLogs] = await Promise.all([
      ProgressLog.aggregate([
        { $match: { date: { $gte: day14Ago } } },
        { $group: { _id: '$userId', days: { $sum: 1 } } },
      ]),
      ProgressLog.aggregate([
        { $match: { date: { $gte: day28Ago, $lt: day14Ago } } },
        { $group: { _id: '$userId', days: { $sum: 1 } } },
      ]),
    ]);
    const recentMap: Record<string, number> = {};
    recentLogs.forEach((r: any) => { recentMap[String(r._id)] = r.days; });

    const atRiskIds: string[] = [];
    for (const p of priorLogs) {
      if (p.days < 3) continue; // skip rarely-active users
      const recent = recentMap[String(p._id)] || 0;
      if (recent < p.days * 0.5) atRiskIds.push(String(p._id));
    }
    const atRiskUsers = atRiskIds.length > 0
      ? await User.find({ _id: { $in: atRiskIds.slice(0, 8) } }).select('name email').lean()
      : [];
    const atRisk = atRiskUsers.map((u: any) => ({
      _id: u._id,
      name: u.name,
      recentDays: recentMap[String(u._id)] || 0,
      prevDays: priorLogs.find((p: any) => String(p._id) === String(u._id))?.days || 0,
    }));

    // ── Plan distribution: active subscribers per plan ──
    const planDistAgg = await Subscription.aggregate([
      { $match: { planName: { $exists: true, $ne: null }, status: { $in: ['active', 'trial'] }, endDate: { $gt: now } } },
      { $group: { _id: '$planName', count: { $sum: 1 } } },
    ]);
    const allPlans = await SubscriptionPlan.find().select('name color').lean();
    const planColorMap: Record<string, string> = {};
    for (const p of allPlans) planColorMap[(p as any).name] = (p as any).color || '#6366f1';
    const planDistribution = planDistAgg.map((p: any) => ({
      name:  p._id,
      value: p.count,
      color: planColorMap[p._id] || '#6B7280',
    }));

    // ── Payment stats: received vs pending ──
    const [receivedThisMonth, pendingAll, totalReceivedAmount, totalPendingAmount] = await Promise.all([
      Payment.countDocuments({ paymentStatus: 'received', paidAt: { $gte: thisMonthStart } }),
      Payment.countDocuments({ paymentStatus: 'pending' }),
      Payment.aggregate([{ $match: { paymentStatus: 'received', paidAt: { $gte: thisMonthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { paymentStatus: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    const paymentStats = {
      receivedThisMonth,
      pendingCount: pendingAll,
      revenueThisMonth: totalReceivedAmount[0]?.total || 0,
      pendingAmount:    totalPendingAmount[0]?.total || 0,
    };

    return res.json({
      ok: true,
      data: {
        membership: { totalUsers, activeUsers, expiredUsers, trialUsers, expiringSoon, leftMembers: totalLeftMembers },
        thisMonth: { newUsers: newThisMonth, activatedSubs: activeThisMonth, expiredSubs: expiredThisMonth, workoutPlans: workoutPlansThisMonth, dietPlans: dietPlansThisMonth, planRequestsPending: pendingRequests, planRequestsDone: generatedRequests, approvedLeaves: approvedLeavesThisMonth, leftMembers: leftThisMonth },
        lastMonth: { newUsers: newLastMonth },
        activityTrend,
        dayOfWeekPattern,
        retention,
        atRisk,
        planDistribution,
        paymentStats,
      },
    });
  } catch (err) {
    console.error('[Analytics] summary error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to compute summary' } });
  }
});

export default router;
