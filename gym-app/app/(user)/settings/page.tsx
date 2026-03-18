'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Loader2 } from 'lucide-react';

const UNIT_OPTIONS = [
  { value: 'metric',   label: 'Metric',   sub: 'kg, cm' },
  { value: 'imperial', label: 'Imperial', sub: 'lb, in' },
];

const TZ_OPTIONS = [
  { value: 'UTC',                  label: 'UTC' },
  { value: 'America/New_York',     label: 'Eastern (ET)' },
  { value: 'America/Chicago',      label: 'Central (CT)' },
  { value: 'America/Denver',       label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles',  label: 'Pacific (PT)' },
];

export default function SettingsPage() {
  const { user, refreshUser, getAccessToken } = useAuth();
  const toast = useToast();
  const [units, setUnits] = useState('metric');
  const [notifications, setNotifications] = useState(true);
  const [timezone, setTimezone] = useState('UTC');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setUnits(user.profile.preferences?.includes('imperial') ? 'imperial' : 'metric');
      setNotifications(user.profile.preferences?.includes('notifications') ?? true);
      setTimezone(user.profile.timezone || 'UTC');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const prefs = [];
      if (units === 'imperial') prefs.push('imperial');
      if (notifications) prefs.push('notifications');
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences: prefs, timezone }),
      });
      if (res.ok) {
        toast.success('Settings saved!');
        await refreshUser();
      } else {
        const d = await res.json();
        toast.error(d.error?.message || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Preferences</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
      </motion.div>

      {/* ── UNITS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-50">
          <p className="label-cap mb-0.5">Measurement</p>
          <h3 className="font-black text-gray-900">Units</h3>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {UNIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setUnits(opt.value)}
              className={`rounded-xl p-3.5 text-left transition-all border-2 ${
                units === opt.value
                  ? 'border-black bg-black text-white'
                  : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
              }`}
            >
              <p className="font-black text-sm">{opt.label}</p>
              <p className={`text-xs mt-0.5 ${units === opt.value ? 'text-[#00E676]' : 'text-gray-400'}`}>{opt.sub}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── TIMEZONE ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="p-4 border-b border-gray-50">
          <p className="label-cap mb-0.5">Location</p>
          <h3 className="font-black text-gray-900">Timezone</h3>
        </div>
        <div className="p-4 space-y-2">
          {TZ_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimezone(opt.value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                timezone === opt.value
                  ? 'bg-black text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-sm font-bold">{opt.label}</span>
              {timezone === opt.value && (
                <div className="w-2 h-2 rounded-full bg-[#00E676]" />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── NOTIFICATIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100"
      >
        <div className="flex items-center justify-between p-4">
          <div>
            <h3 className="font-black text-gray-900">Notifications</h3>
            <p className="text-xs text-gray-500 mt-0.5">Workout reminders & updates</p>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
              notifications ? 'bg-[#00E676]' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              notifications ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </motion.div>

      {/* ── SAVE ── */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-2xl bg-black text-[#00E676] font-black text-base flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
      </motion.button>
    </div>
  );
}
