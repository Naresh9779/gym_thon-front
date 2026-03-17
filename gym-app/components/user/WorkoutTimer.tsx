"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Play, SkipForward, Square, CheckCircle2 } from "lucide-react";

interface Exercise {
  name: string;
  sets: number;
  reps: number | string;
  rest: number;
}

interface WorkoutTimerProps {
  exercises: Exercise[];
  onComplete: () => void;
  onStop: () => void;
  workoutId?: string;
  day?: string;
}

export default function WorkoutTimer({ exercises, onComplete, onStop, workoutId, day }: WorkoutTimerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [resting, setResting] = useState(false);
  const [restSecs, setRestSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const { logWorkout } = useUserProgress();

  const ex = exercises[currentIdx];
  const overallProgress = ((currentIdx + (currentSet - 1) / ex.sets) / exercises.length) * 100;

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSecs((t) => t + 1);
      if (resting && restSecs > 0) setRestSecs((t) => t - 1);
      else if (resting && restSecs === 0) setResting(false);
    }, 1000);
    return () => clearInterval(timer);
  }, [resting, restSecs]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSetDone = () => {
    if (currentSet < ex.sets) {
      setCurrentSet(currentSet + 1);
      setResting(true);
      setRestSecs(ex.rest);
    } else if (currentIdx < exercises.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setCurrentSet(1);
      setResting(true);
      setRestSecs(ex.rest);
    } else {
      handleWorkoutComplete();
      onComplete();
    }
  };

  const handleWorkoutComplete = async () => {
    try {
      await logWorkout(day || "Day 1", exercises.length, exercises.length, totalSecs);
    } catch {}
  };

  // Rest ring — percentage of rest completed
  const restPct = ex.rest > 0 ? ((ex.rest - restSecs) / ex.rest) * 100 : 100;
  const circumference = 2 * Math.PI * 38;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden shadow-2xl">
      {/* Top bar */}
      <div className="px-6 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Workout Active</p>
            <h3 className="text-lg font-bold">
              Exercise {currentIdx + 1} / {exercises.length}
            </h3>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-green-400">{fmt(totalSecs)}</div>
            <p className="text-xs text-gray-400">elapsed</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Main exercise panel */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {resting ? (
            /* Rest screen */
            <motion.div
              key="rest"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-4"
            >
              <p className="text-gray-400 text-sm mb-4 uppercase tracking-widest">Rest Time</p>

              {/* Circular countdown */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                  <motion.circle
                    cx="44" cy="44" r="38"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (restPct / 100) * circumference}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold font-mono">{restSecs}</span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-5">
                Next: <span className="text-white font-semibold">
                  {currentSet < ex.sets ? `Set ${currentSet + 1} of ${ex.sets}` : exercises[currentIdx + 1]?.name || "Last exercise!"}
                </span>
              </p>

              <button
                onClick={() => setResting(false)}
                className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-all"
              >
                <SkipForward className="w-4 h-4" /> Skip Rest
              </button>
            </motion.div>
          ) : (
            /* Active exercise screen */
            <motion.div
              key={`${currentIdx}-${currentSet}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Exercise name + sets */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-2xl font-bold mb-1">{ex.name}</h4>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: ex.sets }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          i < currentSet - 1
                            ? "bg-green-500 text-white"
                            : i === currentSet - 1
                            ? "bg-white text-gray-900 ring-2 ring-green-400"
                            : "bg-white/10 text-gray-400"
                        }`}
                      >
                        {i < currentSet - 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                    ))}
                    <span className="text-gray-400 text-sm ml-1">sets</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-extrabold text-green-400">{ex.reps}</div>
                  <p className="text-gray-400 text-xs">reps</p>
                </div>
              </div>

              {/* Complete set button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={handleSetDone}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-gray-900 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 hover:shadow-green-900/50 transition-all"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                {currentIdx === exercises.length - 1 && currentSet === ex.sets
                  ? "Complete Workout"
                  : `Complete Set ${currentSet}`}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stop button */}
      <div className="px-6 pb-5">
        <button
          onClick={onStop}
          className="w-full py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium flex items-center justify-center gap-2 transition-all"
        >
          <Square className="w-3.5 h-3.5" /> Stop Workout
        </button>
      </div>
    </div>
  );
}
