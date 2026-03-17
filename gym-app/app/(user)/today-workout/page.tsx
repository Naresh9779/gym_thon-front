'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExerciseCard from '@/components/user/ExerciseCard';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useToast } from '@/hooks/useToast';
import { Dumbbell, CheckCircle2, Loader2, Trophy, Moon } from 'lucide-react';

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
    const start = new Date(latestWorkout.startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      const idx = diffDays % latestWorkout.days.length;
      todayWorkout = latestWorkout.days[idx];
    }
  }

  const exercises = todayWorkout?.exercises || [];
  const isRestDay = !exercises || exercises.length === 0;

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLog = logs.find(log => {
      const logDate = new Date(log.date).toISOString().slice(0, 10);
      return logDate === today && log.workout && (log.workout.completedExercises || 0) > 0;
    });
    if (todayLog) {
      setWorkoutAlreadyLogged(true);
      if (todayLog.workout && exercises.length > 0) {
        const completed = todayLog.workout.completedExercises || 0;
        const newSet = new Set<number>();
        for (let i = 0; i < Math.min(completed, exercises.length); i++) newSet.add(i);
        setCompletedExercises(newSet);
      }
    } else {
      setWorkoutAlreadyLogged(false);
    }
  }, [logs, exercises.length]);

  const toggleExercise = (index: number) => {
    if (workoutAlreadyLogged) return;
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(index)) newCompleted.delete(index);
    else newCompleted.add(index);
    setCompletedExercises(newCompleted);
  };

  const handleCompleteWorkout = async () => {
    if (isRestDay || exercises.length === 0 || isLogging || workoutAlreadyLogged) return;
    setIsLogging(true);
    const success = await logWorkout(
      todayWorkout?.day || todayName,
      completedExercises.size,
      exercises.length
    );
    setIsLogging(false);
    if (success) {
      setWorkoutAlreadyLogged(true);
      toast.success(`Workout logged! ${completedExercises.size}/${exercises.length} exercises completed 💪`);
    } else {
      toast.error('Failed to log workout');
    }
  };

  const completionPct = exercises.length > 0
    ? Math.round((completedExercises.size / exercises.length) * 100)
    : 0;

  if (workoutLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today's Workout</h1>
            <p className="text-sm text-gray-500">{todayWorkout?.day || todayName}</p>
          </div>
        </div>
      </motion.div>

      {/* Progress bar card */}
      {!isRestDay && exercises.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Progress</p>
              <p className="text-lg font-bold text-gray-900">
                {completedExercises.size} <span className="text-gray-400 font-normal">/ {exercises.length} exercises</span>
              </p>
            </div>
            <div className={`text-3xl font-extrabold tabular-nums ${completionPct === 100 ? 'text-green-500' : 'text-gray-800'}`}>
              {completionPct}%
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          {workoutAlreadyLogged && (
            <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Logged today
            </p>
          )}
        </motion.div>
      )}

      {/* Content */}
      {isRestDay ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Moon className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Rest Day</h3>
          <p className="text-gray-500 max-w-xs mx-auto">No workout scheduled. Take time to recover and come back stronger!</p>
        </motion.div>
      ) : exercises.length > 0 ? (
        <>
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {exercises.map((exercise: any, index: number) => (
              <motion.div
                key={index}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              >
                <ExerciseCard
                  name={exercise.name}
                  sets={exercise.sets}
                  reps={exercise.reps}
                  rest={exercise.rest}
                  completed={completedExercises.has(index)}
                  onToggle={() => toggleExercise(index)}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Sticky complete button */}
          <div className="sticky bottom-4 pt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={!workoutAlreadyLogged && completedExercises.size > 0 ? { scale: 1.01 } : {}}
              onClick={handleCompleteWorkout}
              disabled={isLogging || completedExercises.size === 0 || workoutAlreadyLogged}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all ${
                workoutAlreadyLogged
                  ? 'bg-green-100 text-green-600 cursor-default'
                  : completedExercises.size === 0 || isLogging
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-green-200'
              }`}
            >
              {isLogging ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Logging...</>
              ) : workoutAlreadyLogged ? (
                <><CheckCircle2 className="w-5 h-5" /> Workout Logged Today</>
              ) : (
                <><Trophy className="w-5 h-5" /> Complete Workout ({completedExercises.size}/{exercises.length})</>
              )}
            </motion.button>
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm"
        >
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Workout Plan Yet</h3>
          <p className="text-gray-500">Contact your trainer to get a personalized workout plan.</p>
        </motion.div>
      )}
    </div>
  );
}
