"use client";

import React from 'react';
import { motion } from 'framer-motion';

type Accent = 'green' | 'blue' | 'purple' | 'amber' | 'rose' | 'gray';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: Accent;
  loading?: boolean;
  Icon?: React.ComponentType<{ className?: string }>;
}

const accents: Record<Accent, { value: string; label: string; bar: string; bg: string }> = {
  green:  { value: 'text-green-600',  label: 'text-green-500',  bar: 'bg-green-400',  bg: 'bg-green-50' },
  blue:   { value: 'text-blue-600',   label: 'text-blue-500',   bar: 'bg-blue-400',   bg: 'bg-blue-50' },
  purple: { value: 'text-purple-600', label: 'text-purple-500', bar: 'bg-purple-400', bg: 'bg-purple-50' },
  amber:  { value: 'text-amber-600',  label: 'text-amber-500',  bar: 'bg-amber-400',  bg: 'bg-amber-50' },
  rose:   { value: 'text-rose-600',   label: 'text-rose-500',   bar: 'bg-rose-400',   bg: 'bg-rose-50' },
  gray:   { value: 'text-gray-600',   label: 'text-gray-500',   bar: 'bg-gray-400',   bg: 'bg-gray-50' },
};

export default function AnalyticsCard({ title, value, subtitle, accent = 'gray', loading = false }: Props) {
  const a = accents[accent];

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className={`rounded-2xl border border-gray-100 p-5 shadow-sm ${a.bg}`}
    >
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-white/60 rounded w-20" />
          <div className="h-8 bg-white/60 rounded-lg w-14 mt-3" />
          <div className="h-2 bg-white/40 rounded w-16 mt-1" />
        </div>
      ) : (
        <>
          <p className={`text-xs font-semibold uppercase tracking-wide ${a.label} mb-2`}>{title}</p>
          <p className={`text-3xl font-extrabold tabular-nums ${a.value}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </>
      )}
    </motion.div>
  );
}
