import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import ProgressLog from '../models/ProgressLog';
import DietPlan from '../models/DietPlan';
import WorkoutPlan from '../models/WorkoutPlan';
import MonthlyDietReport from '../models/MonthlyDietReport';
import MonthlyWorkoutReport from '../models/MonthlyWorkoutReport';
import { getApprovedLeaveDatesForMonth, getGymHolidayDatesForMonth } from '../utils/schemas';

const router = Router();

// All report routes require authentication
router.use(authenticate);

// GET /api/reports/diet/monthly/:year/:month - get or generate monthly diet report
router.get('/diet/monthly/:year/:month', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid year or month' } });
    }
    
    // Check if report exists
    let report = await MonthlyDietReport.findOne({ userId, year, month });
    
    // If not, generate it
    if (!report) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      
      // Get all diet plans for this month
      const dietPlans = await DietPlan.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Get all progress logs for this month
      const progressLogs = await ProgressLog.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      // Fetch approved leave dates for this month
      const leaveDatesSet = await getApprovedLeaveDatesForMonth(userId, year, month);
      const leaveDaysCount = leaveDatesSet.size;
      const holidayDatesSet = await getGymHolidayDatesForMonth(year, month);
      const offDatesSet = new Set([...leaveDatesSet, ...holidayDatesSet]);

      // Exclude leave days and gym holidays from adherence calculations
      const activeLogs = progressLogs.filter(l => {
        const dateStr = new Date(l.date).toISOString().slice(0, 10);
        return !offDatesSet.has(dateStr);
      });

      // Calculate stats (excluding leave days)
      const totalDaysLogged = activeLogs.filter(l => l.meals && l.meals.length > 0).length;
      const totalCalories = activeLogs.reduce((sum, log) => {
        return sum + (log.meals?.reduce((mealSum, meal) => mealSum + (meal.calories || 0), 0) || 0);
      }, 0);

      const totalProtein = activeLogs.reduce((sum, log) => {
        return sum + (log.meals?.reduce((mealSum, meal) => mealSum + (meal.macros?.p || 0), 0) || 0);
      }, 0);

      const totalCarbs = activeLogs.reduce((sum, log) => {
        return sum + (log.meals?.reduce((mealSum, meal) => mealSum + (meal.macros?.c || 0), 0) || 0);
      }, 0);

      const totalFats = activeLogs.reduce((sum, log) => {
        return sum + (log.meals?.reduce((mealSum, meal) => mealSum + (meal.macros?.f || 0), 0) || 0);
      }, 0);

      const avgDailyCalories = totalDaysLogged > 0 ? Math.round(totalCalories / totalDaysLogged) : 0;
      const avgProtein = totalDaysLogged > 0 ? Math.round(totalProtein / totalDaysLogged) : 0;
      const avgCarbs = totalDaysLogged > 0 ? Math.round(totalCarbs / totalDaysLogged) : 0;
      const avgFats = totalDaysLogged > 0 ? Math.round(totalFats / totalDaysLogged) : 0;

      // Calculate adherence (compared to diet plans)
      const totalPlannedCalories = dietPlans.reduce((sum, plan) => sum + ((plan as any).avgDailyCalories || (plan as any).dailyCalories || 0), 0);
      const avgPlannedCalories = dietPlans.length > 0 ? totalPlannedCalories / dietPlans.length : 0;
      const adherenceScore = avgPlannedCalories > 0 ? Math.min(100, Math.round((avgDailyCalories / avgPlannedCalories) * 100)) : 0;

      report = new MonthlyDietReport({
        userId,
        year,
        month,
        dailyPlans: dietPlans.map(p => p._id),
        dailyProgress: progressLogs.map(l => l._id),
        adherenceScore,
        avgDailyCalories,
        avgMacros: {
          protein: avgProtein,
          carbs: avgCarbs,
          fats: avgFats
        },
        totalDaysLogged,
        leaveDaysCount,
        leaveDates: Array.from(leaveDatesSet),
        generatedAt: new Date()
      });
      
      await report.save();
    }
    
    res.json({ ok: true, data: { report } });
  } catch (err) {
    console.error('[Reports] Diet monthly error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to generate diet report' } });
  }
});

