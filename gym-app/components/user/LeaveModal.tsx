"use client";

import { useState } from 'react';
import { X, CalendarOff, Calendar, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/useToast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (dates: string[], reason: string) => Promise<void>;
  submitting?: boolean;
}

type Mode = 'range' | 'individual';

function generateRange(start: string, end: string): string[] {
  if (!start || !end || end < start) return start ? [start] : [];
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function LeaveModal({ open, onClose, onSubmit, submitting }: Props) {
  const [mode, setMode] = useState<Mode>('range');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [individualDates, setIndividualDates] = useState<string[]>(['']);
  const [reason, setReason] = useState('');
  const toast = useToast();

  const todayDate = new Date();
  const minDate = new Date(todayDate); minDate.setDate(minDate.getDate() - 3);
  const maxDate = new Date(todayDate); maxDate.setDate(maxDate.getDate() + 7);
  const minStr = minDate.toISOString().slice(0, 10);
  const maxStr = maxDate.toISOString().slice(0, 10);

  const resolvedDates = mode === 'range'
    ? generateRange(rangeStart, rangeEnd)
    : [...new Set(individualDates.filter(Boolean))].sort();

  const handleSubmit = async () => {
    if (resolvedDates.length === 0 || !reason.trim()) return;
    if (resolvedDates.some(d => d < minStr || d > maxStr)) {
      toast.error('Leave dates must be within the last 3 days or next 7 days');
      return;
    }
    await onSubmit(resolvedDates, reason.trim());
    resetForm();
  };

  const resetForm = () => {
    setRangeStart('');
    setRangeEnd('');
    setIndividualDates(['']);
    setReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const valid = resolvedDates.length > 0 && reason.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                  <CalendarOff className="w-4.5 h-4.5 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900">Request Leave</h2>
                  <p className="text-xs text-gray-400">Approved days extend your subscription</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('range')}
                  className={`flex items-center gap-1.5 flex-1 h-9 rounded-xl text-xs font-black transition-colors ${
                    mode === 'range' ? 'bg-black text-[#00E676]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Date Range
                </button>
                <button
                  onClick={() => setMode('individual')}
                  className={`flex items-center gap-1.5 flex-1 h-9 rounded-xl text-xs font-black transition-colors ${
                    mode === 'individual' ? 'bg-black text-[#00E676]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Individual Dates
                </button>
              </div>

              {/* Date inputs */}
              {mode === 'range' ? (
                <div className="space-y-2">
                  <label className="label-cap">Leave Period</label>
                  <p className="text-[10px] text-gray-400">Dates can be within past 3 days or next 7 days</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">FROM</p>
                      <input
                        type="date"
                        value={rangeStart}
                        min={minStr}
                        max={maxStr}
                        onChange={e => {
                          setRangeStart(e.target.value);
                          if (rangeEnd && e.target.value > rangeEnd) setRangeEnd('');
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00E676]/40 focus:border-[#00E676]"
                      />
                    </div>
                    <div className="text-gray-300 font-black text-lg mt-4">→</div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">TO</p>
                      <input
                        type="date"
                        value={rangeEnd}
                        min={rangeStart || minStr}
                        max={maxStr}
                        onChange={e => setRangeEnd(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00E676]/40 focus:border-[#00E676]"
                      />
                    </div>
                  </div>
                  {resolvedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {resolvedDates.slice(0, 7).map(d => (
                        <span key={d} className="text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">{d}</span>
                      ))}
                      {resolvedDates.length > 7 && (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">+{resolvedDates.length - 7} more</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="label-cap">Leave Dates</label>
                  <p className="text-[10px] text-gray-400">Dates can be within past 3 days or next 7 days</p>
                  {individualDates.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="date"
                        value={d}
                        min={minStr}
                        max={maxStr}
                        onChange={e => setIndividualDates(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                        className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00E676]/40 focus:border-[#00E676]"
                      />
                      {individualDates.length > 1 && (
                        <button
                          onClick={() => setIndividualDates(prev => prev.filter((_, idx) => idx !== i))}
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-lg font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setIndividualDates(prev => [...prev, ''])}
                    className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors pt-1"
                  >
                    + Add another date
                  </button>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="label-cap">Reason</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="E.g. Travelling, medical leave, family event…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#00E676]/40 focus:border-[#00E676] placeholder:font-normal placeholder:text-gray-300"
                />
              </div>

              {resolvedDates.length > 0 && (
                <p className="text-xs text-gray-400 bg-amber-50 rounded-xl px-3 py-2.5">
                  If approved, your subscription will be extended by <strong>{resolvedDates.length} day{resolvedDates.length !== 1 ? 's' : ''}</strong>. These days won't count toward your adherence score.
                </p>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!valid || submitting}
                className="flex-1 h-11 rounded-xl bg-black text-[#00E676] text-sm font-black disabled:opacity-40 hover:bg-gray-900 transition-colors"
              >
                {submitting ? 'Submitting…' : `Submit (${resolvedDates.length}d)`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
