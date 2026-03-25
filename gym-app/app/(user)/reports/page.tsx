'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Dumbbell, Salad, CalendarDays, ChevronRight, CheckCircle2, XCircle, Umbrella, Building2 } from 'lucide-react';

type Tab = 'workout' | 'diet' | 'attendance';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'leave' | 'holiday';
  markedInAt?: string | null;
  markedOutAt?: string | null;
  durationMinutes?: number | null;
  reason?: string;
}

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const fmtDur = (mins?: number | null) => {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const now = new Date();
const months = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1, name: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
});

export default function ReportsPage() {
  const { getAccessToken } = useAuth();
  const [tab, setTab] = useState<Tab>('workout');
  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([]);
  const [attEnabled, setAttEnabled] = useState(false);
  const [attSummary, setAttSummary] = useState<{ presentDays: number; absentDays: number; leaveDays: number; holidayDays: number; totalDays: number; totalMinutes: number } | null>(null);
  const [attLoading, setAttLoading] = useState(false);
  const [attFetched, setAttFetched] = useState(false);

  useEffect(() => {
    if (tab !== 'attendance' || attFetched || attLoading) return;
    setAttLoading(true);
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    fetch(`${base}/api/attendance/history?days=60`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    })
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          setAttEnabled(j.data.attendanceEnabled);
          setAttRecords(j.data.records ?? []);
          setAttSummary(j.data.summary ?? null);
        }
      })
      .finally(() => { setAttLoading(false); setAttFetched(true); });
  }, [tab, attFetched, attLoading, getAccessToken]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'workout',    label: 'Workout',    icon: Dumbbell },
    { key: 'diet',       label: 'Diet',       icon: Salad },
    { key: 'attendance', label: 'Attendance', icon: CalendarDays },
  ];

  return (
    <div className="space-y-4 pb-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">History</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reports</h1>
      </motion.div>

      {/* Horizontal tabs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black transition-all ${
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* ─ Workout Tab ─ */}
        {tab === 'workout' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00E676]/10">
                <Dumbbell className="w-4 h-4 text-[#00E676]" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 leading-tight">Workout Reports</h3>
                <p className="text-xs text-gray-400">Monthly training stats</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {months.map((m, i) => (
                <Link
                  key={i}
                  href={`/reports/workout/${m.year}/${m.month}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black num ${i === 0 ? 'text-[#00E676]' : 'text-gray-300'}`}>
                      {String(m.month).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{m.name}</span>
                    {i === 0 && (
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">current</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─ Diet Tab ─ */}
        {tab === 'diet' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF6D00]/10">
                <Salad className="w-4 h-4 text-[#FF6D00]" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 leading-tight">Diet Reports</h3>
                <p className="text-xs text-gray-400">Monthly nutrition stats</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {months.map((m, i) => (
                <Link
                  key={i}
                  href={`/reports/diet/${m.year}/${m.month}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black num ${i === 0 ? 'text-[#FF6D00]' : 'text-gray-300'}`}>
                      {String(m.month).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{m.name}</span>
                    {i === 0 && (
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">current</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─ Attendance Tab ─ */}
        {tab === 'attendance' && (
          <div className="space-y-4">
            {attLoading && (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
              </div>
            )}

            {!attLoading && !attEnabled && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="font-black text-gray-500">Attendance Not Enabled</p>
                <p className="text-xs text-gray-400 mt-1">Your gym hasn't enabled the attendance system yet.</p>
              </div>
            )}

            {!attLoading && attEnabled && attSummary && (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-black text-[#00E676]">{attSummary.presentDays}</p>
                    <p className="text-[11px] text-gray-400 font-bold mt-1">Present</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-black text-gray-900">{attSummary.absentDays}</p>
                    <p className="text-[11px] text-gray-400 font-bold mt-1">Absent</p>
                  </div>
                  {attSummary.leaveDays > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                      <p className="text-2xl font-black text-blue-500">{attSummary.leaveDays}</p>
                      <p className="text-[11px] text-gray-400 font-bold mt-1">On Leave</p>
                    </div>
                  )}
                  {attSummary.holidayDays > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                      <p className="text-2xl font-black text-purple-500">{attSummary.holidayDays}</p>
                      <p className="text-[11px] text-gray-400 font-bold mt-1">Holidays</p>
                    </div>
                  )}
                  <div className={attSummary.leaveDays === 0 && attSummary.holidayDays === 0 ? 'col-span-2' : ''}>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                      <p className="text-2xl font-black text-gray-900">
                        {attSummary.totalMinutes >= 60 ? `${Math.floor(attSummary.totalMinutes / 60)}h` : `${attSummary.totalMinutes}m`}
                      </p>
                      <p className="text-[11px] text-gray-400 font-bold mt-1">Total Time</p>
                    </div>
                  </div>
                </div>

                {/* Record list */}
                {attRecords.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <p className="font-black text-gray-400">No records yet</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="font-black text-gray-900">Last 60 Days</h3>
                      <Link href="/my-attendance" className="text-xs font-bold text-gray-400 hover:text-gray-700">Full View →</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {attRecords.map((r) => {
                        const sc = {
                          present: { bg: 'bg-[#00E676]/10', icon: <CheckCircle2 className="w-4 h-4 text-[#00E676]" />, tag: null },
                          absent:  { bg: 'bg-gray-100',      icon: <XCircle className="w-4 h-4 text-gray-300" />,        tag: <span className="text-xs font-bold text-gray-300">Absent</span> },
                          leave:   { bg: 'bg-blue-50',        icon: <Umbrella className="w-4 h-4 text-blue-400" />,       tag: <span className="text-xs font-bold text-blue-400">Leave</span> },
                          holiday: { bg: 'bg-purple-50',      icon: <Building2 className="w-4 h-4 text-purple-400" />,    tag: <span className="text-xs font-bold text-purple-400">Holiday</span> },
                        }[r.status];
                        return (
                          <div key={r.date} className="flex items-center gap-3 px-4 py-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sc.bg}`}>{sc.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-gray-900">
                                {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </p>
                              {r.status === 'present' && r.markedInAt && (
                                <p className="text-xs text-gray-400">{fmt(r.markedInAt)} – {r.markedOutAt ? fmt(r.markedOutAt) : 'no checkout'}</p>
                              )}
                              {r.status === 'holiday' && r.reason && <p className="text-xs text-purple-400">{r.reason}</p>}
                            </div>
                            {r.status === 'present' && r.durationMinutes
                              ? <span className="text-xs font-black text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">{fmtDur(r.durationMinutes)}</span>
                              : sc.tag}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
