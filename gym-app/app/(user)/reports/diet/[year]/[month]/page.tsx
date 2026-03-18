'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Download } from 'lucide-react';

async function exportPDF(report: DietReport, monthName: string) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();

  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('FitFlow — Diet Report', 14, 22);
  doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(monthName, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

  const tableBody: (string | number)[][] = [
    ['Days Logged', String(report.totalDaysLogged)],
    ['Adherence Score', `${report.adherenceScore}%`],
    ['Avg Daily Calories', `${report.avgDailyCalories} kcal`],
    ['Avg Protein', `${report.avgMacros.protein}g`],
    ['Avg Carbs', `${report.avgMacros.carbs}g`],
    ['Avg Fats', `${report.avgMacros.fats}g`],
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

  doc.save(`diet-report-${monthName.replace(' ', '-').toLowerCase()}.pdf`);
}

function exportCSV(report: DietReport, monthName: string) {
  const rows = [
    ['FitFlow — Diet Report', ''],
    ['Period', monthName],
    ['Generated', new Date(report.generatedAt).toLocaleDateString()],
    [''],
    ['Metric', 'Value'],
    ['Days Logged', report.totalDaysLogged],
    ['Adherence Score', `${report.adherenceScore}%`],
    ['Avg Daily Calories', `${report.avgDailyCalories} kcal`],
    ['Avg Protein', `${report.avgMacros.protein}g`],
    ['Avg Carbs', `${report.avgMacros.carbs}g`],
    ['Avg Fats', `${report.avgMacros.fats}g`],
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
  a.download = `diet-report-${monthName.replace(' ', '-')}.csv`;
  a.click();
}

interface Props {
  params: Promise<{ year: string; month: string }>;
}

interface DietReport {
  _id: string;
  year: number;
  month: number;
  adherenceScore: number;
  avgDailyCalories: number;
  avgMacros: { protein: number; carbs: number; fats: number };
  totalDaysLogged: number;
  leaveDaysCount?: number;
  leaveDates?: string[];
  generatedAt: string;
}

export default function MonthlyDietReportPage({ params }: Props) {
  const { year, month } = use(params);
  const { getAccessToken } = useAuth();
  const [report, setReport] = useState<DietReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reports/diet/monthly/${year}/${month}`,
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

  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const loggingRate = Math.round((report.totalDaysLogged / daysInMonth) * 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/reports" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Reports
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="label-cap mb-1">Diet Report</p>
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
          { label: 'Days Logged', value: report.totalDaysLogged, sub: `of ${daysInMonth} days`, accent: 'text-[#00E676]' },
          { label: 'Adherence', value: `${report.adherenceScore}%`, sub: 'to target calories', accent: 'text-blue-500' },
          { label: 'Avg Calories', value: report.avgDailyCalories, sub: 'kcal per day', accent: 'text-[#FF6D00]' },
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

      {/* Average Macros */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-black text-gray-900">Average Macros</h2>
          <p className="text-xs text-gray-400 mt-0.5">Daily intake average</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-50">
          {[
            { label: 'Protein', val: report.avgMacros.protein, accent: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Carbs', val: report.avgMacros.carbs, accent: 'text-[#FF6D00]', bg: 'bg-[#FF6D00]/5' },
            { label: 'Fats', val: report.avgMacros.fats, accent: 'text-amber-500', bg: 'bg-amber-50' },
          ].map(({ label, val, accent }) => (
            <div key={label} className="p-4 text-center">
              <p className="label-cap mb-2">{label}</p>
              <p className={`text-2xl font-black num ${accent}`}>{val}<span className="text-gray-400 font-medium text-sm">g</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-black text-gray-900">Monthly Summary</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Days in Month', val: String(daysInMonth), color: '' },
            { label: 'Days Logged', val: String(report.totalDaysLogged), color: 'text-[#00E676]' },
            { label: 'Logging Rate', val: `${loggingRate}%`, color: '' },
            { label: 'Adherence Score', val: `${report.adherenceScore}%`, color: '' },
            { label: 'Avg Daily Calories', val: `${report.avgDailyCalories} kcal`, color: '' },
            ...(report.leaveDaysCount ? [{ label: 'Leave Days (excluded)', val: String(report.leaveDaysCount), color: 'text-amber-500' }] : []),
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
          {loggingRate >= 80 && (
            <div className="flex items-start gap-3 p-3 bg-[#00E676]/5 rounded-xl border border-[#00E676]/20">
              <div className="w-1.5 h-1.5 bg-[#00E676] rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">Excellent tracking! You logged {loggingRate}% of days this month.</p>
            </div>
          )}
          {loggingRate >= 50 && loggingRate < 80 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">Good effort! Try to log your meals more consistently next month.</p>
            </div>
          )}
          {loggingRate < 50 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">Consistent tracking is key to reaching your goals. Aim for at least 20 days next month!</p>
            </div>
          )}
          {report.adherenceScore >= 90 && report.adherenceScore <= 110 && (
            <div className="flex items-start gap-3 p-3 bg-[#00E676]/5 rounded-xl border border-[#00E676]/20">
              <div className="w-1.5 h-1.5 bg-[#00E676] rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-700">Great adherence! You're staying close to your target calories.</p>
            </div>
          )}
          {report.avgMacros.protein > 0 && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0" />
              <p className="text-sm font-medium text-gray-600">Your average protein intake was {report.avgMacros.protein}g per day.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
