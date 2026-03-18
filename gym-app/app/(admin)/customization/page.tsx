"use client";

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { CalendarOff, Megaphone, Trash2, RefreshCw } from 'lucide-react';

export default function CustomizationPage() {
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  // ── Holidays ──────────────────────────────────────────────────────────────
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');
  const [savingHoliday, setSavingHoliday] = useState(false);

  const loadHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/holidays`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) setHolidays(j.data?.holidays || []);
    } catch { /* ignore */ } finally { setLoadingHolidays(false); }
  }, [base, getAccessToken]);

  const handleAddHoliday = async () => {
    if (!newHolidayDate) { toast.error('Please select a date'); return; }
    setSavingHoliday(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: newHolidayDate, reason: newHolidayReason.trim() }),
      });
      const j = await res.json();
      if (j.ok) {
        toast.success('Holiday marked');
        setNewHolidayDate('');
        setNewHolidayReason('');
        await loadHolidays();
      } else toast.error(j.error?.message || 'Failed to mark holiday');
    } catch { toast.error('Failed to mark holiday'); }
    finally { setSavingHoliday(false); }
  };

  const handleDeleteHoliday = async (date: string) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/holidays/${date}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) { toast.success('Holiday removed'); await loadHolidays(); }
      else toast.error(j.error?.message || 'Failed to remove holiday');
    } catch { toast.error('Failed to remove holiday'); }
  };

  // ── Announcements ─────────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'info' | 'warning' | 'promo'>('info');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [annStartsAt, setAnnStartsAt] = useState(`${todayStr}T00:00`);
  const [annExpiresAt, setAnnExpiresAt] = useState('');
  const [savingAnn, setSavingAnn] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoadingAnn(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) setAnnouncements(j.data?.announcements || []);
    } catch { /* ignore */ } finally { setLoadingAnn(false); }
  }, [base, getAccessToken]);

  const handleAddAnnouncement = async () => {
    if (!annTitle.trim() || !annMessage.trim()) { toast.error('Title and message are required'); return; }
    setSavingAnn(true);
    try {
      const token = getAccessToken();
      const body: any = { title: annTitle.trim(), message: annMessage.trim(), type: annType, startsAt: annStartsAt };
      if (annExpiresAt) body.expiresAt = annExpiresAt;
      const res = await fetch(`${base}/api/admin/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j.ok) {
        toast.success('Announcement created');
        setAnnTitle('');
        setAnnMessage('');
        setAnnType('info');
        setAnnStartsAt(`${new Date().toISOString().slice(0, 10)}T00:00`);
        setAnnExpiresAt('');
        await loadAnnouncements();
      } else toast.error(j.error?.message || 'Failed to create announcement');
    } catch { toast.error('Failed to create announcement'); }
    finally { setSavingAnn(false); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) { toast.success('Announcement deleted'); await loadAnnouncements(); }
      else toast.error(j.error?.message || 'Failed to delete announcement');
    } catch { toast.error('Failed to delete announcement'); }
  };

  useEffect(() => { loadHolidays(); }, [loadHolidays]);
  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const annTypeBadge = (type: string) => {
    if (type === 'warning') return 'bg-amber-50 text-amber-700';
    if (type === 'promo') return 'bg-purple-50 text-purple-700';
    return 'bg-blue-50 text-blue-700';
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00E676]/40 focus:border-[#00E676] bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Customization</h1>
      </motion.div>

      {/* ── HOLIDAYS SECTION ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <CalendarOff className="w-4.5 h-4.5 text-red-500" />
            </div>
            <div>
              <h2 className="font-black text-gray-900">Holidays</h2>
              <p className="text-xs text-gray-400">Mark gym closure dates</p>
            </div>
          </div>
          <button onClick={loadHolidays} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Add holiday form */}
        <div className="px-5 py-4 border-b border-gray-50 space-y-3">
          <p className="label-cap">Mark as Holiday</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 mb-1">DATE</p>
              <input
                type="date"
                value={newHolidayDate}
                onChange={e => setNewHolidayDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 mb-1">REASON</p>
              <input
                type="text"
                value={newHolidayReason}
                onChange={e => setNewHolidayReason(e.target.value)}
                placeholder="e.g. National Holiday"
                className={inputCls}
              />
            </div>
          </div>
          <button
            onClick={handleAddHoliday}
            disabled={savingHoliday || !newHolidayDate}
            className="h-10 px-5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-40 transition-colors"
          >
            {savingHoliday ? 'Saving…' : 'Mark as Holiday'}
          </button>
        </div>

        {/* Holiday list */}
        <div className="divide-y divide-gray-50">
          {loadingHolidays ? (
            <div className="space-y-2 p-5">
              {[1, 2].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : holidays.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-black text-gray-300">No holidays marked</p>
            </div>
          ) : (
            holidays.map((h: any) => (
              <div key={h._id || h.date} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-black text-gray-900">{h.date}</p>
                  {h.reason && <p className="text-xs text-gray-400 mt-0.5">{h.reason}</p>}
                </div>
                <button
                  onClick={() => handleDeleteHoliday(h.date)}
                  className="p-2 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  aria-label="Remove holiday"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* ── ANNOUNCEMENTS SECTION ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Megaphone className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-black text-gray-900">Announcements</h2>
              <p className="text-xs text-gray-400">Broadcast messages to members</p>
            </div>
          </div>
          <button onClick={loadAnnouncements} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Add announcement form */}
        <div className="px-5 py-4 border-b border-gray-50 space-y-3">
          <p className="label-cap">New Announcement</p>
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-1">TITLE</p>
            <input
              type="text"
              value={annTitle}
              onChange={e => setAnnTitle(e.target.value)}
              placeholder="e.g. Equipment Maintenance"
              className={inputCls}
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-1">MESSAGE</p>
            <textarea
              value={annMessage}
              onChange={e => setAnnMessage(e.target.value)}
              placeholder="Announcement details…"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-1.5">TYPE</p>
            <div className="flex gap-2">
              {(['info', 'warning', 'promo'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAnnType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black capitalize transition-all ${
                    annType === t
                      ? t === 'warning'
                        ? 'bg-amber-500 text-white'
                        : t === 'promo'
                        ? 'bg-purple-600 text-white'
                        : 'bg-black text-[#00E676]'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 mb-1">STARTS AT</p>
              <input
                type="datetime-local"
                value={annStartsAt}
                onChange={e => setAnnStartsAt(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 mb-1">EXPIRES AT</p>
              <input
                type="datetime-local"
                value={annExpiresAt}
                onChange={e => setAnnExpiresAt(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <button
            onClick={handleAddAnnouncement}
            disabled={savingAnn || !annTitle.trim() || !annMessage.trim()}
            className="h-10 px-5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-40 transition-colors"
          >
            {savingAnn ? 'Saving…' : 'Create Announcement'}
          </button>
        </div>

        {/* Announcement list */}
        <div className="divide-y divide-gray-50">
          {loadingAnn ? (
            <div className="space-y-2 p-5">
              {[1, 2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-black text-gray-300">No announcements</p>
            </div>
          ) : (
            announcements.map((ann: any) => (
              <div key={ann._id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-black text-gray-900">{ann.title}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${annTypeBadge(ann.type)}`}>
                      {ann.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{ann.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {ann.startsAt ? new Date(ann.startsAt).toLocaleString() : '—'}
                    {ann.expiresAt ? ` → ${new Date(ann.expiresAt).toLocaleString()}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(ann._id)}
                  className="p-2 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                  aria-label="Delete announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
