"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutPlans } from "@/hooks/useWorkoutPlan";
import { useDietPlan } from "@/hooks/useDietPlan";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/useToast";
import CheckInModal, { CheckInData } from "@/components/shared/CheckInModal";
import { ArrowRight, Dumbbell, Salad, TrendingUp, ClipboardList, User, AlertTriangle, Sparkles, RefreshCw, CheckCircle2, CalendarOff, Megaphone } from "lucide-react";

export default function UserDashboard() {
  const { user, getAccessToken } = useAuth();
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { stats } = useUserProgress();
  const toast = useToast();

  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayDiet, setTodayDiet] = useState<any>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [planStatus, setPlanStatus] = useState<any>(null);
  const [gymInfo, setGymInfo] = useState<{
    isHoliday: boolean;
    holiday?: { reason: string };
    announcements: any[];
  } | null>(null);

  useEffect(() => {
    if (workoutPlans.length > 0) {
      const latest = workoutPlans[0];
      if (!latest?.startDate || !Array.isArray(latest?.days) || latest.days.length === 0) { setTodayWorkout(null); return; }
      const days = latest.days;
      const token = getAccessToken();
      if (!token) { setTodayWorkout(null); return; }
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      fetch(`${base}/api/workouts/active-day`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(j => {
          const idx = j.ok ? j.data.dayIndex : (() => {
            const s = new Date(latest.startDate); s.setHours(0,0,0,0);
            const n = new Date(); n.setHours(0,0,0,0);
            const diff = Math.floor((n.getTime()-s.getTime())/86400000);
            return diff >= 0 ? diff % days.length : 0;
          })();
          const d = days[idx];
          setTodayWorkout({ ...d, isRestDay: !d?.exercises?.length });
        })
        .catch(() => {
          const s = new Date(latest.startDate); s.setHours(0,0,0,0);
          const n = new Date(); n.setHours(0,0,0,0);
          const diffDays = Math.floor((n.getTime() - s.getTime()) / 86400000);
          if (diffDays < 0) { setTodayWorkout(null); return; }
          const d = days[diffDays % days.length];
          setTodayWorkout({ ...d, isRestDay: !d?.exercises?.length });
        });
    } else setTodayWorkout(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutPlans]);

  useEffect(() => {
    if (dietPlans.length > 0) {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      // First try to find weekly plan containing today
      const weeklyPlan = dietPlans.find((p: any) => {
        if (!p.weekStartDate) return false;
        const start = new Date(p.weekStartDate);
        const end = new Date(p.weekEndDate || p.weekStartDate);
        start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
      }) || dietPlans[0];

      // Find today's day entry
      const todayDayEntry = weeklyPlan?.days?.find((d: any) =>
        d.date && new Date(d.date).toISOString().slice(0, 10) === todayStr
      );

      setTodayDiet({
        ...weeklyPlan,
        _todayCalories: todayDayEntry?.totalCalories ?? weeklyPlan?.avgDailyCalories ?? weeklyPlan?.dailyCalories ?? 0,
      });
    } else {
      setTodayDiet(null);
    }
  }, [dietPlans]);

  // Fetch plan status from backend (single truth source)
  useEffect(() => {
    const fetchStatus = async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.ok) setPlanStatus(json.data);
      } catch { /* silent */ }

    };
    fetchStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch gym info (holidays + announcements)
  useEffect(() => {
    const token = getAccessToken();
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!token) return;
    fetch(`${base}/api/gym/today`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => { if (j.ok) setGymInfo(j.data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  };

  const loading = workoutLoading || dietLoading;

  // Subscription expiry warning
  const subDaysLeft = (() => {
    const end = user?.subscription?.endDate;
    if (!end) return null;
    const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
    return diff;
  })();
  const showExpiryBanner = subDaysLeft !== null && subDaysLeft >= 0 && subDaysLeft <= 7;
  const subExpired = subDaysLeft !== null && subDaysLeft < 0;

  // Use backend plan status as single truth source
  const canCheckIn = planStatus?.canCheckIn ?? false;
  const hasPendingRequest = !!planStatus?.pendingRequest;
  const workoutPlanDaysLeft: number | null = planStatus?.workoutDaysLeft ?? null;
  const workoutNeedsRenewal: boolean = planStatus?.workoutNeedsRenewal ?? false;
  const dietNeedsRenewal: boolean = planStatus?.dietNeedsRenewal ?? false;

  const hasReadyRequest = !!planStatus?.readyRequest;

  const handleMarkNotified = async () => {
    try {
      const token = getAccessToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans/mark-notified`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlanStatus((s: any) => s ? { ...s, readyRequest: null } : s);
    } catch { /* silent */ }
  };

  const showMissingPlansBanner = !loading && planStatus && canCheckIn && !hasPendingRequest &&
    (workoutNeedsRenewal || dietNeedsRenewal) &&
    (workoutPlanDaysLeft === null || workoutPlanDaysLeft < 0 || !planStatus?.workoutEndDate);
  const showExpiringPlansBanner = !loading && planStatus && canCheckIn && !hasPendingRequest &&
    workoutPlanDaysLeft !== null && workoutPlanDaysLeft >= 0 && workoutPlanDaysLeft <= 7;
  const showPendingBanner = !loading && hasPendingRequest;

  const refreshPlanStatus = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) setPlanStatus(json.data);
    } catch { /* silent */ }
  };

  const handleSubmitToTrainer = async (checkIn: CheckInData) => {
    setSubmitting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checkIn, planTypes: ['workout', 'diet'] }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error?.message || 'Failed');
      toast.success('Check-in sent to your trainer! They\'ll generate your plan soon.');
      setCheckInOpen(false);
      await refreshPlanStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit to trainer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">

      {/* ── CHECK-IN MODAL ── */}
      <CheckInModal
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        onSubmitToTrainer={handleSubmitToTrainer}
        planType="both"
        submitting={submitting}
        initialData={planStatus?.pendingRequest?.checkIn}
      />

      {/* ── GYM HOLIDAY BANNER ── */}
      {gymInfo?.isHoliday && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-red-50 border border-red-200">
          <CalendarOff className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-black text-red-700">Gym Closed Today</p>
            {gymInfo.holiday?.reason && <p className="text-xs mt-0.5 text-red-500">{gymInfo.holiday.reason}</p>}
          </div>
        </motion.div>
      )}

      {/* ── GYM ANNOUNCEMENTS BANNERS ── */}
      {gymInfo?.announcements?.map((ann: any) => (
        <motion.div key={ann._id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${
            ann.type === 'warning' ? 'bg-amber-50 border-amber-200' :
            ann.type === 'promo'   ? 'bg-purple-50 border-purple-200' :
                                     'bg-blue-50 border-blue-200'
          }`}>
          <Megaphone className={`w-4 h-4 mt-0.5 shrink-0 ${
            ann.type === 'warning' ? 'text-amber-500' :
            ann.type === 'promo'   ? 'text-purple-500' : 'text-blue-500'
          }`} />
          <div>
            <p className={`text-sm font-black ${
              ann.type === 'warning' ? 'text-amber-800' :
              ann.type === 'promo'   ? 'text-purple-800' : 'text-blue-800'
            }`}>{ann.title}</p>
            <p className="text-xs mt-0.5 opacity-70 text-gray-700">{ann.message}</p>
          </div>
        </motion.div>
      ))}

      {/* ── SUBSCRIPTION EXPIRY BANNER ── */}
      {(showExpiryBanner || subExpired) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${
            subExpired
              ? 'bg-red-50 border-red-200'
              : subDaysLeft! <= 2
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
            subExpired || subDaysLeft! <= 2 ? 'text-red-500' : 'text-amber-500'
          }`} />
          <div>
            <p className={`text-sm font-black ${
              subExpired || subDaysLeft! <= 2 ? 'text-red-700' : 'text-amber-700'
            }`}>
              {subExpired
                ? 'Subscription expired'
                : subDaysLeft === 0
                ? 'Subscription expires today!'
                : `Subscription expires in ${subDaysLeft} day${subDaysLeft === 1 ? '' : 's'}`}
            </p>
            <p className={`text-xs mt-0.5 ${
              subExpired || subDaysLeft! <= 2 ? 'text-red-500' : 'text-amber-600'
            }`}>
              Contact your gym to renew your membership.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── PENDING REQUEST BANNER ── */}
      {showPendingBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border bg-blue-50 border-blue-200"
        >
          <ClipboardList className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-blue-800">Check-in submitted</p>
            <p className="text-xs mt-0.5 text-blue-600">
              Your trainer will generate your plan soon. You can update your check-in until then.
            </p>
          </div>
          <button
            onClick={() => setCheckInOpen(true)}
            className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
        </motion.div>
      )}

      {/* ── PLAN READY BANNER ── */}
      {hasReadyRequest && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border bg-green-50 border-green-200"
        >
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-green-800">Your plan is ready!</p>
            <p className="text-xs mt-0.5 text-green-700">
              Your trainer has generated your new plan. Head to Plans to view it.
            </p>
          </div>
          <button
            onClick={handleMarkNotified}
            className="shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs font-black rounded-xl hover:bg-green-700 transition-colors"
          >
            Got it
          </button>
        </motion.div>
      )}

      {/* ── MISSING PLANS BANNER ── */}
      {showMissingPlansBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border bg-emerald-50 border-emerald-200"
        >
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-emerald-800">Get your personalized plans</p>
            <p className="text-xs mt-0.5 text-emerald-600">
              {workoutNeedsRenewal && dietNeedsRenewal
                ? 'No active workout or diet plan — generate both with a quick check-in.'
                : workoutNeedsRenewal
                ? 'No active workout plan — complete a check-in to generate one.'
                : 'No diet plan this week — complete a check-in to generate one.'}
            </p>
          </div>
          <button
            onClick={() => setCheckInOpen(true)}
            className="shrink-0 px-3 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Start Check-In
          </button>
        </motion.div>
      )}

      {/* ── EXPIRING PLANS BANNER ── */}
      {showExpiringPlansBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border bg-amber-50 border-amber-200"
        >
          <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-amber-800">
              Plan renews in {workoutPlanDaysLeft} day{workoutPlanDaysLeft === 1 ? '' : 's'}
            </p>
            <p className="text-xs mt-0.5 text-amber-600">
              Complete your check-in early to get ahead with new plans.
            </p>
          </div>
          <button
            onClick={() => setCheckInOpen(true)}
            className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 transition-colors"
          >
            Check-In
          </button>
        </motion.div>
      )}

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
            <p className="stat-hero accent-orange num">{loading ? "—" : (todayDiet?._todayCalories ?? "—")}</p>
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
                  {todayDiet?._todayCalories ? `${todayDiet._todayCalories}` : "—"}
                  {todayDiet?._todayCalories && <span className="text-sm font-medium text-gray-400 ml-1">kcal</span>}
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
