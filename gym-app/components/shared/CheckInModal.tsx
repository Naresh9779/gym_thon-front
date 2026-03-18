"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scale, Zap, Moon, Activity, ClipboardList } from "lucide-react";

export interface CheckInData {
  currentWeight?: number;
  energyLevel: number;      // 1-5
  sleepQuality: number;     // 1-5
  muscleSoreness: number;   // 1-5 (5=very sore)
  dietAdherence: number;    // 0-100%
  injuries?: string;
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitToTrainer?: (data: CheckInData) => void;
  planType: 'workout' | 'diet' | 'both';
  submitting?: boolean;
  initialData?: Partial<CheckInData>;
}

const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none text-sm font-medium bg-white transition-all";

function ScaleRow({ label, icon: Icon, value, onChange, color }: {
  label: string; icon: any; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <p className="label-cap">{label}</p>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
              value === n ? 'bg-black text-[#00E676]' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_FORM: CheckInData = {
  currentWeight: undefined,
  energyLevel: 3,
  sleepQuality: 3,
  muscleSoreness: 2,
  dietAdherence: 70,
  injuries: '',
  notes: '',
};

export default function CheckInModal({ open, onClose, onSubmitToTrainer, planType, submitting, initialData }: Props) {
  const [form, setForm] = useState<CheckInData>({ ...DEFAULT_FORM, ...initialData });

  // When initialData changes (e.g. editing a different request) or modal opens, reset form
  useEffect(() => {
    if (open) setForm({ ...DEFAULT_FORM, ...initialData });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl p-5 border-b border-gray-50 flex items-center justify-between z-10">
              <div>
                <p className="label-cap mb-0.5">Submit to your trainer</p>
                <h2 className="text-xl font-black text-gray-900">Monthly Check-In</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                Your answers help your trainer tailor your{' '}
                {planType === 'both' ? 'workout & diet plans' : `new ${planType} plan`}{' '}
                based on your current condition and last month's progress.
                <span className="block mt-1 text-xs text-gray-400">Your trainer will review your check-in and generate a personalised plan.</span>
              </p>

              {/* Current weight */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Scale className="w-3.5 h-3.5 text-gray-400" />
                  <p className="label-cap">Current Weight (kg)</p>
                </div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 75.5"
                  value={form.currentWeight ?? ''}
                  onChange={e => setForm(f => ({ ...f, currentWeight: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className={inputCls}
                />
              </div>

              {/* 1-5 scales */}
              <ScaleRow label="Energy Level" icon={Zap} color="text-[#00E676]" value={form.energyLevel} onChange={v => setForm(f => ({ ...f, energyLevel: v }))} />
              <ScaleRow label="Sleep Quality" icon={Moon} color="text-blue-400" value={form.sleepQuality} onChange={v => setForm(f => ({ ...f, sleepQuality: v }))} />
              <ScaleRow label="Muscle Soreness (5=very sore)" icon={Activity} color="text-[#FF6D00]" value={form.muscleSoreness} onChange={v => setForm(f => ({ ...f, muscleSoreness: v }))} />

              {/* Diet adherence */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                    <p className="label-cap">Diet Adherence Last Month</p>
                  </div>
                  <span className="text-sm font-black text-gray-900">{form.dietAdherence}%</span>
                </div>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={form.dietAdherence}
                  onChange={e => setForm(f => ({ ...f, dietAdherence: parseInt(e.target.value) }))}
                  className="w-full accent-black"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>

              {/* Injuries */}
              <div>
                <p className="label-cap mb-2">Injuries / Limitations</p>
                <input
                  type="text"
                  placeholder="e.g. left knee pain, shoulder tightness, or leave blank"
                  value={form.injuries}
                  onChange={e => setForm(f => ({ ...f, injuries: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Notes */}
              <div>
                <p className="label-cap mb-2">Additional Notes for Trainer</p>
                <textarea
                  rows={2}
                  placeholder="Anything else the AI should know for this plan…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="space-y-2 pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSubmitToTrainer ? onSubmitToTrainer(form) : undefined}
                  disabled={submitting || !onSubmitToTrainer}
                  className="w-full py-3 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit to Trainer'}
                </motion.button>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
