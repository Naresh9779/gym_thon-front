"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Dumbbell, Salad, AlertCircle } from "lucide-react";

export interface OverrideFormData {
  planType: "workout" | "diet";
  adminNote: string;
  additionalContext: string;
  durationWeeks?: number;    // workout only
  daysPerWeek?: number;      // workout only
  exercisesPerDay?: number;  // workout only
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: OverrideFormData) => void;
  generating?: boolean;
  userName?: string;
  initialPlanType?: 'workout' | 'diet';
}

const inputCls =
  "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none text-sm font-medium bg-white transition-all";

export default function OverrideModal({ open, onClose, onConfirm, generating, userName, initialPlanType }: Props) {
  const [form, setForm] = useState<OverrideFormData>({
    planType: initialPlanType ?? "workout",
    adminNote: "",
    additionalContext: "",
    durationWeeks: 4,
    daysPerWeek: 6,
    exercisesPerDay: 6,
  });

  const set = <K extends keyof OverrideFormData>(k: K, v: OverrideFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Sync planType when modal opens with a specific type
  useEffect(() => {
    if (open && initialPlanType) set("planType", initialPlanType);
  }, [open, initialPlanType]);

  const handleConfirm = () => {
    if (!form.adminNote.trim()) return;
    onConfirm(form);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-50">
              <div>
                <p className="label-cap mb-0.5">Admin Action</p>
                <h2 className="text-xl font-black text-gray-900">
                  Generate Override Plan
                </h2>
                {userName && (
                  <p className="text-xs text-gray-400 mt-0.5">for {userName}</p>
                )}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Plan type */}
              <div>
                <p className="label-cap mb-2">Plan Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["workout", "diet"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("planType", t)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-black transition-all ${
                        form.planType === t
                          ? t === "workout"
                            ? "bg-black text-[#00E676] border-black"
                            : "bg-black text-[#FF6D00] border-black"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {t === "workout"
                        ? <Dumbbell className="w-4 h-4" />
                        : <Salad className="w-4 h-4" />}
                      {t === "workout" ? "Workout" : "Diet"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration (workout only) */}
              {form.planType === "workout" && (
                <>
                  <div>
                    <p className="label-cap mb-2">Duration (weeks)</p>
                    <div className="flex gap-2">
                      {[2, 4, 6, 8].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => set("durationWeeks", w)}
                          className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
                            form.durationWeeks === w
                              ? "bg-black text-[#00E676]"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {w}w
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="label-cap mb-2">Days per week</p>
                    <div className="flex gap-2">
                      {[3, 4, 5, 6].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => set("daysPerWeek", d)}
                          className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
                            form.daysPerWeek === d
                              ? "bg-black text-[#00E676]"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="label-cap mb-2">Exercises per day</p>
                    <div className="flex gap-2">
                      {[4, 5, 6, 7, 8].map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => set("exercisesPerDay", e)}
                          className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
                            form.exercisesPerDay === e
                              ? "bg-black text-[#00E676]"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Reason (required) */}
              <div>
                <p className="label-cap mb-2">
                  Reason for Override <span className="text-red-400">*</span>
                </p>
                <input
                  type="text"
                  value={form.adminNote}
                  onChange={e => set("adminNote", e.target.value)}
                  placeholder="e.g. User reported knee injury, plateau in week 3, etc."
                  className={inputCls}
                />
              </div>

              {/* Additional context for AI */}
              <div>
                <p className="label-cap mb-2">Additional Instructions for AI</p>
                <textarea
                  rows={3}
                  value={form.additionalContext}
                  onChange={e => set("additionalContext", e.target.value)}
                  placeholder="Specific day issues, exercises to avoid, dietary changes, progression notes…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">
                  This will generate a new plan even if one already exists. The existing plan will remain but this one becomes the latest.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirm}
                  disabled={generating || !form.adminNote.trim()}
                  className="flex-1 py-3 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-50 transition-colors"
                >
                  {generating ? "Generating…" : "Generate Plan"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
