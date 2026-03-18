'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Dumbbell, Salad, ChevronRight } from 'lucide-react';

export default function ReportsPage() {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(cy, cm - 1 - i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      name: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  });

  const sections = [
    { key: 'workout', label: 'Workout Reports', sub: 'Monthly training stats', icon: Dumbbell, color: 'text-[#00E676]', bg: 'bg-[#00E676]/10', base: '/reports/workout' },
    { key: 'diet',    label: 'Diet Reports',    sub: 'Monthly nutrition stats', icon: Salad,   color: 'text-[#FF6D00]', bg: 'bg-[#FF6D00]/10', base: '/reports/diet'    },
  ];

  return (
    <div className="space-y-4 pb-6">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">History</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reports</h1>
      </motion.div>

      {sections.map(({ key, label, sub, icon: Icon, color, bg, base }, si) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.08 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          {/* Section header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-50">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 leading-tight">{label}</h3>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>

          {/* Month links */}
          <div className="divide-y divide-gray-50">
            {months.map((m, i) => (
              <Link
                key={i}
                href={`${base}/${m.year}/${m.month}`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black num ${i === 0 ? color : 'text-gray-300'}`}>
                    {String(m.month).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-bold text-gray-800">{m.name}</span>
                  {i === 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      current
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
