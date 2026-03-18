"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Plus, Minus, RotateCcw } from "lucide-react";

interface SubscriptionData {
  plan?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (changes: Record<string, any>) => void;
  saving?: boolean;
  subscription?: SubscriptionData;
  userName?: string;
}

const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none text-sm font-medium bg-white transition-all";

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  trial: 'bg-blue-100 text-blue-700',
  expired: 'bg-red-100 text-red-600',
};

export default function SubscriptionModal({ open, onClose, onSave, saving, subscription, userName }: Props) {
  const [mode, setMode] = useState<'extend' | 'setDate' | 'status'>('extend');
  const [extendMonths, setExtendMonths] = useState(1);
  const [newEndDate, setNewEndDate] = useState(
    subscription?.endDate ? subscription.endDate.slice(0, 10) : ''
  );
  const [newStatus, setNewStatus] = useState<string>(subscription?.status || 'active');

  const handleSave = () => {
    if (mode === 'extend') {
      onSave({ extendByMonths: extendMonths });
    } else if (mode === 'setDate') {
      if (!newEndDate) return;
      onSave({ setEndDate: newEndDate });
    } else {
      onSave({ status: newStatus });
    }
  };

  const endDateStr = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

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
            className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-50">
              <div>
                <p className="label-cap mb-0.5">Admin Action</p>
                <h2 className="text-xl font-black text-gray-900">Manage Subscription</h2>
                {userName && <p className="text-xs text-gray-400 mt-0.5">for {userName}</p>}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Current status */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Current End Date</p>
                  <p className="text-sm font-black text-gray-900">{endDateStr}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black capitalize ${STATUS_COLORS[subscription?.status || ''] || 'bg-gray-100 text-gray-500'}`}>
                  {subscription?.status || 'unknown'}
                </span>
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
                {([['extend', 'Extend'], ['setDate', 'Set Date'], ['status', 'Status']] as const).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Extend mode */}
              {mode === 'extend' && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-600">Extend or reduce current end date by:</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExtendMonths(m => Math.max(-12, m - 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-black text-gray-900">{extendMonths > 0 ? '+' : ''}{extendMonths}</span>
                      <p className="text-xs text-gray-400 font-medium">month{Math.abs(extendMonths) !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => setExtendMonths(m => Math.min(24, m + 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  {extendMonths < 0 && (
                    <p className="text-xs text-red-500 font-medium text-center">This will reduce the subscription by {Math.abs(extendMonths)} month{Math.abs(extendMonths) !== 1 ? 's' : ''}.</p>
                  )}
                </div>
              )}

              {/* Set date mode */}
              {mode === 'setDate' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Set a specific end date:</p>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={e => setNewEndDate(e.target.value)}
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </div>
              )}

              {/* Status mode */}
              {mode === 'status' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Change subscription status:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['active', 'inactive', 'trial', 'expired'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setNewStatus(s)}
                        className={`py-2.5 rounded-xl text-sm font-black capitalize transition-all ${
                          newStatus === s ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving || (mode === 'setDate' && !newEndDate)}
                  className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-gray-900 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
