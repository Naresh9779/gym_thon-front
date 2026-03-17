'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useToast } from '@/hooks/useToast';
import { CheckCircle2, Loader2, Trophy, Moon, ChevronRight } from 'lucide-react';

export default function TodayWorkoutPage() {
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { logWorkout, logs } = useUserProgress();
  const toast = useToast();
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [isLogging, setIsLogging] = useState(false);
  const [workoutAlreadyLogged, setWorkoutAlreadyLogged] = useState(false);

  const latestWorkout = workoutPlans?.[0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];
  let todayWorkout: any = null;

  if (latestWorkout?.startDate && Array.isArray(latestWorkout?.days) && latestWorkout.days.length > 0) {
    const start = new Date(latestWorkout.startDate); start.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
    if (diffDays >= 0) todayWorkout = latestWorkout.days[diffDays % latestWorkout.days.length];
  }

  const exercises = todayWorkout?.exercises || [];
  const isRestDay = !exercises.length;

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLog = logs.find(log => {
      const logDate = new Date(log.date).toISOString().slice(0, 10);
      return logDate === today && log.workout && (log.workout.completedExercises || 0) > 0;
    });
    if (todayLog) {
      setWorkoutAlreadyLogged(true);
      if (todayLog.workout && exercises.length > 0) {
        const n = new Set<number>();
        for (let i = 0; i < Math.min(todayLog.workout.completedExercises || 0, exercises.length); i++) n.add(i);
        setCompletedExercises(n);
      }
    } else setWorkoutAlreadyLogged(false);
  }, [logs, exercises.length]);

  const toggle = (i: number) => {
    if (workoutAlreadyLogged) return;
    const s = new Set(completedExercises);
    s.has(i) ? s.delete(i) : s.add(i);
    setCompletedExercises(s);
  };

  const handleComplete = async () => {
    if (isRestDay || !exercises.length || isLogging || workoutAlreadyLogged) return;
    setIsLogging(true);
    const ok = await logWorkout(todayWorkout?.day || todayName, completedExercises.size, exercises.length);
    setIsLogging(false);
    if (ok) { setWorkoutAlreadyLogged(true); toast.success(`${completedExercises.size}/${exercises.length} exercises logged 💪`); }
    else toast.error('Failed to log workout');
  };

  const pct = exercises.length > 0 ? Math.round((completedExercises.size / exercises.length) * 100) : 0;

  if (workoutLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">{todayWorkout?.day || todayName}</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Today's Workout</h1>
      </motion.div>

      {/* ── PROGRESS HERO ── */}
      {!isRestDay && exercises.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hero-card p-5"
        >
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="label-cap text-gray-500 mb-2">Completed</p>
              <div className="stat-hero accent-green num">
                {completedExercises.size}
                <span className="text-2xl font-bold text-gray-600 mx-1">/</span>
                <span className="text-4xl font-bold text-gray-400">{exercises.length}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-5xl font-black num text-white">{pct}<span className="text-2xl text-gray-500">%</span></p>
              {workoutAlreadyLogged && (
                <p className="text-xs text-[#00E676] font-semibold mt-1 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Logged
                </p>
              )}
            </div>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#00E676]"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* ── CONTENT ── */}
      {isRestDay ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
        >
          <Moon className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Rest Day</h2>
          <p className="text-gray-400 text-sm">Recovery is part of training. Rest up.</p>
        </motion.div>
      ) : exercises.length > 0 ? (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {exercises.map((ex: any, i: number) => {
            const done = completedExercises.has(i);
            return (
              <motion.button
                key={i}
                variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                onClick={() => toggle(i)}
                disabled={workoutAlreadyLogged}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  done
                    ? 'bg-black border-[#00E676]'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-lg font-black leading-tight ${done ? 'text-[#00E676] line-through decoration-[#00E676]/40' : 'text-gray-900'}`}>
                      {ex.name}
                    </p>
                    <p className={`text-xs font-semibold mt-0.5 uppercase tracking-wide ${done ? 'text-gray-500' : 'text-gray-400'}`}>
                      {ex.sets} sets · {ex.rest}s rest
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-4xl font-black num leading-none ${done ? 'text-[#00E676]' : 'text-gray-900'}`}>{ex.reps}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${done ? 'text-gray-600' : 'text-gray-400'}`}>reps</p>
                    </div>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      done ? 'bg-[#00E676] border-[#00E676]' : 'border-gray-200 bg-transparent'
                    }`}>
                      {done && <CheckCircle2 className="w-4 h-4 text-black" />}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-900 font-black text-xl mb-2">No Workout Plan</p>
          <p className="text-gray-400 text-sm">Contact your trainer.</p>
        </div>
      )}

      {/* ── STICKY COMPLETE BUTTON ── */}
      {!isRestDay && exercises.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f4f4f5]/90 backdrop-blur-md border-t border-gray-200 z-30">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleComplete}
            disabled={isLogging || completedExercises.size === 0 || workoutAlreadyLogged}
            className={`w-full max-w-lg mx-auto flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-base transition-all ${
              workoutAlreadyLogged
                ? 'bg-green-100 text-green-600 cursor-default'
                : completedExercises.size === 0 || isLogging
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-black text-[#00E676] shadow-xl hover:shadow-2xl'
            }`}
          >
            {isLogging ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Logging...</>
            ) : workoutAlreadyLogged ? (
              <><CheckCircle2 className="w-5 h-5" />Workout Logged</>
            ) : (
              <><Trophy className="w-5 h-5" />Complete · {completedExercises.size}/{exercises.length}</>
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}
