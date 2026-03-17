'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ProgressChart from '@/components/user/ProgressChart';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';
import { Flame, Dumbbell, Salad, Calendar, TrendingUp } from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

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
            value: d.workouts * 2 + d.meals
          })));
        }
      } catch {
        // ignore
      }
    }
    loadTrends();
  }, [getAccessToken]);

  const statCards: StatItem[] = [
    { label: 'Day Streak', value: stats.currentStreak, icon: <Flame className="w-5 h-5" />, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Workouts Done', value: stats.workoutsCompleted, icon: <Dumbbell className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Meals Logged', value: stats.totalMealsLogged, icon: <Salad className="w-5 h-5" />, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Active Days', value: stats.activeDays, icon: <Calendar className="w-5 h-5" />, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
            <p className="text-sm text-gray-500">Your fitness journey stats</p>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
          >
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-8 bg-gray-100 rounded-lg w-12" />
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
            ) : (
              <>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.bg} ${s.color}`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{s.value}</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
              </>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Activity summary + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
          <h3 className="font-bold text-gray-900 mb-1">Current Plans</h3>
          <p className="text-xs text-gray-400 mb-4">Active workout & nutrition</p>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {latestWorkout && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-blue-500 font-semibold">Workout Plan</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{latestWorkout.name}</p>
                  </div>
                </div>
              )}
              {latestDiet && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Flame className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-orange-500 font-semibold">Daily Target</p>
                    <p className="text-sm font-semibold text-gray-800">{latestDiet.dailyCalories} kcal</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold">Last 30 Days</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {stats.workoutsCompleted} workouts · {stats.totalMealsLogged} meals
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ProgressChart data={trendData} />
        </motion.div>
      </div>
    </div>
  );
}
