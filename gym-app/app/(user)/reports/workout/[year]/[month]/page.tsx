'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Download } from 'lucide-react';

async function exportPDF(report: WorkoutReport, monthName: string) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  const avgMinutes = Math.round(report.avgDuration / 60);
  const missed = report.totalWorkouts - report.completedWorkouts;

  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('FitFlow — Workout Report', 14, 22);
  doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(monthName, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

  const tableBody: (string | number)[][] = [
    ['Completed Workouts', String(report.completedWorkouts)],
    ['Total Planned', String(report.totalWorkouts)],
    ['Missed Workouts', String(missed)],
    ['Completion Rate', `${Math.round((report.completedWorkouts / Math.max(report.totalWorkouts, 1)) * 100)}%`],
    ['Adherence Score', `${report.adherenceScore}%`],
    ['Avg Duration', `${avgMinutes} min`],
  ];
  if (report.leaveDaysCount) {
    tableBody.push(['Leave Days (excluded)', String(report.leaveDaysCount)]);
  }

  autoTable(doc, {
    startY: 46,
    head: [['Metric', 'Value']],
    body: tableBody,
    headStyles: { fillColor: [0, 0, 0], textColor: [0, 230, 118] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  if (report.leaveDates && report.leaveDates.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Leave Days', 14, finalY + 10);
    autoTable(doc, {
      startY: finalY + 14,
      head: [['Date']],
      body: report.leaveDates.map(d => [d]),
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
    });
  }

  doc.save(`workout-report-${monthName.replace(' ', '-').toLowerCase()}.pdf`);
}

function exportCSV(report: WorkoutReport, monthName: string) {
  const rows = [
    ['FitFlow — Workout Report', ''],
    ['Period', monthName],
    ['Generated', new Date(report.generatedAt).toLocaleDateString()],
    [''],
    ['Metric', 'Value'],
    ['Completed Workouts', report.completedWorkouts],
    ['Total Planned', report.totalWorkouts],
    ['Adherence Score', `${report.adherenceScore}%`],
    ['Avg Duration', `${Math.round(report.avgDuration / 60)} min`],
    ['Missed Workouts', report.totalWorkouts - report.completedWorkouts],
    ['Leave Days (excluded)', report.leaveDaysCount ?? 0],
  ];
  if (report.leaveDates && report.leaveDates.length > 0) {
    rows.push(['']);
    rows.push(['Leave Dates', '']);
    report.leaveDates.forEach((d: string) => rows.push([d, '']));
  }
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `workout-report-${monthName.replace(' ', '-')}.csv`;
  a.click();
}

interface Props {
  params: Promise<{ year: string; month: string }>;
}

interface WorkoutReport {
  _id: string;
  year: number;
  month: number;
  completedWorkouts: number;
  totalWorkouts: number;
  adherenceScore: number;
  avgDuration: number;
  leaveDaysCount?: number;
  leaveDates?: string[];
  generatedAt: string;
}

export default function MonthlyWorkoutReportPage({ params }: Props) {
  const { year, month } = use(params);
  const { getAccessToken } = useAuth();
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reports/workout/monthly/${year}/${month}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (json.ok) setReport(json.data.report);
        else setError(json.error?.message || 'Failed to load report');
      } catch {
        setError('Failed to fetch report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [year, month, getAccessToken]);

  const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric'
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !report) return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-semibold text-red-600">
      {error || 'Report not found'}
    </div>
  );

  const completionRate = report.totalWorkouts > 0
    ? Math.round((report.completedWorkouts / report.totalWorkouts) * 100)
    : 0;
  const avgMinutes = Math.round(report.avgDuration / 60);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/reports" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Reports
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="label-cap mb-1">Workout Report</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{monthName}</h1>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => exportCSV(report, monthName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => exportPDF(report, monthName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-[#00E676] text-xs font-black hover:bg-gray-900 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </motion.div>

      {/* Key stats */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {[
          { label: 'Completed', value: report.completedWorkouts, sub: `of ${report.totalWorkouts} planned`, accent: 'text-[#00E676]' },
          { label: 'Adherence', value: `${report.adherenceScore}%`, sub: 'completion rate', accent: 'text-blue-500' },
          { label: 'Avg Duration', value: avgMinutes, sub: 'min per session', accent: 'text-[#FF6D00]' },
        ].map(({ label, value, sub, accent }) => (
          <motion.div
            key={label}
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="bg-white rounded-2xl border border-gray-100 p-4"
          >
            <p className="label-cap mb-2">{label}</p>
            <p className={`text-3xl font-black num ${accent}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-black text-gray-900">Monthly Summary</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Total Workouts', val: report.totalWorkouts, color: '' },
            { label: 'Completed', val: report.completedWorkouts, color: 'text-[#00E676]' },
            { label: 'Missed', val: report.totalWorkouts - report.completedWorkouts, color: 'text-red-500' },
            { label: 'Completion Rate', val: `${completionRate}%`, color: '' },
            { label: 'Avg Duration', val: `${avgMinutes} min`, color: '' },
            ...(report.leaveDaysCount ? [{ label: 'Leave Days (excluded)', val: report.leaveDaysCount, color: 'text-amber-500' }] : []),
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <span className={`text-sm font-black ${color || 'text-gray-900'}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-black text-gray-900">Insights</h2>
        </div>
        <div className="p-5 space-y-3">
          {report.adherenceScore >= 80 && (
            <div className="flex items-start gap-3 p-3 bg-[#00E676]/5 rounded-xl border border-[#00E676]/20">
              <div className="w-1.5 h-1.5 bg-[#00E676] rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">Excellent! You completed {report.adherenceScore}% of your planned workouts this month.</p>
            </div>
          )}
          {report.adherenceScore >= 60 && report.adherenceScore < 80 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">Good effort! You completed {report.adherenceScore}% of your workouts. Try to stay more consistent next month.</p>
            </div>
          )}
          {report.adherenceScore < 60 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">Keep pushing! Aim for at least 60% adherence next month for better results.</p>
            </div>
          )}
          {avgMinutes > 0 && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-600">Your average workout lasted {avgMinutes} minutes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
