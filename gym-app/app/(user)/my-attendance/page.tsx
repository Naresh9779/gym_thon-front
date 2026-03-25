"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { LogOut, Clock, QrCode, CheckCircle2, XCircle, CalendarDays, Loader2, Timer, Umbrella, Building2 } from "lucide-react";

interface TodayData {
  attendanceEnabled: boolean;
  autoMarkOutHours?: number;
  attendance: {
    markedInAt?: string;
    markedOutAt?: string;
    status: string;
    durationMinutes?: number;
    autoMarkedOut?: boolean;
  } | null;
}

interface HistoryRecord {
  date: string;
  status: "present" | "absent" | "leave" | "holiday";
  markedInAt?: string | null;
  markedOutAt?: string | null;
  durationMinutes?: number | null;
  autoMarkedOut?: boolean;
  reason?: string;
}

interface Summary {
  presentDays: number; absentDays: number; leaveDays: number;
  holidayDays: number; totalDays: number; totalMinutes: number;
}

const base = process.env.NEXT_PUBLIC_API_BASE_URL;

const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
const fmtDur = (mins?: number | null) => {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function ElapsedTimer({ from }: { from: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(from).getTime()) / 1000));
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [from]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  return <span>{h > 0 ? `${h}h ${m}m` : `${m}m`} elapsed</span>;
}

