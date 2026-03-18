'use client';

import { motion } from 'framer-motion';
import MealCard from '@/components/user/MealCard';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useUserProgress } from '@/hooks/useUserProgress';

export default function TodayDietPage() {
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { logs, logMeal, loading: progressLoading } = useUserProgress();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Find active weekly plan whose date range contains today
  const weeklyPlan = dietPlans.find((p: any) => {
    if (!p.weekStartDate) return false;
    const start = new Date(p.weekStartDate);
    const end = new Date(p.weekEndDate || p.weekStartDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end;
  }) || dietPlans[0]; // fallback to latest

  // Find today's day entry within the weekly plan
  const todayDayEntry = weeklyPlan?.days?.find((d: any) =>
    d.date && new Date(d.date).toISOString().slice(0, 10) === todayStr
  );

  const meals = todayDayEntry?.meals || weeklyPlan?.meals || [];
  const totalCalories = todayDayEntry?.totalCalories ?? weeklyPlan?.avgDailyCalories ?? weeklyPlan?.dailyCalories ?? 0;

  const todayLog = logs.find((log: any) => new Date(log.date).toISOString().slice(0, 10) === todayStr);
  const loggedCalories = todayLog?.meals?.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) ?? 0;
  const remaining = Math.max(0, totalCalories - loggedCalories);
  const pct = totalCalories > 0 ? Math.min(Math.round((loggedCalories / totalCalories) * 100), 100) : 0;

  const loading = dietLoading || progressLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Today</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Nutrition</h1>
        {weeklyPlan?.weekStartDate && (
          <p className="text-xs text-gray-400 mt-0.5">
            Week of {new Date(weeklyPlan.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {weeklyPlan.weekEndDate && ` – ${new Date(weeklyPlan.weekEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </p>
        )}
      </motion.div>

      {/* ── CALORIE HERO ── */}
      {totalCalories > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hero-card p-6"
        >
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="label-cap text-gray-500 mb-2">Remaining</p>
              <div className="stat-hero accent-orange num">
                {remaining}
                <span className="text-xl font-bold text-gray-600 ml-1.5">kcal</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div>
                <span className="text-2xl font-black text-white num">{loggedCalories}</span>
                <span className="text-xs text-gray-500 ml-1">eaten</span>
              </div>
              <div>
                <span className="text-2xl font-black text-gray-500 num">{totalCalories}</span>
                <span className="text-xs text-gray-600 ml-1">goal</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full bg-orange-400"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-gray-500 font-medium">{pct}% of daily goal consumed</p>
        </motion.div>
      )}

      {/* ── MEALS ── */}
      {meals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
        >
          <p className="text-2xl font-black text-gray-900 mb-2">No Diet Plan</p>
          <p className="text-gray-400 text-sm">Ask your trainer to create a nutrition plan.</p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {meals.map((meal: any, index: number) => (
            <motion.div
              key={index}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            >
              <MealCard
                mealName={meal.name}
                time={meal.time}
                calories={meal.totalCalories ?? meal.calories}
                foods={meal.foods}
                macros={meal.macros}
                logs={logs}
                logMeal={logMeal}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
