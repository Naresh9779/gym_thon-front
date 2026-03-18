'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useToast } from '@/hooks/useToast';
import ExerciseCard from '@/components/user/ExerciseCard';
import { Pause, Play, CheckCircle2, ChevronLeft, Dumbbell } from 'lucide-react';
import Link from 'next/link';

export default function WorkoutDayPage() {
  const params = useParams();
  const router = useRouter();
  const dayParam = params.day as string; // numeric index as string
  const dayIndex = parseInt(dayParam);

  const { plans, loading: plansLoading } = useWorkoutPlans();
  const { logWorkout } = useUserProgress();
  const toast = useToast();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [logging, setLogging] = useState(false);
  const [checkedExercises, setCheckedExercises] = useState<boolean[]>([]);

  // Get active plan & matching day
  const activePlan = plans.find(p => p.status === 'active') || plans[0];
  const days = activePlan?.days || [];
  const workoutDay = !isNaN(dayIndex) && dayIndex >= 0 && dayIndex < days.length
    ? days[dayIndex]
    : null;
  const exercises = workoutDay?.exercises || [];

  // Init checked state when exercises load
  useEffect(() => {
    if (exercises.length > 0 && checkedExercises.length === 0) {
      setCheckedExercises(exercises.map(() => false));
    }
  }, [exercises]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && !completed) interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, completed]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const completedCount = checkedExercises.filter(Boolean).length;
  const progressPct = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;
  const allDone = exercises.length > 0 && completedCount === exercises.length;

  const handleComplete = async () => {
    if (logging) return;
    setLogging(true);
    setIsActive(false);
    const ok = await logWorkout(
      workoutDay?.name || `Day ${dayIndex + 1}`,
      completedCount,
      exercises.length,
      elapsedTime,
    );
    setLogging(false);
    if (ok) {
      setCompleted(true);
      toast.success('Workout logged!');
      setTimeout(() => router.push('/workout'), 1500);
    } else {
      toast.error('Failed to log workout');
      setIsActive(true);
    }
  };

  if (plansLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!workoutDay) return (
    <div className="space-y-4">
      <Link href="/workout" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </Link>
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-sm font-semibold text-amber-700">
        {plans.length === 0 ? 'No active workout plan found.' : 'Workout day not found.'}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/workout" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Plan
        </Link>
        <p className="label-cap mb-1">Workout</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{workoutDay.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{exercises.length} exercises · {activePlan?.name}</p>
      </motion.div>

      {/* Timer + Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="label-cap mb-1">Duration</p>
            <p className="text-3xl font-black num text-[#00E676] font-mono">{formatTime(elapsedTime)}</p>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            disabled={completed}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 ${
              isActive ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' : 'bg-[#00E676]/10 text-[#00E676] hover:bg-[#00E676]/20'
            }`}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="label-cap">Progress</p>
          <p className="text-xs font-bold text-gray-500">{completedCount}/{exercises.length} exercises</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <motion.div
            className="bg-[#00E676] h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {exercises.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Dumbbell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">No exercises in this day</p>
          </div>
        ) : exercises.map((exercise: any, index: number) => (
          <ExerciseCard
            key={index}
            name={exercise.name}
            sets={String(exercise.sets)}
            reps={String(exercise.reps)}
            rest={exercise.rest}
            completed={checkedExercises[index] || false}
            onToggle={() => {
              const next = [...checkedExercises];
              next[index] = !next[index];
              setCheckedExercises(next);
            }}
          />
        ))}
      </div>

      {/* Complete CTA */}
      {allDone && !completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm"
        >
          <button
            onClick={handleComplete}
            disabled={logging}
            className="w-full flex items-center justify-center gap-2 bg-black text-[#00E676] py-4 rounded-2xl text-sm font-black shadow-xl hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            {logging ? 'Logging...' : 'Complete Workout'}
          </button>
        </motion.div>
      )}

      {completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#00E676]/10 border border-[#00E676]/30 rounded-2xl p-5 text-center"
        >
          <CheckCircle2 className="w-8 h-8 text-[#00E676] mx-auto mb-2" />
          <p className="font-black text-gray-900">Workout Complete!</p>
          <p className="text-sm text-gray-500 mt-1">Redirecting...</p>
        </motion.div>
      )}
    </div>
  );
}