export default function UserAttendancePage() {
  const { getAccessToken } = useAuth();
  const toast = useToast();

  const [today, setToday] = useState<TodayData | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingOut, setMarkingOut] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    const headers = { Authorization: `Bearer ${token}` };
    const [todayRes, histRes] = await Promise.all([
      fetch(`${base}/api/attendance/today`, { headers }),
      fetch(`${base}/api/attendance/history?days=30`, { headers }),
    ]);
    const [tj, hj] = await Promise.all([todayRes.json(), histRes.json()]);
    if (tj.ok) setToday(tj.data);
    if (hj.ok && hj.data.attendanceEnabled) {
      setHistory(hj.data.records ?? []);
      setSummary(hj.data.summary ?? null);
    }
    setLoading(false);
  }, [getAccessToken]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkOut() {
    setMarkingOut(true);
    const token = getAccessToken();
    const res = await fetch(`${base}/api/attendance/mark-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setMarkingOut(false);
    if (json.ok) {
      toast.success("Checked out successfully!");
      load();
    } else {
      toast.error(json.error?.message || "Failed to mark out");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!today?.attendanceEnabled) {
    return (
      <div className="space-y-4 pb-6">
        <div>
          <p className="label-cap mb-1">Attendance</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Attendance</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-black text-gray-700 mb-1">Attendance Not Enabled</p>
          <p className="text-sm text-gray-400">Your gym hasn't enabled the attendance system yet.</p>
        </div>
      </div>
    );
  }

  const att = today.attendance;
  const isCheckedIn = !!att?.markedInAt && !att?.markedOutAt;
  const isComplete = !!att?.markedInAt && !!att?.markedOutAt;
  const notCheckedIn = !att?.markedInAt;

  const totalHours = summary ? Math.floor(summary.totalMinutes / 60) : 0;
  const totalMinsRem = summary ? summary.totalMinutes % 60 : 0;

  return (
    <div className="space-y-4 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">My Activity</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Attendance</h1>
      </motion.div>

      {/* ── Today's Status Card ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {notCheckedIn && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="font-black text-gray-900">Today</p>
                <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              <span className="ml-auto bg-gray-100 text-gray-500 text-xs font-black px-2.5 py-1 rounded-lg">Not Checked In</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <QrCode className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-400">Scan the gym QR code to check in</p>
            </div>
          </div>
        )}

        {isCheckedIn && (
          <div className="bg-black rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-[#00E676] rounded-full animate-pulse" />
              <p className="text-sm font-black text-[#00E676]">Currently In Gym</p>
              <span className="ml-auto text-xs text-gray-400">
                {att?.markedInAt && <ElapsedTimer from={att.markedInAt} />}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-[#00E676]/10 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-[#00E676]" />
              </div>
              <div>
                <p className="text-white font-black text-lg">Checked In</p>
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{fmt(att?.markedInAt)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleMarkOut}
              disabled={markingOut}
              className="w-full flex items-center justify-center gap-2 bg-[#00E676] text-black font-black text-sm py-3 rounded-xl hover:bg-[#00c864] transition-colors disabled:opacity-60"
            >
              {markingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {markingOut ? "Marking Out…" : "Mark Out Now"}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">
              Auto mark-out after {today.autoMarkOutHours}h if you forget
            </p>
          </div>
        )}

        {isComplete && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00E676]/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#00E676]" />
              </div>
              <div>
                <p className="font-black text-gray-900">Session Complete</p>
                <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              {att?.autoMarkedOut && (
                <span className="ml-auto text-[10px] font-black bg-amber-50 text-amber-500 px-2 py-1 rounded-lg">Auto out</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 font-bold mb-1">In</p>
                <p className="font-black text-gray-900 text-sm">{fmt(att?.markedInAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 font-bold mb-1">Out</p>
                <p className="font-black text-gray-900 text-sm">{fmt(att?.markedOutAt)}</p>
              </div>
              <div className="bg-black rounded-xl p-3 text-center">
                <p className="text-xs text-[#00E676]/70 font-bold mb-1">Duration</p>
                <p className="font-black text-[#00E676] text-sm">{fmtDur(att?.durationMinutes) ?? "—"}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Monthly Summary ── */}
      {summary && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-black text-[#00E676]">{summary.presentDays}</p>
              <p className="text-xs text-gray-400 font-bold mt-1">Present</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-black text-gray-900">{summary.absentDays}</p>
              <p className="text-xs text-gray-400 font-bold mt-1">Absent</p>
            </div>
            {summary.leaveDays > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-black text-blue-500">{summary.leaveDays}</p>
                <p className="text-xs text-gray-400 font-bold mt-1">On Leave</p>
              </div>
            )}
            {summary.holidayDays > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-black text-purple-500">{summary.holidayDays}</p>
                <p className="text-xs text-gray-400 font-bold mt-1">Holidays</p>
              </div>
            )}
            <div className={`bg-white rounded-2xl border border-gray-100 p-4 text-center ${summary.leaveDays === 0 && summary.holidayDays === 0 ? 'col-span-2' : ''}`}>
              <p className="text-2xl font-black text-gray-900">{totalHours > 0 ? `${totalHours}h ${totalMinsRem}m` : `${totalMinsRem}m`}</p>
              <p className="text-xs text-gray-400 font-bold mt-1">Total Time</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── History List ── */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h3 className="font-black text-gray-900">Last 30 Days</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {history.map((r) => {
                const statusConfig = {
                  present: { bg: "bg-[#00E676]/10", icon: <CheckCircle2 className="w-4 h-4 text-[#00E676]" />, label: null },
                  absent:  { bg: "bg-gray-100",      icon: <XCircle className="w-4 h-4 text-gray-300" />,        label: <span className="text-xs font-bold text-gray-300">Absent</span> },
                  leave:   { bg: "bg-blue-50",        icon: <Umbrella className="w-4 h-4 text-blue-400" />,       label: <span className="text-xs font-bold text-blue-400">Leave</span> },
                  holiday: { bg: "bg-purple-50",      icon: <Building2 className="w-4 h-4 text-purple-400" />,    label: <span className="text-xs font-bold text-purple-400">Holiday</span> },
                }[r.status];
                return (
                  <div key={r.date} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${statusConfig.bg}`}>
                      {statusConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900">{fmtDate(r.date)}</p>
                      {r.status === "present" && r.markedInAt && (
                        <p className="text-xs text-gray-400">
                          {fmt(r.markedInAt)} – {r.markedOutAt ? fmt(r.markedOutAt) : "still in"}
                          {r.autoMarkedOut && " (auto)"}
                        </p>
                      )}
                      {r.status === "holiday" && r.reason && (
                        <p className="text-xs text-purple-400">{r.reason}</p>
                      )}
                    </div>
                    {r.status === "present" && r.durationMinutes ? (
                      <span className="text-xs font-black text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                        {fmtDur(r.durationMinutes)}
                      </span>
                    ) : statusConfig.label}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {history.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="font-black text-gray-500">No attendance records yet</p>
          <p className="text-xs text-gray-400 mt-1">Scan the gym QR code to start tracking</p>
        </div>
      )}
    </div>
  );
}
