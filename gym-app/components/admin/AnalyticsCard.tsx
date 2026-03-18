"use client";

import { motion } from 'framer-motion';

type Accent = 'green' | 'blue' | 'purple' | 'amber' | 'rose' | 'gray';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: Accent;
  loading?: boolean;
}

const accents: Record<Accent, { num: string; dot: string }> = {
  green:  { num: 'text-[#00E676]',  dot: 'bg-[#00E676]' },
  blue:   { num: 'text-blue-500',   dot: 'bg-blue-400' },
  purple: { num: 'text-purple-500', dot: 'bg-purple-400' },
  amber:  { num: 'text-amber-500',  dot: 'bg-amber-400' },
  rose:   { num: 'text-rose-500',   dot: 'bg-rose-400' },
  gray:   { num: 'text-gray-700',   dot: 'bg-gray-400' },
};

export default function AnalyticsCard({ title, value, subtitle, accent = 'gray', loading = false }: Props) {
  const a = accents[accent];
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className="bg-white rounded-2xl border border-gray-100 p-5"
    >
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-gray-100 rounded w-20" />
          <div className="h-10 bg-gray-100 rounded-xl w-16 mt-3" />
          <div className="h-2 bg-gray-100 rounded w-14 mt-1" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mb-3">
            <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
            <p className="label-cap">{title}</p>
          </div>
          <p className={`text-4xl font-black num leading-none ${a.num}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 font-medium mt-2">{subtitle}</p>}
        </>
      )}
    </motion.div>
  );
}
