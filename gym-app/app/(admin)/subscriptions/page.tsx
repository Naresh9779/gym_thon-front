'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Plus, Pencil, Trash2, Loader2, X, Check, Dumbbell, Salad, CalendarOff, TrendingUp, CreditCard, Users, AlertTriangle } from 'lucide-react';

interface Plan {
  _id: string;
  name: string;
  price: number;
  durationDays: number;
  planType: 'active' | 'trial';
  features: {
    aiWorkoutPlan: boolean;
    aiDietPlan: boolean;
    leaveRequests: boolean;
    progressTracking: boolean;
  };
  color: string;
  isActive: boolean;
  activeUserCount: number;
}

const PRESET_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const FEATURE_LABELS: { key: keyof Plan['features']; label: string; icon: React.ReactNode }[] = [
  { key: 'aiWorkoutPlan',   label: 'AI Workout Plan', icon: <Dumbbell className="w-3.5 h-3.5" /> },
  { key: 'aiDietPlan',      label: 'AI Diet Plan',    icon: <Salad className="w-3.5 h-3.5" /> },
  { key: 'leaveRequests',   label: 'Leave Requests',  icon: <CalendarOff className="w-3.5 h-3.5" /> },
  { key: 'progressTracking',label: 'Progress Tracking',icon: <TrendingUp className="w-3.5 h-3.5" /> },
];

const emptyForm = () => ({
  name: '',
  price: '',
  durationDays: '',
  color: '#6366f1',
  planType: 'active' as 'active' | 'trial',
  features: { aiWorkoutPlan: false, aiDietPlan: false, leaveRequests: true, progressTracking: true },
});

