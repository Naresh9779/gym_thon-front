"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Plus, Minus, Check, Loader2, Dumbbell, Salad, CalendarOff, TrendingUp, CheckCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionData {
  planName?: string;
  planId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
}

interface Plan {
  _id: string;
  name: string;
  price: number;
  durationDays: number;
  planType: 'active' | 'trial';
  features: { aiWorkoutPlan: boolean; aiDietPlan: boolean; leaveRequests: boolean; progressTracking: boolean };
  color: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (changes: Record<string, any>) => void;
  saving?: boolean;
  subscription?: SubscriptionData;
  userName?: string;
  userId?: string;
  activePaymentId?: string;
  activePaymentStatus?: 'received' | 'pending' | null;
  onPaymentStatusChange?: (paymentId: string, newStatus: 'received') => void;
}

const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none text-sm font-medium bg-white transition-all";

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  trial: 'bg-blue-100 text-blue-700',
  expired: 'bg-red-100 text-red-600',
};

export default function SubscriptionModal({ open, onClose, onSave, saving, subscription, userName, userId, activePaymentId, activePaymentStatus, onPaymentStatusChange }: Props) {
  const { getAccessToken } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [markingReceived, setMarkingReceived] = useState(false);
  const [mode, setMode] = useState<'extend' | 'setDate' | 'plan'>('extend');
  const [extendMonths, setExtendMonths] = useState(1);
  const [newEndDate, setNewEndDate] = useState(
    subscription?.endDate ? subscription.endDate.slice(0, 10) : ''
  );

  // Plan assignment state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash');
  const [payStatus, setPayStatus] = useState<'received' | 'pending'>('received');
  const [payNote, setPayNote] = useState('');
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (open && mode === 'plan' && plans.length === 0) {
      setPlansLoading(true);
      (async () => {
        try {
          const token = getAccessToken();
          const res = await fetch(`${base}/api/admin/subscription-plans`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await res.json();
          if (j.ok) {
            const active = (j.data.plans || []).filter((p: Plan & { isActive: boolean }) => p.isActive);
            setPlans(active);
            if (active.length > 0) {
              // Pre-select the user's current plan if it exists in the list, otherwise first
              const currentPlan = active.find((p: Plan) =>
                subscription?.planId ? p._id === subscription.planId : p.name === subscription?.planName
              ) || active[0];
              setSelectedPlanId(currentPlan._id);
              setPayAmount(String(currentPlan.price));
            }
          }
        } catch { /* ignore */ } finally { setPlansLoading(false); }
      })();
    }
  }, [open, mode, plans.length, base, getAccessToken]);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlanId(plan._id);
    setPayAmount(plan.planType === 'trial' ? '0' : String(plan.price));
    if (plan.planType === 'trial') setPayStatus('received'); // reset payment status for trials
  };

  const handleRecordPayment = async () => {
    if (!selectedPlanId || !userId) return;
    const selectedPlan = plans.find(p => p._id === selectedPlanId);
    setRecording(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId,
          planId: selectedPlanId,
          // Trial plans: backend ignores these but send clean values anyway
          amount: selectedPlan?.planType === 'trial' ? 0 : Number(payAmount) || 0,
          method: selectedPlan?.planType === 'trial' ? 'other' : payMethod,
          paymentStatus: selectedPlan?.planType === 'trial' ? 'received' : payStatus,
          note: payNote.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message || 'Failed');
      onSave({ _planRecorded: true, subscription: j.data.subscription });
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setRecording(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!activePaymentId) return;
    setMarkingReceived(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/payments/${activePaymentId}/mark-received`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) onPaymentStatusChange?.(activePaymentId, 'received');
      else alert(j.error?.message || 'Failed');
    } catch { alert('Failed to update payment'); }
    finally { setMarkingReceived(false); }
  };

  const handleSave = () => {
    if (mode === 'plan') { handleRecordPayment(); return; }
    if (mode === 'extend') onSave({ extendByMonths: extendMonths });
    else if (mode === 'setDate') { if (!newEndDate) return; onSave({ setEndDate: newEndDate }); }
  };

  const endDateStr = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const durationLabel = (days: number) => {
    if (days % 30 === 0) return `${days / 30}mo`;
    return `${days}d`;
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
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                {([
                  ['extend',  'Extend'],
                  ['setDate', 'Set Date'],
                  ['plan',    'Assign Plan'],
                ] as const).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-1.5 rounded-lg text-xs font-black transition-all ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
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
                    <button onClick={() => setExtendMonths(m => Math.max(-12, m - 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-black text-gray-900">{extendMonths > 0 ? '+' : ''}{extendMonths}</span>
                      <p className="text-xs text-gray-400 font-medium">month{Math.abs(extendMonths) !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={() => setExtendMonths(m => Math.min(24, m + 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
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
                    <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className={`${inputCls} pl-9`} />
                  </div>
                </div>
              )}

              {/* Assign Plan mode */}
              {mode === 'plan' && (() => {
                const selectedPlan = plans.find(p => p._id === selectedPlanId);
                const subActive = selectedPlan?.planType !== 'trial' &&
                  subscription?.status === 'active' &&
                  subscription.endDate &&
                  new Date(subscription.endDate) > new Date();
                if (subActive) {
                  const expiry = new Date(subscription!.endDate!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                  return (
                    <div className="px-4 py-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                      <div className="text-center">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Subscription Locked</p>
                        <p className="text-lg font-black text-gray-900">Active until {expiry}</p>
                      </div>
                      <div className="space-y-2">
                        {activePaymentStatus === 'pending' ? (
                          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-amber-700">Payment Pending</p>
                              <p className="text-[10px] text-amber-600 mt-0.5">Subscription is active but payment hasn't been collected yet.</p>
                            </div>
                            {activePaymentId && (
                              <button
                                onClick={handleMarkReceived}
                                disabled={markingReceived}
                                className="flex items-center gap-1 text-[10px] font-black text-white bg-green-500 hover:bg-green-600 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                              >
                                {markingReceived ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                                Mark Received
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <span className="text-xs mt-0.5">✓</span>
                            <p className="text-xs font-semibold text-green-600">Payment received — subscription is locked</p>
                          </div>
                        )}
                        {[
                          { icon: '⏳', text: `Auto-expires on ${expiry}`, color: 'text-gray-500' },
                          { icon: '🚪', text: 'No renewal after 14 days → marked as Left Gym', color: 'text-gray-500' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-xs mt-0.5">{item.icon}</span>
                            <p className={`text-xs font-semibold ${item.color}`}>{item.text}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 text-center border-t border-gray-100 pt-2">
                        Use <span className="font-black">Extend</span> or <span className="font-black">Set Date</span> to adjust the end date if needed.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
              {mode === 'plan' && !(plans.find(p => p._id === selectedPlanId)?.planType !== 'trial' && subscription?.status === 'active' && subscription.endDate && new Date(subscription.endDate) > new Date()) && (
                <div className="space-y-3">
                  {plansLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : plans.length === 0 ? (
                    <p className="text-sm text-center text-gray-400 py-4">
                      No active plans. <a href="/subscriptions" className="font-bold text-gray-600 hover:underline">Create one →</a>
                    </p>
                  ) : (
                    <>
                      {/* Plan picker */}
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {plans.map(plan => {
                          const isSel = selectedPlanId === plan._id;
                          return (
                            <button
                              key={plan._id}
                              type="button"
                              onClick={() => handlePlanSelect(plan)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${isSel ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: plan.color }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-gray-900">{plan.name}</span>
                                  <span className="text-xs font-bold text-gray-500">₹{plan.price.toLocaleString('en-IN')}</span>
                                </div>
                                <p className="text-[10px] text-gray-400">{durationLabel(plan.durationDays)}</p>
                              </div>
                              {isSel && <Check className="w-3.5 h-3.5 text-gray-900 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Plan type indicator — driven by the plan's own planType setting */}
                      {(() => {
                        const sel = plans.find(p => p._id === selectedPlanId);
                        if (!sel) return null;
                        return sel.planType === 'trial' ? (
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <span className="text-sm">🎁</span>
                            <div>
                              <p className="text-xs font-black text-blue-700">Trial Plan</p>
                              <p className="text-[10px] text-blue-500">No payment required — user will be set to Trial status.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                            <span className="text-sm">✓</span>
                            <div>
                              <p className="text-xs font-black text-gray-700">Paid Plan</p>
                              <p className="text-[10px] text-gray-400">User will be set to Active status upon assignment.</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Payment details — only for Paid plans */}
                      {plans.find(p => p._id === selectedPlanId)?.planType !== 'trial' && <div className="space-y-2">
                        {/* Payment status */}
                        <div>
                          <label className="label-cap block mb-1.5">Payment Status</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['received', 'pending'] as const).map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setPayStatus(s)}
                                className={`py-2 rounded-xl text-xs font-black capitalize transition-all ${
                                  payStatus === s
                                    ? s === 'received'
                                      ? 'bg-black text-[#00E676]'
                                      : 'bg-amber-500 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {s === 'received' ? '✓ Received' : '⏳ Pending'}
                              </button>
                            ))}
                          </div>
                          {payStatus === 'pending' && (
                            <p className="text-[10px] text-amber-600 font-medium mt-1">
                              Subscription will activate, payment marked as pending.
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label-cap block mb-1">Amount (₹)</label>
                            <input
                              type="number" min="0" value={payAmount}
                              onChange={e => setPayAmount(e.target.value)}
                              className={inputCls}
                              placeholder="Amount"
                            />
                          </div>
                          <div>
                            <label className="label-cap block mb-1">Method</label>
                            <select
                              value={payMethod}
                              onChange={e => setPayMethod(e.target.value as any)}
                              className={inputCls}
                            >
                              <option value="cash">Cash</option>
                              <option value="upi">UPI</option>
                              <option value="card">Card</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                        <input
                          value={payNote}
                          onChange={e => setPayNote(e.target.value)}
                          placeholder="Note (optional)…"
                          className={inputCls}
                        />
                      </div>}
                      <p className="text-[10px] text-gray-400">
                        {plans.find(p => p._id === selectedPlanId)?.planType === 'trial'
                          ? 'Trial starts today and runs for the plan duration.'
                          : 'Activates from today (or extends current end date if still active).'}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={
                    saving || recording ||
                    (mode === 'setDate' && !newEndDate) ||
                    (mode === 'plan' && !selectedPlanId) ||
                    (mode === 'plan' && plans.find(p => p._id === selectedPlanId)?.planType !== 'trial' && subscription?.status === 'active' && !!subscription.endDate && new Date(subscription.endDate) > new Date())
                  }
                  className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-gray-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {(saving || recording) ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
