'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Download } from 'lucide-react';

interface Props { params: Promise<{ id: string; year: string; month: string }> }
interface WorkoutReport {
  year: number; month: number;
  completedWorkouts: number; totalWorkouts: number;
  adherenceScore: number; avgDuration: number; generatedAt: string;
}

function exportCSV(report: WorkoutReport, monthName: string, memberName: string) {
  const rows = [
    ['FitFlow — Workout Report', '', ''],
    ['Member', memberName, ''],
    ['Period', monthName, ''],
    ['Generated', new Date(report.generatedAt).toLocaleDateString(), ''],
    ['', '', ''],
    ['Metric', 'Value', ''],
    ['Completed Workouts', report.completedWorkouts, ''],
    ['Total Planned', report.totalWorkouts, ''],
    ['Adherence Score', `${report.adherenceScore}%`, ''],
    ['Avg Duration', `${Math.round(report.avgDuration / 60)} min`, ''],
    ['Missed Workouts', report.totalWorkouts - report.completedWorkouts, ''],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `workout-report-${monthName.replace(' ', '-')}.csv`;
  a.click();
}

export default function AdminUserWorkoutReportPage({ params }: Props) {
  const { id, year, month } = use(params);
  const { getAccessToken } = useAuth();
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [memberName, setMemberName] = useState('Member');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monthName = new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    async function load() {
      try {
        const token = getAccessToken();
        const h = { Authorization: `Bearer ${token}` };
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const [rRes, uRes] = await Promise.all([
          fetch(`${base}/api/admin/users/${id}/reports/workout/monthly/${year}/${month}`, { headers: h }),
          fetch(`${base}/api/admin/users`, { headers: h }),
        ]);
        const [rJson, uJson] = await Promise.all([rRes.json(), uRes.json()]);
        if (rJson.ok) setReport(rJson.data.report);
        else setError(rJson.error?.message || 'Failed to load');
        if (uJson.ok) {
          const u = uJson.data.users?.find((u: any) => u._id === id);
          if (u) setMemberName(u.name);
        }
      } catch { setError('Failed to fetch report'); }
      finally { setLoading(false); }
    }
    load();
  }, [id, year, month, getAccessToken]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" /></div>;
  if (error || !report) return <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-semibold text-red-600">{error || 'Report not found'}</div>;

  const avgMinutes = Math.round(report.avgDuration / 60);

  return (
    <div className="space-y-5" id="print-area">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href={`/users/${id}/reports`} className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Reports
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="label-cap mb-1">Workout Report — {memberName}</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{monthName}</h1>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => exportCSV(report, monthName, memberName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-[#00E676] text-xs font-black hover:bg-gray-900 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-3 gap-3" initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
        {[
          { label: 'Completed', value: report.completedWorkouts, sub: `of ${report.totalWorkouts} planned`, accent: 'text-[#00E676]' },
          { label: 'Adherence', value: `${report.adherenceScore}%`, sub: 'completion rate', accent: 'text-blue-500' },
          { label: 'Avg Duration', value: avgMinutes, sub: 'min per session', accent: 'text-[#FF6D00]' },
        ].map(({ label, value, sub, accent }) => (
          <motion.div key={label} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="label-cap mb-2">{label}</p>
            <p className={`text-3xl font-black num ${accent}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50"><h2 className="font-black text-gray-900">Monthly Summary</h2></div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Total Workouts', val: report.totalWorkouts },
            { label: 'Completed', val: report.completedWorkouts, color: 'text-[#00E676]' },
            { label: 'Missed', val: report.totalWorkouts - report.completedWorkouts, color: 'text-red-500' },
            { label: 'Adherence Score', val: `${report.adherenceScore}%` },
            { label: 'Avg Duration', val: `${avgMinutes} min` },
          ].map(({ label, val, color }: any) => (
            <div key={label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <span className={`text-sm font-black ${color || 'text-gray-900'}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-black text-gray-900 mb-3">Trainer Notes</h2>
        {report.adherenceScore >= 80
          ? <div className="p-3 bg-[#00E676]/5 border border-[#00E676]/20 rounded-xl text-sm text-gray-700">Excellent effort — {report.adherenceScore}% adherence this month.</div>
          : report.adherenceScore >= 60
          ? <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-gray-700">Good progress — {report.adherenceScore}% adherence. Encourage to push for 80%+ next month.</div>
          : <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-gray-700">Needs attention — only {report.adherenceScore}% adherence. Consider checking in with this member.</div>
        }
      </div>
    </div>
  );
}
