"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProgress } from "@/hooks/useUserProgress";
import { SkipForward, Square, CheckCircle2 } from "lucide-react";

interface Exercise { name: string; sets: number; reps: number | string; rest: number; }

interface WorkoutTimerProps {
  exercises: Exercise[];
  onComplete: () => void;
  onStop: () => void;
  workoutId?: string;
  day?: string;
}

export default function WorkoutTimer({ exercises, onComplete, onStop, day }: WorkoutTimerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [resting, setResting] = useState(false);
  const [restSecs, setRestSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const { logWorkout } = useUserProgress();

  const ex = exercises[currentIdx];
  const overallPct = ((currentIdx + (currentSet - 1) / ex.sets) / exercises.length) * 100;
  const restPct = ex.rest > 0 ? ((ex.rest - restSecs) / ex.rest) * 100 : 100;
  const circumference = 2 * Math.PI * 42;

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSecs(t => t + 1);
      if (resting && restSecs > 0) setRestSecs(t => t - 1);
      else if (resting && restSecs === 0) setResting(false);
    }, 1000);
    return () => clearInterval(timer);
  }, [resting, restSecs]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSetDone = () => {
    if (currentSet < ex.sets) {
      setCurrentSet(currentSet + 1); setResting(true); setRestSecs(ex.rest);
    } else if (currentIdx < exercises.length - 1) {
      setCurrentIdx(currentIdx + 1); setCurrentSet(1); setResting(true); setRestSecs(ex.rest);
    } else {
      logWorkout(day || "Day 1", exercises.length, exercises.length, totalSecs).catch(() => {});
      onComplete();
    }
  };

  return (
    <div className="rounded-2xl bg-black text-white overflow-hidden">
      {/* Top bar */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="label-cap text-gray-600 mb-1">Exercise {currentIdx + 1}/{exercises.length}</p>
            <p className="text-base font-black text-white">Workout Active</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black font-mono text-[#00E676] num">{fmt(totalSecs)}</p>
            <p className="label-cap text-gray-600">elapsed</p>
          </div>
        </div>
        {/* Overall bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#00E676] rounded-full"
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Main */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {resting ? (
            <motion.div
              key="rest"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-2"
            >
              <p className="label-cap text-gray-600 mb-5">Rest Time</p>
              {/* SVG ring */}
              <div className="relative w-28 h-28 mx-auto mb-5">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <motion.circle
                    cx="48" cy="48" r="42"
                    fill="none" stroke="#00E676" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (restPct / 100) * circumference}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-black font-mono text-[#00E676] num">{restSecs}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-5">
                Next: <span className="text-white font-bold">
                  {currentSet < ex.sets ? `Set ${currentSet + 1}` : exercises[currentIdx + 1]?.name || "Final set!"}
                </span>
              </p>
              <button
                onClick={() => setResting(false)}
                className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold transition-all"
              >
                <SkipForward className="w-4 h-4" /> Skip Rest
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`${currentIdx}-${currentSet}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <p className="label-cap text-gray-600 mb-1">Exercise</p>
                <h4 className="text-2xl font-black text-white leading-tight">{ex.name}</h4>
              </div>

              {/* Set dots */}
              <div className="flex items-center gap-2">
                {Array.from({ length: ex.sets }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      i < currentSet - 1 ? "bg-[#00E676]" : i === currentSet - 1 ? "bg-white" : "bg-white/20"
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-500 font-bold ml-1">set {currentSet}/{ex.sets}</span>
              </div>

              {/* Big rep count */}
              <div className="text-center py-2">
                <p className="stat-hero text-[#00E676] num">{ex.reps}</p>
                <p className="label-cap text-gray-600 mt-1">reps</p>
              </div>

              {/* Complete set */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSetDone}
                className="w-full py-4 rounded-2xl bg-[#00E676] text-black font-black text-base flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {currentIdx === exercises.length - 1 && currentSet === ex.sets
                  ? "Complete Workout"
                  : `Done · Set ${currentSet}`}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stop */}
      <div className="px-5 pb-5">
        <button
          onClick={onStop}
          className="w-full py-2.5 rounded-xl border border-white/10 text-gray-500 hover:text-white hover:border-white/20 text-sm font-bold flex items-center justify-center gap-2 transition-all"
        >
          <Square className="w-3.5 h-3.5" /> Stop Workout
        </button>
      </div>
    </div>
  );
}
