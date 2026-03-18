"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import ExerciseCard from '@/components/user/ExerciseCard';
import WorkoutTimer from '@/components/user/WorkoutTimer';
import { Play, RefreshCw, Moon } from 'lucide-react';

export default function WorkoutPlanPage() {
  const searchParams = useSearchParams();
  const autoStart = searchParams.get('start') === 'true';
  const { plans, loading, error, refresh } = useWorkoutPlans();
  const toast = useToast();
  const { getAccessToken } = useAuth();
  const [showTimer, setShowTimer] = useState(false);

  const latest = plans[0];
  const days: any[] = latest?.days || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [todayIndex, setTodayIndex] = useState(0);
  const lockedToToday = autoStart;

  useEffect(() => {
    if (days.length > 0 && latest?.startDate) {
      const token = getAccessToken();
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      fetch(`${base}/api/workouts/active-day`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(j => {
          const idx = j.ok ? j.data.dayIndex : (() => {
            const s = new Date(latest.startDate); s.setHours(0,0,0,0);
            const n = new Date(); n.setHours(0,0,0,0);
            const d = Math.floor((n.getTime()-s.getTime())/86400000);
            return d >= 0 ? d % days.length : 0;
          })();
          setTodayIndex(idx);
          setSelectedIndex(idx);
          if (autoStart && days[idx]?.exercises?.length > 0) setShowTimer(true);
        })
        .catch(() => {
          const start = new Date(latest.startDate);
          start.setHours(0, 0, 0, 0);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const diff = Math.floor((now.getTime() - start.getTime()) / 86400000);
          if (diff >= 0) {
            const idx = diff % days.length;
            setTodayIndex(idx);
            setSelectedIndex(idx);
            if (autoStart && days[idx]?.exercises?.length > 0) setShowTimer(true);
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, autoStart, latest?.startDate]);

  const selectedDay = days[selectedIndex];
  const exercises = selectedDay?.exercises || [];

  return (
    <div className="space-y-4 pb-6">

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <p className="label-cap mb-1">Your program</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Workout</h1>
        </div>
        <button
          onClick={() => refresh()}
          className="p-2.5 rounded-xl bg-white border border-gray-100 text-gray-500 hover:text-gray-900 transition-colors mt-1"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* No plan */}
      {!loading && plans.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Play className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-xl font-black text-gray-900 mb-2">No Workout Plan</p>
          <p className="text-gray-400 text-sm">Contact your trainer to get started.</p>
        </div>
      )}

      {latest && (
        <>
          {/* ── PLAN HERO ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hero-card p-5"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="label-cap text-gray-500 mb-2">Active plan</p>
                <h2 className="text-xl font-black text-white">{latest.name || 'Workout Cycle'}</h2>
              </div>
              <div className="text-right">
                <p className="stat-hero text-white num">{days.length}</p>
                <p className="label-cap text-gray-500">days</p>
              </div>
            </div>
          </motion.div>

          {/* ── DAY SELECTOR ── */}
          {!lockedToToday && days.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="label-cap mb-2">Select Day</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                {days.map((d: any, idx: number) => {
                  const isToday = idx === todayIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedIndex(idx); setShowTimer(false); }}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
                        isSelected
                          ? 'bg-black text-[#00E676]'
                          : isToday
                          ? 'bg-white border-2 border-[#00E676] text-[#00E676]'
                          : 'bg-white border border-gray-100 text-gray-600'
                      }`}
                    >
                      {d.day || `Day ${idx + 1}`}
                      {isToday && !isSelected && (
                        <span className="block text-[9px] font-bold text-[#00E676] uppercase tracking-wide">today</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── TIMER (when auto-started) ── */}
          <AnimatePresence>
            {lockedToToday && showTimer && exercises.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <WorkoutTimer
                  exercises={exercises}
                  day={selectedDay?.day || `Day ${selectedIndex + 1}`}
                  onComplete={() => {
                    setShowTimer(false);
                    toast.success('Workout complete! Great job! 💪');
                  }}
                  onStop={() => setShowTimer(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── EXERCISES LIST ── */}
          {!(lockedToToday && showTimer) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="label-cap">{selectedDay?.day || `Day ${selectedIndex + 1}`} — {exercises.length} exercises</p>
                {lockedToToday && exercises.length > 0 && !showTimer && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowTimer(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black text-[#00E676] text-xs font-black hover:bg-gray-900 transition-colors"
                  >
                    <Play className="w-3 h-3" /> Start Timer
                  </motion.button>
                )}
              </div>

              {exercises.length > 0 ? (
                <motion.div
                  className="space-y-2"
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                >
                  {exercises.map((ex: any, i: number) => (
                    <motion.div
                      key={i}
                      variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                    >
                      <ExerciseCard name={ex.name} sets={ex.sets} reps={ex.reps} rest={ex.rest} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                  <Moon className="w-10 h-10 text-indigo-200 mx-auto mb-3" />
                  <p className="font-black text-gray-900 mb-1">Rest Day</p>
                  <p className="text-sm text-gray-400">Recovery is part of training.</p>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
