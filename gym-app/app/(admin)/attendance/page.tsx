"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  QrCode, RefreshCw, Users, UserCheck, UserX,
  ArrowUpDown, Search, Clock, ChevronDown,
} from 'lucide-react';
import QRCode from 'qrcode';

/* ── Types ── */
interface AttendanceRecord {
  userId: string;
  name: string;
  email: string;
  status: 'present' | 'absent';
  markedInAt: string | null;
  markedOutAt: string | null;
  durationMinutes: number | null;
  currentlyIn: boolean;
}
interface Summary { total: number; presentCount: number; absentCount: number; currentlyIn: number; }

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

const fmtDuration = (min: number | null) => {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ── Page ── */
export default function AttendancePage() {
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [records, setRecords]     = useState<AttendanceRecord[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [date, setDate]           = useState('');

  // Filters & sort
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [sortBy, setSortBy]             = useState<'name' | 'time'>('name');
  const [sortOrder, setSortOrder]       = useState<'asc' | 'desc'>('asc');
  const [search, setSearch]             = useState('');

  // QR code
  const [qrDataUrl, setQrDataUrl]     = useState<string>('');
  const [qrExpiry, setQrExpiry]       = useState<number>(15);
  const [qrCountdown, setQrCountdown] = useState<number>(0);
  const [qrLoading, setQrLoading]     = useState(false);
  const qrTimerRef                    = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Load attendance ── */
  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({ sort: sortBy, order: sortOrder, status: statusFilter });
      const res = await fetch(`${base}/api/admin/attendance/today?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) {
        setRecords(j.data.records || []);
        setSummary(j.data.summary || null);
        setDate(j.data.date || '');
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getAccessToken, base, sortBy, sortOrder, statusFilter]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  /* ── Auto-refresh every 60s ── */
  useEffect(() => {
    const t = setInterval(() => loadAttendance(), 60000);
    return () => clearInterval(t);
  }, [loadAttendance]);

  /* ── Generate QR code ── */
  const generateQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/attendance/qr-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!j.ok) { toast.error(j.error?.message || 'Failed to generate QR'); return; }

      const { scanUrl, expiresInMinutes } = j.data;
      setQrExpiry(expiresInMinutes);

      // Render QR to data URL
      const dataUrl = await QRCode.toDataURL(scanUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);

      // Start countdown timer
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
      let remaining = expiresInMinutes * 60;
      setQrCountdown(remaining);
      qrTimerRef.current = setInterval(() => {
        remaining -= 1;
        setQrCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(qrTimerRef.current!);
          setQrDataUrl('');
          setQrCountdown(0);
        }
      }, 1000);
    } catch { toast.error('Failed to generate QR code'); }
    finally { setQrLoading(false); }
  }, [getAccessToken, base, toast]);

  useEffect(() => () => { if (qrTimerRef.current) clearInterval(qrTimerRef.current); }, []);

  /* ── Filtered records ── */
  const filtered = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSort = (field: 'name' | 'time') => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const countdownStr = qrCountdown > 0
    ? `${Math.floor(qrCountdown / 60)}:${String(qrCountdown % 60).padStart(2, '0')}`
    : null;

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <p className="label-cap mb-1">Admin</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Attendance</h1>
          {date && <p className="text-xs text-gray-400 mt-0.5">{new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
        </div>
        <button
          onClick={loadAttendance}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-gray-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: QR + Summary ── */}
        <div className="space-y-4">

          {/* Summary cards */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { label: 'Total Active', value: summary?.total ?? '—', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Present', value: summary?.presentCount ?? '—', icon: UserCheck, color: 'text-[#00E676]', bg: 'bg-[#00E676]/10' },
              { label: 'Currently In', value: summary?.currentlyIn ?? '—', icon: QrCode, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Absent', value: summary?.absentCount ?? '—', icon: UserX, color: 'text-red-500', bg: 'bg-red-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3.5">
                <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* QR Code panel */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
              <QrCode className="w-4 h-4 text-gray-400" />
              <h3 className="font-black text-gray-900">Member Check-In QR</h3>
            </div>
            <div className="p-4 flex flex-col items-center gap-3">
              {qrDataUrl ? (
                <>
                  <div className="relative">
                    <img src={qrDataUrl} alt="Check-in QR" className="w-52 h-52 rounded-xl border border-gray-100" />
                    {countdownStr && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black text-[#00E676] text-xs font-black px-2.5 py-1 rounded-full shadow">
                        <Clock className="w-3 h-3" />
                        {countdownStr}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 text-center">Members scan this with their phone camera</p>
                  <button
                    onClick={generateQr}
                    disabled={qrLoading}
                    className="w-full h-9 rounded-xl bg-gray-100 text-gray-700 text-xs font-black hover:bg-gray-200 transition-colors disabled:opacity-40"
                  >
                    Regenerate QR
                  </button>
                </>
              ) : (
                <>
                  <div className="w-52 h-52 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
                    <QrCode className="w-12 h-12 text-gray-200" />
                    <p className="text-xs font-bold text-gray-300">No active QR</p>
                  </div>
                  <button
                    onClick={generateQr}
                    disabled={qrLoading}
                    className="w-full h-10 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 transition-colors disabled:opacity-40"
                  >
                    {qrLoading ? 'Generating…' : `Generate QR (${qrExpiry}min)`}
                  </button>
                </>
              )}
            </div>
          </motion.div>

        </div>

        {/* ── RIGHT: Attendance list ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col"
        >
          {/* Filters toolbar */}
          <div className="p-4 border-b border-gray-50 space-y-3">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search member…"
                className="bg-transparent text-sm font-bold text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>

            {/* Status filter + sort */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'present', 'absent'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-colors ${
                    statusFilter === s ? 'bg-black text-[#00E676]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s === 'all' ? `All (${summary?.total ?? 0})` :
                   s === 'present' ? `Present (${summary?.presentCount ?? 0})` :
                   `Absent (${summary?.absentCount ?? 0})`}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => toggleSort('name')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black transition-colors ${
                    sortBy === 'name' ? 'bg-black text-[#00E676]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" /> Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button
                  onClick={() => toggleSort('time')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black transition-colors ${
                    sortBy === 'time' ? 'bg-black text-[#00E676]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Clock className="w-3 h-3" /> Time {sortBy === 'time' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </button>
              </div>
            </div>
          </div>

          {/* Records list */}
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <UserCheck className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-black text-gray-300">No records found</p>
              <p className="text-xs text-gray-300 mt-1">
                {statusFilter !== 'all' ? `No ${statusFilter} members` : 'No active members yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 overflow-y-auto max-h-[600px]">
              {filtered.map(r => (
                <Link
                  key={r.userId}
                  href={`/users/${r.userId}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      r.currentlyIn ? 'bg-[#00E676] animate-pulse' :
                      r.status === 'present' ? 'bg-[#00E676]' : 'bg-gray-200'
                    }`} />
                    {/* Avatar */}
                    <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-[#00E676] text-[10px] font-black shrink-0">
                      {r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate group-hover:text-gray-700">{r.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{r.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {r.status === 'present' ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs font-black text-[#00E676]">In {fmtTime(r.markedInAt)}</span>
                          {r.markedOutAt && (
                            <span className="text-xs text-gray-400">→ Out {fmtTime(r.markedOutAt)}</span>
                          )}
                        </div>
                        {fmtDuration(r.durationMinutes) ? (
                          <p className="text-[10px] text-gray-400">{fmtDuration(r.durationMinutes)}</p>
                        ) : r.currentlyIn ? (
                          <p className="text-[10px] text-[#00E676] font-black">Currently in gym</p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-1 rounded-full bg-gray-100 text-gray-400">
                        Absent
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</p>
            <p className="text-[10px] text-gray-300">Auto-refreshes every 60s</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
