"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

type Accent = 'green' | 'blue' | 'purple' | 'amber' | 'rose' | 'gray';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: Accent;
  loading?: boolean;
  href?: string;
}

const accents: Record<Accent, { num: string; dot: string }> = {
  green:  { num: 'text-[#00E676]',  dot: 'bg-[#00E676]' },
  blue:   { num: 'text-blue-500',   dot: 'bg-blue-400' },
  purple: { num: 'text-purple-500', dot: 'bg-purple-400' },
  amber:  { num: 'text-amber-500',  dot: 'bg-amber-400' },
  rose:   { num: 'text-rose-500',   dot: 'bg-rose-400' },
  gray:   { num: 'text-gray-700',   dot: 'bg-gray-400' },
};

export default function AnalyticsCard({ title, value, subtitle, accent = 'gray', loading = false, href }: Props) {
  const a = accents[accent];
  const inner = loading ? (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-gray-100 rounded w-20" />
      <div className="h-10 bg-gray-100 rounded-xl w-16 mt-3" />
      <div className="h-2 bg-gray-100 rounded w-14 mt-1" />
    </div>
  ) : (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
          <p className="label-cap">{title}</p>
        </div>
        {href && <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />}
      </div>
      <p className={`text-4xl font-black num leading-none ${a.num}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 font-medium mt-2">{subtitle}</p>}
    </>
  );

  if (href && !loading) {
    return (
      <motion.div
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      >
        <Link
          href={href}
          className="group block bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all"
        >
          {inner}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className="bg-white rounded-2xl border border-gray-100 p-5"
    >
      {inner}
    </motion.div>
  );
}
