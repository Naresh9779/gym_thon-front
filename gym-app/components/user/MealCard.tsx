"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/useToast";
import { Check, Loader2, Clock, Flame, Beef, Wheat, Droplets } from "lucide-react";

interface FoodItem { name: string; portion?: string }

interface Props {
  mealName: string;
  time?: string;
  calories?: number;
  foods?: FoodItem[];
  macros?: { protein?: number; carbs?: number; fats?: number };
  onLog?: () => void;
}

export default function MealCard({ mealName, time, calories, foods = [], macros, onLog }: Props) {
  const { logMeal, logs } = useUserProgress();
  const toast = useToast();
  const [isLogging, setIsLogging] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const already = logs.some((log) => {
      const logDate = new Date(log.date).toISOString().slice(0, 10);
      if (logDate !== todayStr) return false;
      return (log.meals || []).some(
        (m) => (m.mealName || "").trim().toLowerCase() === mealName.trim().toLowerCase()
      );
    });
    setIsLogged(already);
  }, [logs, mealName]);

  const handleLog = async () => {
    if (isLogging || isLogged) return;
    setIsLogging(true);
    try {
      const result = await logMeal(mealName, calories, macros ? { p: macros.protein, c: macros.carbs, f: macros.fats } : undefined);
      if (result && (result as any).success) {
        setIsLogged(true);
        if ((result as any).alreadyLogged) {
          toast.info(`${mealName} already logged today.`);
        } else {
          toast.success(`${mealName} logged!`);
        }
      }
    } catch {
      toast.error("Failed to log meal");
    } finally {
      setIsLogging(false);
    }
    onLog?.();
  };

  const totalMacro = (macros?.protein ?? 0) + (macros?.carbs ?? 0) + (macros?.fats ?? 0);
  const proteinPct = totalMacro ? Math.round(((macros?.protein ?? 0) / totalMacro) * 100) : 0;
  const carbsPct = totalMacro ? Math.round(((macros?.carbs ?? 0) / totalMacro) * 100) : 0;
  const fatsPct = totalMacro ? Math.round(((macros?.fats ?? 0) / totalMacro) * 100) : 0;

  return (
    <motion.div
      layout
      className={`rounded-2xl border-2 overflow-hidden transition-all ${
        isLogged ? "border-green-200 bg-green-50/50" : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isLogged ? "bg-green-100" : "bg-gray-100"}`}>
            {isLogged ? "✅" : "🍽"}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{mealName}</h4>
            {time && (
              <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Clock className="w-3 h-3" /> {time}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {calories !== undefined && (
            <span className="flex items-center gap-1 text-sm font-semibold text-orange-500">
              <Flame className="w-3.5 h-3.5" /> {calories}
            </span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
              {/* Foods */}
              {foods.length > 0 && (
                <div className="space-y-1.5">
                  {foods.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{f.name}</span>
                      {f.portion && <span className="text-gray-400 text-xs">{f.portion}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Macro bar */}
              {macros && totalMacro > 0 && (
                <div className="space-y-2">
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div className="bg-red-400 rounded-l-full transition-all" style={{ width: `${proteinPct}%` }} />
                    <div className="bg-yellow-400 transition-all" style={{ width: `${carbsPct}%` }} />
                    <div className="bg-blue-400 rounded-r-full transition-all" style={{ width: `${fatsPct}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Beef className="w-3 h-3 text-red-400" />
                      <span>{macros.protein ?? 0}g protein</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Wheat className="w-3 h-3 text-yellow-400" />
                      <span>{macros.carbs ?? 0}g carbs</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      <span>{macros.fats ?? 0}g fats</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Log button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLog}
                disabled={isLogged || isLogging}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  isLogged
                    ? "bg-green-100 text-green-600 cursor-default"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-sm"
                }`}
              >
                {isLogging ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLogged ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {isLogged ? "Logged" : isLogging ? "Logging..." : "Log Meal"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
