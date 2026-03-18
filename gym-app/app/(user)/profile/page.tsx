'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Pencil, Check, X, LogOut, Settings, ChevronRight, CalendarOff, Plus, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { getInitials, formatDate } from '@/lib/utils';
import LeaveModal from '@/components/user/LeaveModal';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, refreshUser, getAccessToken } = useAuth();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const [form, setForm] = useState({
    age: 0, weight: 0, height: 0,
    goal: '', activityLevel: '',
  });

  useEffect(() => {
    if (user?.profile) {
      setForm({
        age: user.profile.age || 0,
        weight: user.profile.weight || 0,
        height: user.profile.height || 0,
        goal: user.profile.goals?.[0] || '',
        activityLevel: user.profile.activityLevel || '',
      });
    }
  }, [user]);

  const loadLeaveRequests = useCallback(async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/leave`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) setLeaveRequests(j.data.requests || []);
    } catch { /* ignore */ }
  }, [getAccessToken]);

  useEffect(() => { loadLeaveRequests(); }, [loadLeaveRequests]);

  const handleSubmitLeave = async (dates: string[], reason: string) => {
    setSubmittingLeave(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dates, reason }),
      });
      const j = await res.json();
      if (j.ok) {
        toast.success('Leave request submitted');
        setLeaveModalOpen(false);
        await loadLeaveRequests();
      } else {
        toast.error(j.error?.message || 'Failed to submit');
      }
    } catch { toast.error('Failed to submit leave request'); }
    finally { setSubmittingLeave(false); }
  };

  const handleCancelLeave = async (id: string) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/leave/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) { toast.success('Request cancelled'); await loadLeaveRequests(); }
      else toast.error(j.error?.message || 'Failed to cancel');
    } catch { toast.error('Failed to cancel'); }
  };

  const initials = getInitials(user?.name);

  const statusColor = user?.subscription?.status === 'active'
    ? 'bg-[#00E676]/20 text-[#00E676]'
    : user?.subscription?.status === 'trial'
    ? 'bg-blue-500/20 text-blue-400'
    : 'bg-white/10 text-gray-400';

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const goalMap: Record<string, string> = {
        'Weight Loss': 'weight_loss', 'Muscle Building': 'muscle_gain',
        'Muscle Gain': 'muscle_gain', 'Maintenance': 'maintenance', 'Endurance': 'endurance',
      };
      const actMap: Record<string, string> = {
        'Sedentary': 'sedentary', 'Light': 'light', 'Moderate': 'moderate',
        'Active': 'active', 'Very Active': 'very_active',
      };
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          age: form.age || undefined,
          weight: form.weight || undefined,
          height: form.height || undefined,
          goals: [goalMap[form.goal] || 'maintenance'],
          activityLevel: actMap[form.activityLevel] || 'moderate',
        }),
      });
      if (res.ok) {
        toast.success('Profile updated!');
        setIsEditing(false);
        await refreshUser();
      } else {
        const d = await res.json();
        toast.error(d.error?.message || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const bodyStats = [
    { label: 'Age',    value: form.age,    unit: 'yrs', field: 'age' as const },
    { label: 'Weight', value: form.weight, unit: 'kg',  field: 'weight' as const },
    { label: 'Height', value: form.height, unit: 'cm',  field: 'height' as const },
  ];

  return (
    <div className="space-y-4 pb-6">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Account</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Profile</h1>
      </motion.div>

      {/* ── HERO CARD ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="hero-card p-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#00E676]/20 flex items-center justify-center text-[#00E676] text-2xl font-black flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-white leading-tight truncate">{user?.name || 'Athlete'}</h2>
            <p className="text-sm text-gray-500 truncate mt-0.5">{user?.email}</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest flex-shrink-0 ${statusColor}`}>
            {user?.subscription?.status || 'free'}
          </span>
        </div>

        {user?.createdAt && (
          <p className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-600">
            Member since {formatDate(user.createdAt, { year: 'numeric', month: 'long' })}
          </p>
        )}
      </motion.div>

      {/* ── BODY STATS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <div>
            <p className="label-cap mb-0.5">Body</p>
            <h3 className="font-black text-gray-900">Measurements</h3>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-2 rounded-xl bg-[#00E676] text-black hover:bg-[#00C853] transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black text-[#00E676] text-xs font-bold hover:bg-gray-900 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-50">
          {bodyStats.map((s) => (
            <div key={s.label} className="p-4 text-center">
              <p className="label-cap mb-2">{s.label}</p>
              {isEditing ? (
                <input
                  type="number"
                  value={form[s.field] || ''}
                  onChange={(e) => setForm({ ...form, [s.field]: parseInt(e.target.value) || 0 })}
                  className="w-full text-center text-2xl font-black text-gray-900 bg-transparent border-b-2 border-[#00E676] focus:outline-none num"
                />
              ) : (
                <p className="text-2xl font-black text-gray-900 num">
                  {s.value || '—'}
                  {s.value > 0 && <span className="text-xs font-bold text-gray-400 ml-0.5">{s.unit}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── FITNESS PROFILE ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100"
      >
        <div className="p-4 border-b border-gray-50">
          <p className="label-cap mb-0.5">Training</p>
          <h3 className="font-black text-gray-900">Fitness Profile</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Gender', value: user?.profile?.gender ? user.profile.gender.charAt(0).toUpperCase() + user.profile.gender.slice(1) : '—' },
            { label: 'Activity Level', value: user?.profile?.activityLevel ? user.profile.activityLevel.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '—' },
            { label: 'Experience', value: user?.profile?.experienceLevel ? user.profile.experienceLevel.charAt(0).toUpperCase() + user.profile.experienceLevel.slice(1) : '—' },
            { label: 'Diet Type', value: user?.profile?.dietPreferences?.dietType ? user.profile.dietPreferences.dietType.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm font-bold text-gray-600">{label}</p>
              <p className="text-sm font-black text-gray-900">{value}</p>
            </div>
          ))}
          {/* Goals chips */}
          {user?.profile?.goals && user.profile.goals.length > 0 && (
            <div className="flex items-start justify-between px-4 py-3.5 gap-3">
              <p className="text-sm font-bold text-gray-600 shrink-0">Goals</p>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {user.profile.goals.map((g: string) => (
                  <span key={g} className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-black text-[#00E676]">
                    {g.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          {user?.profile?.dietPreferences?.isVegetarian && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm font-bold text-gray-600">Diet</p>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">Vegetarian</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── SUBSCRIPTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100"
      >
        <div className="p-4 border-b border-gray-50">
          <p className="label-cap mb-0.5">Plan</p>
          <h3 className="font-black text-gray-900">Subscription</h3>
        </div>
        <div className="divide-y divide-gray-50">
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-bold text-gray-600">Status</p>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${
              user?.subscription?.status === 'active'
                ? 'bg-green-100 text-green-700'
                : user?.subscription?.status === 'trial'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {user?.subscription?.status || 'Free'}
            </span>
          </div>
          {user?.subscription?.endDate && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm font-bold text-gray-600">Expires</p>
              <p className="text-sm font-black text-gray-900">
                {formatDate(user.subscription.endDate)}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── LEAVE REQUESTS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-amber-400" />
            <div>
              <p className="label-cap mb-0">Leave</p>
              <h3 className="font-black text-gray-900">Leave Requests</h3>
            </div>
          </div>
          <button
            onClick={() => setLeaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black text-[#00E676] text-xs font-bold hover:bg-gray-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Request
          </button>
        </div>
        {leaveRequests.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-black text-gray-300">No leave requests</p>
            <p className="text-xs text-gray-300 mt-1">Request leave for planned absences</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {leaveRequests.map((req) => {
              const statusIcon = {
                pending: <Clock className="w-3.5 h-3.5 text-amber-400" />,
                approved: <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />,
                rejected: <XCircle className="w-3.5 h-3.5 text-red-400" />,
                cancelled: <Ban className="w-3.5 h-3.5 text-gray-300" />,
              }[req.status as string];
              const statusColor = {
                pending: 'bg-amber-50 text-amber-700',
                approved: 'bg-green-50 text-green-700',
                rejected: 'bg-red-50 text-red-600',
                cancelled: 'bg-gray-50 text-gray-400',
              }[req.status as string] || 'bg-gray-50 text-gray-500';
              return (
                <div key={req._id} className="flex items-start justify-between px-4 py-3 gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="mt-0.5">{statusIcon}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{req.reason}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {req.dates.length} day{req.dates.length !== 1 ? 's' : ''} · {req.dates.slice(0, 3).join(', ')}{req.dates.length > 3 ? '…' : ''}
                      </p>
                      {req.adminNote && (
                        <p className="text-xs text-gray-500 italic mt-0.5">Note: {req.adminNote}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusColor}`}>{req.status}</span>
                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleCancelLeave(req._id)}
                        className="text-[10px] font-bold text-gray-400 hover:text-red-400 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── QUICK LINKS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50"
      >
        <button
          onClick={() => router.push('/settings')}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
              <Settings className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm font-bold text-gray-900">Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-bold text-red-500">Sign Out</span>
          </div>
          <ChevronRight className="w-4 h-4 text-red-200" />
        </button>
      </motion.div>

      <LeaveModal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onSubmit={handleSubmitLeave}
        submitting={submittingLeave}
      />
    </div>
  );
}
