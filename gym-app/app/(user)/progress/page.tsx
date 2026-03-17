'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ProgressChart from '@/components/user/ProgressChart';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';

export default function ProgressPage() {
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { stats, loading: progressLoading } = useUserProgress();
  const { getAccessToken } = useAuth();
  const [trendData, setTrendData] = useState<{ date: string; workouts: number; meals: number; value: number }[]>([]);

  const latestWorkout = workoutPlans?.[0];
  const latestDiet = dietPlans?.[0];
  const loading = workoutLoading || dietLoading || progressLoading;

  useEffect(() => {
    async function loadTrends() {
      try {
        const token = getAccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/trends?days=14`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) {
          const series = json.data.series as Array<{ date: string; workouts: number; meals: number }>;
          setTrendData(series.map(d => ({
            date: d.date.slice(5),
            workouts: d.workouts,
            meals: d.meals,
            value: d.workouts * 2 + d.meals,
          })));
        }
      } catch { /* ignore */ }
    }
    loadTrends();
  }, [getAccessToken]);

  // Big 4 stats
  const statGrid = [
    { label: 'Day Streak',    value: stats.currentStreak,    unit: 'd',   color: 'accent-green' },
    { label: 'Workouts Done', value: stats.workoutsCompleted, unit: '',    color: 'text-gray-900' },
    { label: 'Meals Logged',  value: stats.totalMealsLogged,  unit: '',    color: 'text-gray-900' },
    { label: 'Active Days',   value: stats.activeDays,        unit: 'd',   color: 'accent-blue' },
  ];

  return (
    <div className="space-y-4 pb-6">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Your stats</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Progress</h1>
      </motion.div>

      {/* ── BIG STAT GRID ── */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {statGrid.map((s) => (
          <motion.div
            key={s.label}
            variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <p className="label-cap mb-3">{s.label}</p>
            {loading ? (
              <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <div className={`stat-hero num ${s.color}`}>
                {s.value}
                {s.unit && <span className="text-2xl font-bold text-gray-300 ml-1">{s.unit}</span>}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ── TREND CHART ── full width */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ProgressChart data={trendData} />
      </motion.div>

      {/* ── CURRENT PLANS ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-50">
          <p className="label-cap mb-0.5">Active programs</p>
          <h3 className="text-lg font-black text-gray-900">Current Plans</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-xl" />
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          ) : (
            <>
              {latestWorkout && (
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="label-cap mb-0.5">Workout</p>
                    <p className="font-black text-gray-900">{latestWorkout.name}</p>
                  </div>
                  <span className="text-xs font-bold bg-black text-[#00E676] px-3 py-1.5 rounded-full">
                    {latestWorkout.days?.length || 0}d / wk
                  </span>
                </div>
              )}
              {latestDiet && (
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="label-cap mb-0.5">Nutrition</p>
                    <p className="font-black text-gray-900">{latestDiet.name || 'Diet Plan'}</p>
                  </div>
                  <span className="text-xs font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full">
                    {latestDiet.dailyCalories} kcal
                  </span>
                </div>
              )}
              {!latestWorkout && !latestDiet && (
                <div className="p-5 text-center text-gray-400 text-sm">No active plans</div>
              )}
              <div className="flex p-5 pt-3 pb-4">
                <div className="flex-1 text-center border-r border-gray-100">
                  <p className="text-2xl font-black text-gray-900 num">{stats.workoutsCompleted}</p>
                  <p className="label-cap mt-0.5">workouts</p>
                </div>
                <div className="flex-1 text-center border-r border-gray-100">
                  <p className="text-2xl font-black text-gray-900 num">{stats.totalMealsLogged}</p>
                  <p className="label-cap mt-0.5">meals</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-2xl font-black text-gray-900 num">{stats.activeDays}</p>
                  <p className="label-cap mt-0.5">active days</p>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
