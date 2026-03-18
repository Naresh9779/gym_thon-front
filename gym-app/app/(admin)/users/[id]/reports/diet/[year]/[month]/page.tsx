'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Download } from 'lucide-react';

interface Props { params: Promise<{ id: string; year: string; month: string }> }
interface DietReport {
  year: number; month: number;
  adherenceScore: number; avgDailyCalories: number;
  avgMacros: { protein: number; carbs: number; fats: number };
  totalDaysLogged: number; generatedAt: string;
}

function exportCSV(report: DietReport, monthName: string, memberName: string) {
  const rows = [
    ['FitFlow — Diet Report', '', ''],
    ['Member', memberName, ''],
    ['Period', monthName, ''],
    ['Generated', new Date(report.generatedAt).toLocaleDateString(), ''],
    ['', '', ''],
    ['Metric', 'Value', ''],
    ['Days Logged', report.totalDaysLogged, ''],
    ['Adherence Score', `${report.adherenceScore}%`, ''],
    ['Avg Daily Calories', `${report.avgDailyCalories} kcal`, ''],
    ['Avg Protein', `${report.avgMacros.protein}g`, ''],
    ['Avg Carbs', `${report.avgMacros.carbs}g`, ''],
    ['Avg Fats', `${report.avgMacros.fats}g`, ''],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `diet-report-${monthName.replace(' ', '-')}.csv`;
  a.click();
}

export default function AdminUserDietReportPage({ params }: Props) {
  const { id, year, month } = use(params);
  const { getAccessToken } = useAuth();
  const [report, setReport] = useState<DietReport | null>(null);
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
          fetch(`${base}/api/admin/users/${id}/reports/diet/monthly/${year}/${month}`, { headers: h }),
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

  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const loggingRate = Math.round((report.totalDaysLogged / daysInMonth) * 100);

  return (
    <div className="space-y-5" id="print-area">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href={`/users/${id}/reports`} className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Reports
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="label-cap mb-1">Diet Report — {memberName}</p>
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
          { label: 'Days Logged', value: report.totalDaysLogged, sub: `of ${daysInMonth} days`, accent: 'text-[#00E676]' },
          { label: 'Adherence', value: `${report.adherenceScore}%`, sub: 'to target calories', accent: 'text-blue-500' },
          { label: 'Avg Calories', value: report.avgDailyCalories, sub: 'kcal per day', accent: 'text-[#FF6D00]' },
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
        <div className="p-4 border-b border-gray-50"><h2 className="font-black text-gray-900">Average Macros</h2></div>
        <div className="grid grid-cols-3 divide-x divide-gray-50">
          {[
            { label: 'Protein', val: report.avgMacros.protein, accent: 'text-blue-500' },
            { label: 'Carbs',   val: report.avgMacros.carbs,   accent: 'text-[#FF6D00]' },
            { label: 'Fats',    val: report.avgMacros.fats,    accent: 'text-amber-500' },
          ].map(({ label, val, accent }) => (
            <div key={label} className="p-4 text-center">
              <p className="label-cap mb-2">{label}</p>
              <p className={`text-2xl font-black num ${accent}`}>{val}<span className="text-gray-400 font-medium text-sm">g</span></p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50"><h2 className="font-black text-gray-900">Monthly Summary</h2></div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Days in Month', val: String(daysInMonth) },
            { label: 'Days Logged', val: String(report.totalDaysLogged), color: 'text-[#00E676]' },
            { label: 'Logging Rate', val: `${loggingRate}%` },
            { label: 'Adherence Score', val: `${report.adherenceScore}%` },
            { label: 'Avg Daily Calories', val: `${report.avgDailyCalories} kcal` },
          ].map(({ label, val, color }: any) => (
            <div key={label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <span className={`text-sm font-black ${color || 'text-gray-900'}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