export default function SubscriptionsPage() {
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Confirm dialogs
  const [deactivateTarget, setDeactivateTarget] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/subscription-plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) setPlans(j.data.plans || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [base, getAccessToken]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      color: plan.color || '#6366f1',
      planType: plan.planType || 'active',
      features: { ...plan.features },
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.planType !== 'trial' && (!form.price || Number(form.price) < 0)) e.price = 'Valid price required';
    if (!form.durationDays || Number(form.durationDays) < 1) e.durationDays = 'Duration must be at least 1 day';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const token = getAccessToken();
      const body = {
        name: form.name.trim(),
        price: form.planType === 'trial' ? 0 : Number(form.price),
        durationDays: Number(form.durationDays),
        color: form.color,
        planType: form.planType,
        features: form.features,
      };
      const url = editing
        ? `${base}/api/admin/subscription-plans/${editing._id}`
        : `${base}/api/admin/subscription-plans`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message || 'Failed');
      toast.success(editing ? 'Plan updated!' : 'Plan created!');
      setModalOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const confirmToggleActive = async () => {
    if (!deactivateTarget) return;
    setToggling(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/subscription-plans/${deactivateTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !deactivateTarget.isActive }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message || 'Failed');
      if (deactivateTarget.isActive) {
        toast.success(
          deactivateTarget.activeUserCount > 0
            ? `Plan deactivated. ${deactivateTarget.activeUserCount} existing member${deactivateTarget.activeUserCount !== 1 ? 's' : ''} keep access until their subscription expires.`
            : 'Plan deactivated.'
        );
      } else {
        toast.success('Plan activated — it can now be assigned to new members.');
      }
      setDeactivateTarget(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setToggling(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget._id);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/subscription-plans/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error?.message || 'Failed');
      toast.success('Plan permanently deleted.');
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete plan');
    } finally {
      setDeletingId(null);
    }
  };

  const setFeature = (key: keyof Plan['features'], val: boolean) =>
    setForm(f => ({ ...f, features: { ...f.features, [key]: val } }));

  const durationLabel = (days: number) => {
    if (days % 365 === 0) return `${days / 365} yr${days / 365 !== 1 ? 's' : ''}`;
    if (days % 30 === 0) return `${days / 30} mo${days / 30 !== 1 ? 's' : ''}`;
    return `${days}d`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between">
        <div>
          <p className="label-cap mb-1">Admin</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Subscription Plans</h1>
          <p className="text-xs text-gray-400 mt-1">Create and manage membership tiers for your gym</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-[#00E676] rounded-xl text-sm font-black hover:bg-gray-900 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </motion.div>

      {/* Plans grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-44 animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-black text-gray-400">No plans yet</p>
          <p className="text-xs text-gray-300 mt-1">Create your first subscription plan to get started</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {plans.map((plan, idx) => (
            <motion.div
              key={plan._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${plan.isActive ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}
            >
              {/* Color bar */}
              <div className="h-1.5 w-full" style={{ background: plan.color }} />

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-gray-900 text-base leading-tight">{plan.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{durationLabel(plan.durationDays)}</p>
                    {plan.activeUserCount > 0 && (
                      <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                        <Users className="w-3 h-3" />
                        {plan.activeUserCount} active member{plan.activeUserCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">
                      {plan.planType === 'trial' ? 'Free' : `₹${plan.price.toLocaleString('en-IN')}`}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {plan.planType === 'trial' && (
                        <span className="text-[10px] font-black text-blue-500 uppercase bg-blue-50 px-1.5 py-0.5 rounded-md">Trial</span>
                      )}
                      {!plan.isActive && (
                        <span className="text-[10px] font-black text-red-400 uppercase">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-1.5">
                  {FEATURE_LABELS.map(({ key, label, icon }) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        plan.features[key]
                          ? 'bg-black text-[#00E676]'
                          : 'bg-gray-100 text-gray-300'
                      }`}
                    >
                      {icon} {label}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  <button
                    onClick={() => openEdit(plan)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => setDeactivateTarget(plan)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                      plan.isActive
                        ? 'border-amber-100 text-amber-600 hover:bg-amber-50'
                        : 'border-green-100 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {plan.isActive ? 'Deactivate' : <><Check className="w-3 h-3" /> Activate</>}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(plan)}
                    disabled={deletingId === plan._id}
                    className="ml-auto p-1.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    title="Delete plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Deactivate / Activate Confirm */}
      <AnimatePresence>
        {deactivateTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50" onClick={() => !toggling && setDeactivateTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${deactivateTarget.isActive ? 'bg-amber-100' : 'bg-green-100'}`}>
                  <AlertTriangle className={`w-4 h-4 ${deactivateTarget.isActive ? 'text-amber-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">
                    {deactivateTarget.isActive ? 'Deactivate' : 'Activate'} "{deactivateTarget.name}"?
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {deactivateTarget.isActive
                      ? deactivateTarget.activeUserCount > 0
                        ? `This plan has ${deactivateTarget.activeUserCount} active member${deactivateTarget.activeUserCount !== 1 ? 's' : ''}. They keep full access until their subscription expires — deactivating only stops new sign-ups.`
                        : 'This will stop new members from being assigned to this plan.'
                      : 'This plan will become available for new member assignments.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeactivateTarget(null)} disabled={toggling}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmToggleActive} disabled={toggling}
                  className={`flex-1 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors ${
                    deactivateTarget.isActive
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-black text-[#00E676] hover:bg-gray-900'
                  } disabled:opacity-50`}>
                  {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : deactivateTarget.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50" onClick={() => !deletingId && setDeleteTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Delete "{deleteTarget.name}"?</p>
                  {deleteTarget.activeUserCount > 0 ? (
                    <p className="text-xs text-red-500 mt-1 font-medium">
                      Cannot delete — {deleteTarget.activeUserCount} active member{deleteTarget.activeUserCount !== 1 ? 's' : ''} are on this plan. Deactivate it instead.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      This is permanent and cannot be undone.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={!!deletingId}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={!!deletingId || deleteTarget.activeUserCount > 0}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-black flex items-center justify-center gap-2 hover:bg-red-600 disabled:opacity-40 transition-colors">
                  {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-50">
                <h2 className="text-lg font-black text-gray-900">
                  {editing ? 'Edit Plan' : 'New Subscription Plan'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="label-cap block mb-1.5">Plan Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Gold – 3 Months"
                    className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm font-medium focus:outline-none transition-all ${errors.name ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-900'}`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Plan Type */}
                <div>
                  <label className="label-cap block mb-1.5">Plan Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['active', 'trial'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, planType: t }))}
                        className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                          form.planType === t
                            ? t === 'active' ? 'bg-black text-[#00E676]' : 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {t === 'active' ? '✓ Paid · Active' : '🎁 Trial'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {form.planType === 'trial'
                      ? 'Users assigned this plan will be marked as Trial — no payment required.'
                      : 'Users assigned this plan will be marked Active upon payment.'}
                  </p>
                </div>

                {/* Price + Duration */}
                <div className={form.planType === 'trial' ? '' : 'grid grid-cols-2 gap-3'}>
                  {form.planType !== 'trial' && <div>
                    <label className="label-cap block mb-1.5">Price (₹)</label>
                    <input
                      type="number" min="0" value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="e.g. 2400"
                      className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm font-medium focus:outline-none transition-all ${errors.price ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-900'}`}
                    />
                    {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                  </div>}
                  <div>
                    <label className="label-cap block mb-1.5">Duration (days)</label>
                    <input
                      type="number" min="1" value={form.durationDays}
                      onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                      placeholder="e.g. 90"
                      className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm font-medium focus:outline-none transition-all ${errors.durationDays ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-900'}`}
                    />
                    {errors.durationDays && <p className="text-xs text-red-500 mt-1">{errors.durationDays}</p>}
                    {form.durationDays && Number(form.durationDays) > 0 && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        ≈ {Number(form.durationDays) >= 365
                          ? `${(Number(form.durationDays) / 365).toFixed(1)} year(s)`
                          : `${(Number(form.durationDays) / 30).toFixed(1)} month(s)`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="label-cap block mb-2">Included Features</label>
                  <div className="space-y-2">
                    {FEATURE_LABELS.map(({ key, label, icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFeature(key, !form.features[key])}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all ${
                          form.features[key]
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-bold">
                          {icon} {label}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          form.features[key] ? 'border-[#00E676] bg-[#00E676]' : 'border-gray-300'
                        }`}>
                          {form.features[key] && <Check className="w-3 h-3 text-black" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="label-cap block mb-2">Plan Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                        style={{ background: c }}
                      />
                    ))}
                    <input
                      type="color" value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                      title="Custom color"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-5 border-t border-gray-50">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : editing ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
