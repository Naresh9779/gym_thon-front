'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Dumbbell, Salad, ChevronRight } from 'lucide-react';

interface Props { params: Promise<{ id: string }> }

export default function AdminUserReportsPage({ params }: Props) {
  const { id } = use(params);
  const now = new Date();

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  });

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href={`/users/${id}`} className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Member
        </Link>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Member Reports</h1>
      </motion.div>

      {[
        { type: 'workout', icon: Dumbbell, label: 'Workout Reports', accent: 'text-[#00E676]', bg: 'bg-[#00E676]/10' },
        { type: 'diet',    icon: Salad,    label: 'Diet Reports',    accent: 'text-[#FF6D00]', bg: 'bg-[#FF6D00]/10' },
      ].map(({ type, icon: Icon, label, accent, bg }) => (
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="flex items-center gap-3 p-4 border-b border-gray-50">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-4 h-4 ${accent}`} />
            </div>
            <h2 className="font-black text-gray-900">{label}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {months.map(({ year, month, label: monthLabel }) => (
              <Link
                key={`${year}-${month}`}
                href={`/users/${id}/reports/${type}/${year}/${month}`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm font-bold text-gray-700">{monthLabel}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
