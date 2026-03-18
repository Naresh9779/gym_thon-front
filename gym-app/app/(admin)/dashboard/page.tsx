"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AnalyticsCard from '@/components/admin/AnalyticsCard';
import { useAuth } from '@/hooks/useAuth';
import { Users, TrendingUp, Activity, ArrowRight, AlertTriangle, Clock, ClipboardList } from 'lucide-react';

export default function DashboardPage() {
  const { getAccessToken } = useAuth();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [expiringUsers, setExpiringUsers] = useState<any[]>([]);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [planRequests, setPlanRequests] = useState<any[]>([]);

  const loadRequests = async (token: string) => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL;
    const res = await fetch(`${base}/api/admin/plan-requests?status=pending`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json.ok) setPlanRequests(json.data.requests || []);
  };

  useEffect(() => {
    async function load() {
      try {
        const token = getAccessToken();
        const h = { Authorization: `Bearer ${token}` };
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const [metricsRes, usersRes, expiringRes, inactiveRes] = await Promise.all([
          fetch(`${base}/api/admin/metrics`, { headers: h }),
          fetch(`${base}/api/admin/users`, { headers: h }),
          fetch(`${base}/api/admin/users/expiring?days=7`, { headers: h }),
          fetch(`${base}/api/admin/users/inactive?days=7`, { headers: h }),
        ]);
        const [metricsJson, usersJson, expiringJson, inactiveJson] = await Promise.all([
          metricsRes.json(), usersRes.json(), expiringRes.json(), inactiveRes.json(),
        ]);
        if (metricsJson.ok) setMetrics(metricsJson.data);
        if (usersJson.ok) {
          const sorted = [...(usersJson.data.users || [])].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setRecentUsers(sorted.slice(0, 3));
        }
        if (expiringJson.ok) setExpiringUsers(expiringJson.data.users || []);
        if (inactiveJson.ok) setInactiveCount(inactiveJson.data.count || 0);
        await loadRequests(token);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAccessToken]);

  const quickActions = [
    { label: 'Manage Members', href: '/users', icon: Users, accent: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  const daysUntil = (endDate: string) =>
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
      </motion.div>

      {/* ── ALERT BANNERS ── */}
      {!loading && expiringUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl"
        >
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm font-bold text-amber-700 flex-1">
            {expiringUsers.length} membership{expiringUsers.length !== 1 ? 's' : ''} expiring in the next 7 days
          </p>
          <Link
            href="/users?tab=expiring"
            className="text-xs font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            Manage
          </Link>
        </motion.div>
      )}
      {!loading && inactiveCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-3 px-4 py-3.5 bg-blue-50 border border-blue-100 rounded-2xl"
        >
          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-sm font-bold text-blue-700 flex-1">
            {inactiveCount} member{inactiveCount !== 1 ? 's' : ''} inactive for 7+ days — consider following up
          </p>
          <Link
            href="/users?tab=inactive"
            className="text-xs font-black text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            View
          </Link>
        </motion.div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 flex-wrap"
      >
        {quickActions.map(({ label, href, icon: Icon, accent, bg }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-100 text-sm font-bold text-gray-700 hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${bg}`}>
              <Icon className={`w-3.5 h-3.5 ${accent}`} />
            </div>
            {label}
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </Link>
        ))}
      </motion.div>

      {/* ── PLAN REQUESTS ── */}
      {!loading && planRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3.5 bg-white border border-gray-100 rounded-2xl"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#00E676]" />
            <span className="text-sm font-black text-gray-900">{planRequests.length} pending plan request{planRequests.length !== 1 ? 's' : ''}</span>
          </div>
          <Link href="/requests" className="text-xs font-black text-[#00E676] bg-black px-3 py-1.5 rounded-xl hover:bg-gray-900 transition-colors">
            View All
          </Link>
        </motion.div>
      )}

      {/* ── METRIC CARDS ── */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        <AnalyticsCard title="Total Members"   value={loading ? '—' : (metrics?.usersCount ?? '—')}        subtitle="Registered"       accent="green"  loading={loading} />
        <AnalyticsCard title="Workout Plans"   value={loading ? '—' : (metrics?.workoutPlansCount ?? '—')} subtitle="All time"         accent="blue"   loading={loading} />
        <AnalyticsCard title="Active Workouts" value={loading ? '—' : (metrics?.activeWorkoutPlans ?? '—')} subtitle="Currently active" accent="purple" loading={loading} />
        <AnalyticsCard title="Diet Plans"      value={loading ? '—' : (metrics?.dietPlansCount ?? '—')}    subtitle="All time"         accent="amber"  loading={loading} />
      </motion.div>

      {/* ── INFO CARDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Expiring memberships */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-black text-gray-900">Expiring Soon</h3>
            </div>
            {!loading && expiringUsers.length > 0 && (
              <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">{expiringUsers.length} members</span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-4 space-y-2 animate-pulse">
                {[1, 2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
              </div>
            ) : expiringUsers.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-black text-[#00E676]">All clear</p>
                <p className="text-xs text-gray-400 mt-1">No memberships expiring in the next 7 days</p>
              </div>
            ) : expiringUsers.slice(0, 4).map((u) => {
              const days = daysUntil(u.subscription?.endDate);
              return (
                <Link key={u._id} href={`/users/${u._id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center text-[#00E676] text-[10px] font-black shrink-0">
                      {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${
                    days! <= 2 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {days === 0 ? 'Today' : `${days}d`}
                  </span>
                </Link>
              );
            })}
          </div>
          {expiringUsers.length > 4 && (
            <div className="px-4 pb-4">
              <Link href="/users" className="block text-center text-xs font-bold text-gray-400 hover:text-gray-600 py-1">
                +{expiringUsers.length - 4} more →
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent members + quick stats */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          >
            <div className="flex items-center gap-2 p-4 border-b border-gray-50">
              <Activity className="w-4 h-4 text-gray-400" />
              <h3 className="font-black text-gray-900">Recent Members</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="p-4 space-y-2 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
                </div>
              ) : recentUsers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No members yet</p>
              ) : recentUsers.map((u) => (
                <Link key={u._id} href={`/users/${u._id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center text-[#00E676] text-[10px] font-black shrink-0">
                      {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold text-gray-800 truncate">{u.name}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    u.subscription?.status === 'active' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-gray-100 text-gray-400'
                  }`}>{u.subscription?.status || 'inactive'}</span>
                </Link>
              ))}
            </div>
            <div className="px-4 pb-3">
              <Link href="/users" className="block text-center text-xs font-bold text-gray-400 hover:text-gray-600 py-1">
                View all members →
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          >
            <div className="flex items-center gap-2 p-4 border-b border-gray-50">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h3 className="font-black text-gray-900">Quick Stats</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="p-3 space-y-2 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}
                </div>
              ) : [
                { label: 'Total Members',   val: metrics?.usersCount ?? 0,       accent: 'text-[#00E676]' },
                { label: 'Workout Plans',   val: metrics?.workoutPlansCount ?? 0, accent: 'text-blue-500' },
                { label: 'Diet Plans',      val: metrics?.dietPlansCount ?? 0,    accent: 'text-[#FF6D00]' },
                { label: 'Expiring 7 days', val: expiringUsers.length,            accent: expiringUsers.length > 0 ? 'text-amber-500' : 'text-gray-900' },
                { label: 'Inactive 7 days', val: inactiveCount,                   accent: inactiveCount > 0 ? 'text-blue-500' : 'text-gray-900' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm font-bold text-gray-600">{s.label}</p>
                  <p className={`text-base font-black num ${s.accent}`}>{s.val}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
