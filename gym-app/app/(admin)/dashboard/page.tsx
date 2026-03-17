"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AnalyticsCard from '@/components/admin/AnalyticsCard';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Flame, Users, LayoutDashboard, TrendingUp, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { getAccessToken } = useAuth();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = getAccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) setMetrics(json.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAccessToken]);

  const quickActions = [
    { label: 'Generate Workout', href: '/generate/workout', icon: Zap, gradient: 'from-green-500 to-emerald-600' },
    { label: 'Generate Diet', href: '/generate/diet', icon: Flame, gradient: 'from-orange-500 to-red-500' },
    { label: 'Manage Users', href: '/users', icon: Users, gradient: 'from-indigo-500 to-blue-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Here's what's happening today</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${a.gradient} text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}
              >
                <Icon className="w-4 h-4" /> {a.label}
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Metric cards */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        <AnalyticsCard
          title="Total Users"
          value={loading ? '—' : (metrics?.usersCount ?? '—')}
          subtitle="Registered users"
          accent="green"
          loading={loading}
        />
        <AnalyticsCard
          title="Workout Plans"
          value={loading ? '—' : (metrics?.workoutPlansCount ?? '—')}
          subtitle="All time"
          accent="blue"
          loading={loading}
        />
        <AnalyticsCard
          title="Active Workouts"
          value={loading ? '—' : (metrics?.activeWorkoutPlans ?? '—')}
          subtitle="Currently active"
          accent="purple"
          loading={loading}
        />
        <AnalyticsCard
          title="Diet Plans"
          value={loading ? '—' : (metrics?.dietPlansCount ?? '—')}
          subtitle="All time"
          accent="amber"
          loading={loading}
        />
      </motion.div>

      {/* Info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-gray-400" />
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'New user registered', sub: 'Recent signups appear here' },
              { label: 'Plan events', sub: 'Recent plan activity' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
                <span className="text-xs text-gray-300 font-mono">—</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h3 className="font-bold text-gray-900">Quick Stats</h3>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                  <span className="text-sm text-gray-700 font-medium">Users</span>
                  <span className="text-sm font-bold text-green-600">{metrics?.usersCount ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                  <span className="text-sm text-gray-700 font-medium">Workout Plans</span>
                  <span className="text-sm font-bold text-blue-600">{metrics?.workoutPlansCount ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
                  <span className="text-sm text-gray-700 font-medium">Diet Plans</span>
                  <span className="text-sm font-bold text-orange-500">{metrics?.dietPlansCount ?? 0}</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
