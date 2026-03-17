"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Timer, Repeat } from "lucide-react";

interface Props {
  name: string;
  sets?: string | number;
  reps?: string | number;
  rest?: string | number;
  completed?: boolean;
  onToggle?: () => void;
}

export default function ExerciseCard({ name, sets, reps, rest, completed, onToggle }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border-2 p-4 transition-all duration-300 ${
        completed
          ? "bg-green-50 border-green-200"
          : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
      }`}
    >
      {/* Completed overlay shimmer */}
      <AnimatePresence>
        {completed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-50/0 via-green-100/30 to-green-50/0 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-base truncate transition-all ${completed ? "line-through text-gray-400" : "text-gray-900"}`}>
            {name}
          </h4>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Repeat className="w-3 h-3" />
              {sets} sets × {reps} reps
            </span>
            {rest && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Timer className="w-3 h-3" />
                {rest}s rest
              </span>
            )}
          </div>
        </div>

        {/* Right: badge + toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"}`}>
            {sets}×{reps}
          </div>
          {onToggle && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.1 }}
              onClick={onToggle}
              aria-label={completed ? "Mark incomplete" : "Mark complete"}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                completed
                  ? "bg-green-500 text-white shadow-md shadow-green-200"
                  : "bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-500"
              }`}
            >
              <Check className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