// GET /api/reports/workout/monthly/:year/:month - get or generate monthly workout report
router.get('/workout/monthly/:year/:month', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ ok: false, error: { message: 'Invalid year or month' } });
    }
    
    // Check if report exists
    let report = await MonthlyWorkoutReport.findOne({ userId, year, month });
    
    // If not, generate it
    if (!report) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      
      // Get all workout plans active in this month
      const workoutPlans = await WorkoutPlan.find({
        userId,
        $or: [
          { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
          { startDate: { $gte: startDate, $lte: endDate } }
        ]
      }).lean();
      
      // Get all progress logs for this month
      const progressLogs = await ProgressLog.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      // Fetch approved leave dates for this month
      const leaveDatesSetWorkout = await getApprovedLeaveDatesForMonth(userId, year, month);
      const leaveDaysCountWorkout = leaveDatesSetWorkout.size;
      const holidayDatesSetWorkout = await getGymHolidayDatesForMonth(year, month);
      const offDatesSetWorkout = new Set([...leaveDatesSetWorkout, ...holidayDatesSetWorkout]);

      // Exclude leave days and gym holidays from adherence
      const activeLogsWorkout = progressLogs.filter(l => {
        const dateStr = new Date(l.date).toISOString().slice(0, 10);
        return !offDatesSetWorkout.has(dateStr);
      });

      // Calculate stats (excluding leave days)
      const completedWorkouts = activeLogsWorkout.filter(l => l.workout && (l.workout.completedExercises || 0) > 0).length;
      const totalWorkoutDays = activeLogsWorkout.filter(l => l.workout).length;

      const totalDuration = activeLogsWorkout.reduce((sum, log) => {
        return sum + (log.workout?.durationSec || 0);
      }, 0);

      const avgDuration = completedWorkouts > 0 ? Math.round(totalDuration / completedWorkouts) : 0;

      // Calculate adherence based on planned workouts (subtract leave days from expected)
      let expectedWorkouts = 0;
      if (workoutPlans.length > 0) {
        const plan = workoutPlans[0];
        const daysInMonth = new Date(year, month, 0).getDate();
        const weeksInMonth = daysInMonth / 7;
        const workoutDaysPerWeek = plan.days?.filter((d: any) => !d.isRestDay).length || 0;
        const rawExpected = Math.round(workoutDaysPerWeek * weeksInMonth);
        // Rough deduction: leave days proportionally reduce expected workouts
        const leaveFraction = leaveDaysCountWorkout / daysInMonth;
        expectedWorkouts = Math.max(0, Math.round(rawExpected * (1 - leaveFraction)));
      }

      const adherenceScore = expectedWorkouts > 0 ? Math.min(100, Math.round((completedWorkouts / expectedWorkouts) * 100)) : 0;

      report = new MonthlyWorkoutReport({
        userId,
        year,
        month,
        workoutPlanId: workoutPlans.length > 0 ? workoutPlans[0]._id : undefined,
        completedWorkouts,
        totalWorkouts: expectedWorkouts || totalWorkoutDays,
        adherenceScore,
        avgDuration,
        leaveDaysCount: leaveDaysCountWorkout,
        leaveDates: Array.from(leaveDatesSetWorkout),
        strengthGains: { exercises: [] },
        generatedAt: new Date()
      });
      
      await report.save();
    }
    
    res.json({ ok: true, data: { report } });
  } catch (err) {
    console.error('[Reports] Workout monthly error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to generate workout report' } });
  }
});

// POST /api/reports/generate - manually trigger report generation for current month
router.post('/generate', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Delete existing reports for this month to force regeneration
    await MonthlyDietReport.deleteOne({ userId, year, month });
    await MonthlyWorkoutReport.deleteOne({ userId, year, month });
    
    res.json({ ok: true, data: { message: 'Reports will be regenerated on next request', year, month } });
  } catch (err) {
    console.error('[Reports] Generate error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to trigger report generation' } });
  }
});

export default router;
