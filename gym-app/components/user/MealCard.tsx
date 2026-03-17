"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/useToast";
import { Check, Loader2, ChevronDown } from "lucide-react";

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
    const already = logs.some(log => {
      const logDate = new Date(log.date).toISOString().slice(0, 10);
      if (logDate !== todayStr) return false;
      return (log.meals || []).some(
        (m: any) => (m.mealName || "").trim().toLowerCase() === mealName.trim().toLowerCase()
      );
    });
    setIsLogged(already);
  }, [logs, mealName]);

  const handleLog = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLogging || isLogged) return;
    setIsLogging(true);
    try {
      const result = await logMeal(mealName, calories, macros ? { p: macros.protein, c: macros.carbs, f: macros.fats } : undefined);
      if (result && (result as any).success) {
        setIsLogged(true);
        toast.success((result as any).alreadyLogged ? `${mealName} already logged.` : `${mealName} logged!`);
      }
    } catch {
      toast.error("Failed to log meal");
    } finally {
      setIsLogging(false);
    }
    onLog?.();
  };

  const totalMacro = (macros?.protein ?? 0) + (macros?.carbs ?? 0) + (macros?.fats ?? 0);
  const pPct = totalMacro ? Math.round(((macros?.protein ?? 0) / totalMacro) * 100) : 0;
  const cPct = totalMacro ? Math.round(((macros?.carbs ?? 0) / totalMacro) * 100) : 0;
  const fPct = totalMacro ? Math.round(((macros?.fats ?? 0) / totalMacro) * 100) : 0;

  return (
    <motion.div
      layout
      className={`rounded-2xl border-2 overflow-hidden transition-colors ${
        isLogged ? "border-[#00E676] bg-black" : "border-gray-100 bg-white"
      }`}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left: name + time */}
        <div className="flex-1 min-w-0">
          <p className={`font-black text-lg leading-tight ${isLogged ? "text-[#00E676]" : "text-gray-900"}`}>
            {mealName}
          </p>
          {time && (
            <p className={`text-xs font-semibold mt-0.5 ${isLogged ? "text-gray-500" : "text-gray-400"}`}>{time}</p>
          )}
        </div>

        {/* Right: calories + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {calories !== undefined && (
            <span className={`text-xl font-black num ${isLogged ? "text-[#00E676]" : "text-orange-500"}`}>
              {calories}<span className="text-sm font-semibold text-gray-400 ml-0.5">cal</span>
            </span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className={`w-4 h-4 ${isLogged ? "text-gray-600" : "text-gray-300"}`} />
          </motion.div>
        </div>
      </div>

      {/* Expandable */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <div className={`px-4 pb-4 pt-2 space-y-4 border-t ${isLogged ? "border-white/10" : "border-gray-50"}`}>

              {/* Food list */}
              {foods.length > 0 && (
                <div className="space-y-1.5">
                  {foods.map((f, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isLogged ? "text-gray-300" : "text-gray-700"}`}>{f.name}</span>
                      {f.portion && <span className={`text-xs ${isLogged ? "text-gray-600" : "text-gray-400"}`}>{f.portion}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Macro bar + numbers */}
              {macros && totalMacro > 0 && (
                <div>
                  <div className="flex h-1.5 rounded-full overflow-hidden gap-px mb-3">
                    <div className="bg-red-400 rounded-l-full" style={{ width: `${pPct}%` }} />
                    <div className="bg-yellow-400" style={{ width: `${cPct}%` }} />
                    <div className="bg-blue-400 rounded-r-full" style={{ width: `${fPct}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Protein", val: macros.protein ?? 0, color: "text-red-400" },
                      { label: "Carbs",   val: macros.carbs ?? 0,   color: "text-yellow-500" },
                      { label: "Fats",    val: macros.fats ?? 0,    color: "text-blue-400" },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <p className={`text-xl font-black num ${isLogged ? m.color : m.color}`}>{m.val}<span className="text-xs font-bold text-gray-400 ml-0.5">g</span></p>
                        <p className="label-cap">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Log button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLog}
                disabled={isLogged || isLogging}
                className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                  isLogged
                    ? "bg-[#00E676]/20 text-[#00E676] cursor-default"
                    : "bg-black text-[#00E676] hover:bg-gray-900 shadow-lg"
                }`}
              >
                {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : isLogged ? <Check className="w-4 h-4" /> : null}
                {isLogged ? "Logged" : isLogging ? "Logging..." : "Log Meal"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
