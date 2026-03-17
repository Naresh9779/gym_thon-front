"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutPlans } from "@/hooks/useWorkoutPlan";
import { useDietPlan } from "@/hooks/useDietPlan";
import { useUserProgress } from "@/hooks/useUserProgress";
import { ArrowRight, Dumbbell, Salad, TrendingUp, ClipboardList, User } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { stats } = useUserProgress();

  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayDiet, setTodayDiet] = useState<any>(null);

  useEffect(() => {
    if (workoutPlans.length > 0) {
      const latest = workoutPlans[0];
      if (!latest?.startDate || !Array.isArray(latest?.days) || latest.days.length === 0) { setTodayWorkout(null); return; }
      const start = new Date(latest.startDate); start.setHours(0, 0, 0, 0);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
      if (diffDays < 0) { setTodayWorkout(null); return; }
      const d = latest.days[diffDays % latest.days.length];
      setTodayWorkout({ ...d, isRestDay: !d?.exercises?.length });
    } else setTodayWorkout(null);
  }, [workoutPlans]);

  useEffect(() => {
    if (dietPlans.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      setTodayDiet(dietPlans.find((p: any) => new Date(p.date).toISOString().slice(0, 10) === today) || dietPlans[0]);
    }
  }, [dietPlans]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  };

  const loading = workoutLoading || dietLoading;

  return (
    <div className="space-y-4 pb-6">

      {/* ── HERO CARD ── dark, large numbers */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-card p-6"
      >
        {/* Greeting */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="label-cap text-gray-500 mb-1">{greeting()}</p>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">
              {user?.name?.split(" ")[0] || "Athlete"}
            </h1>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${
            user?.subscription?.status === "active"
              ? "bg-[#00E676]/20 text-[#00E676]"
              : "bg-white/10 text-gray-400"
          }`}>
            {user?.subscription?.status || "free"}
          </span>
        </div>

        {/* Big 3 stats */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="label-cap mb-2">Streak</p>
            <p className="stat-hero accent-green num">{stats.currentStreak}<span className="text-2xl font-bold text-gray-500 ml-1">d</span></p>
          </div>
          <div>
            <p className="label-cap mb-2">Workouts</p>
            <p className="stat-hero text-white num">{loading ? "—" : stats.workoutsCompleted}</p>
          </div>
          <div>
            <p className="label-cap mb-2">Calories</p>
            <p className="stat-hero accent-orange num">{loading ? "—" : (todayDiet?.dailyCalories ?? "—")}</p>
          </div>
        </div>

        {/* Subtle divider */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {todayWorkout && !todayWorkout.isRestDay
              ? `${todayWorkout.exercises?.length || 0} exercises today`
              : todayWorkout?.isRestDay
              ? "Rest day — recover well"
              : "No plan assigned yet"}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#00E676] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            Active
          </div>
        </div>
      </motion.div>

      {/* ── TODAY CARDS ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Workout */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Link href="/today-workout" className="block group">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 group-hover:border-green-300 group-hover:shadow-md transition-all h-full">
              <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center mb-3">
                <Dumbbell className="w-4.5 h-4.5 text-[#00E676]" />
              </div>
              <p className="label-cap mb-1">Workout</p>
              {loading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
              ) : (
                <p className="text-xl font-black text-gray-900 leading-tight">
                  {todayWorkout && !todayWorkout.isRestDay
                    ? `${todayWorkout.exercises?.length || 0} exs`
                    : todayWorkout?.isRestDay
                    ? "Rest"
                    : "—"}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-green-600 uppercase tracking-wide">
                Start <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Diet */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Link href="/today-diet" className="block group">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 group-hover:border-orange-300 group-hover:shadow-md transition-all h-full">
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
                <Salad className="w-4.5 h-4.5 text-orange-500" />
              </div>
              <p className="label-cap mb-1">Nutrition</p>
              {loading ? (
                <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
              ) : (
                <p className="text-xl font-black text-gray-900 leading-tight">
                  {todayDiet?.dailyCalories ? `${todayDiet.dailyCalories}` : "—"}
                  {todayDiet?.dailyCalories && <span className="text-sm font-medium text-gray-400 ml-1">kcal</span>}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-orange-500 uppercase tracking-wide">
                Log meals <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* ── QUICK NUMBERS ROW ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 divide-x divide-gray-100 flex"
      >
        {[
          { label: "Plans", value: loading ? "—" : workoutPlans.length },
          { label: "Diet Plans", value: loading ? "—" : dietPlans.length },
          { label: "Active Days", value: loading ? "—" : stats.activeDays },
          { label: "Meals Logged", value: loading ? "—" : stats.totalMealsLogged },
        ].map((s) => (
          <div key={s.label} className="flex-1 p-3 text-center">
            <p className="text-xl font-black text-gray-900 num">{s.value}</p>
            <p className="label-cap mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── NAV SHORTCUTS ── */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
      >
        {[
          { href: "/progress", icon: TrendingUp, label: "Progress", bg: "bg-blue-50", fg: "text-blue-600" },
          { href: "/plans",    icon: ClipboardList, label: "Plans",    bg: "bg-purple-50", fg: "text-purple-600" },
          { href: "/profile",  icon: User,          label: "Profile",  bg: "bg-gray-100",  fg: "text-gray-600" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={a.href}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            >
              <Link href={a.href} className="block group">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center group-hover:shadow-sm transition-all group-hover:-translate-y-0.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${a.bg} ${a.fg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{a.label}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
