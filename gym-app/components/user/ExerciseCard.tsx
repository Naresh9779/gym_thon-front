"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

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
    <motion.button
      layout
      onClick={onToggle}
      disabled={!onToggle}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
        completed ? "bg-black border-[#00E676]" : "bg-white border-gray-100 hover:border-gray-200"
      } ${onToggle ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-lg font-black leading-tight ${completed ? "text-[#00E676] line-through decoration-[#00E676]/40" : "text-gray-900"}`}>
            {name}
          </p>
          <p className={`text-xs font-semibold mt-0.5 uppercase tracking-wide ${completed ? "text-gray-600" : "text-gray-400"}`}>
            {sets} sets · {rest ? `${rest}s rest` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className={`text-4xl font-black num leading-none ${completed ? "text-[#00E676]" : "text-gray-900"}`}>{reps}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${completed ? "text-gray-600" : "text-gray-400"}`}>reps</p>
          </div>
          {onToggle && (
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              completed ? "bg-[#00E676] border-[#00E676]" : "border-gray-200"
            }`}>
              <AnimatePresence>
                {completed && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <CheckCircle2 className="w-4 h-4 text-black" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
