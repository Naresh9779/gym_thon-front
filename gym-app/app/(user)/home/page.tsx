"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutPlans } from "@/hooks/useWorkoutPlan";
import { useDietPlan } from "@/hooks/useDietPlan";
import { Dumbbell, Salad, TrendingUp, ClipboardList, User, ChevronRight, Zap, Flame } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const statsLoading = workoutLoading || dietLoading;

  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayDiet, setTodayDiet] = useState<any>(null);

  useEffect(() => {
    if (workoutPlans.length > 0) {
      const latest = workoutPlans[0];
      if (!latest?.startDate || !Array.isArray(latest?.days) || latest.days.length === 0) {
        setTodayWorkout(null);
        return;
      }
      const start = new Date(latest.startDate);
      start.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) { setTodayWorkout(null); return; }
      const todayDay = latest.days[diffDays % latest.days.length];
      setTodayWorkout({ ...todayDay, isRestDay: !todayDay?.exercises || todayDay.exercises.length === 0 });
    } else {
      setTodayWorkout(null);
    }
  }, [workoutPlans]);

  useEffect(() => {
    if (dietPlans.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      setTodayDiet(
        dietPlans.find((p: any) => new Date(p.date).toISOString().slice(0, 10) === today) || dietPlans[0]
      );
    }
  }, [dietPlans]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = [
    { label: 'Plans', value: statsLoading ? '—' : `${workoutPlans.length}`, icon: <Dumbbell className="w-4 h-4" />, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Diet Plans', value: statsLoading ? '—' : `${dietPlans.length}`, icon: <Salad className="w-4 h-4" />, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Calories', value: statsLoading ? '—' : (todayDiet?.dailyCalories ? `${todayDiet.dailyCalories}` : '—'), icon: <Flame className="w-4 h-4" />, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Weight', value: user?.profile?.weight ? `${user.profile.weight}kg` : '—', icon: <Zap className="w-4 h-4" />, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 font-medium">{greeting()},</p>
            <h1 className="text-2xl font-extrabold text-gray-900">{user?.name || 'User'} 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {todayWorkout && !todayWorkout.isRestDay
                ? "Let's crush today's workout!"
                : todayWorkout?.isRestDay
                ? "Rest day — recovery matters!"
                : "Ready to get started!"}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
            user?.subscription?.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {user?.subscription?.status?.toUpperCase() || 'FREE'}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-4 gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm text-center"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2 ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-lg font-extrabold text-gray-900 tabular-nums leading-none">{s.value}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Today cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Link href="/today-workout" className="block group">
            <div className="bg-white rounded-2xl border-2 border-gray-100 group-hover:border-green-300 p-5 shadow-sm group-hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                    <Dumbbell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Today's Workout</h3>
                    <p className="text-xs text-gray-400">
                      {todayWorkout && !todayWorkout.isRestDay
                        ? todayWorkout.day || 'Training day'
                        : todayWorkout?.isRestDay
                        ? 'Rest & Recovery'
                        : 'No workout'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-400 transition-colors" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                {todayWorkout && !todayWorkout.isRestDay ? (
                  <>
                    <span className="text-sm text-gray-500">{todayWorkout.exercises?.length || 0} exercises</span>
                    <span className="text-xs font-semibold text-green-600">Start →</span>
                  </>
                ) : todayWorkout?.isRestDay ? (
                  <span className="text-sm text-gray-400">😴 Rest day</span>
                ) : (
                  <span className="text-sm text-gray-400">No plan assigned</span>
                )}
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Link href="/today-diet" className="block group">
            <div className="bg-white rounded-2xl border-2 border-gray-100 group-hover:border-orange-300 p-5 shadow-sm group-hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Salad className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Today's Diet</h3>
                    <p className="text-xs text-gray-400">
                      {todayDiet ? `${todayDiet.dailyCalories || 0} kcal target` : 'No diet plan'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-400 transition-colors" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                {todayDiet?.meals?.length > 0 ? (
                  <>
                    <span className="text-sm text-gray-500">{todayDiet.meals.length} meals planned</span>
                    <span className="text-xs font-semibold text-orange-500">Log meals →</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">No meals planned</span>
                )}
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
      >
        {[
          { href: '/progress', icon: TrendingUp, label: 'Progress', sub: 'Track journey', color: 'bg-blue-50 text-blue-500' },
          { href: '/plans', icon: ClipboardList, label: 'My Plans', sub: 'View programs', color: 'bg-purple-50 text-purple-500' },
          { href: '/profile', icon: User, label: 'Profile', sub: 'Settings', color: 'bg-gray-50 text-gray-500' },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={a.href}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            >
              <Link href={a.href} className="block group">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-0.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${a.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{a.label}</p>
                  <p className="text-xs text-gray-400">{a.sub}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
