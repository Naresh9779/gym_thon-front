"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AnalyticsCard from '@/components/admin/AnalyticsCard';
import { useAuth } from '@/hooks/useAuth';
import { Users, AlertTriangle, Clock, ClipboardList, Activity, CreditCard, IndianRupee, QrCode, UserCheck } from 'lucide-react';

export default function DashboardPage() {
  const { getAccessToken } = useAuth();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [expiringUsers, setExpiringUsers] = useState<any[]>([]);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [planRequests, setPlanRequests] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<{
    attendanceEnabled: boolean;
    summary?: { total: number; presentCount: number; currentlyIn: number };
  } | null>(null);

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
        const [metricsRes, usersRes, expiringRes, inactiveRes, attendanceRes] = await Promise.all([
          fetch(`${base}/api/admin/metrics`, { headers: h }),
          fetch(`${base}/api/admin/users`, { headers: h }),
          fetch(`${base}/api/admin/users/expiring?days=7`, { headers: h }),
          fetch(`${base}/api/admin/users/inactive?days=7`, { headers: h }),
          fetch(`${base}/api/admin/attendance/today`, { headers: h }),
        ]);
        const [metricsJson, usersJson, expiringJson, inactiveJson, attendanceJson] = await Promise.all([
          metricsRes.json(), usersRes.json(), expiringRes.json(), inactiveRes.json(), attendanceRes.json(),
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
        if (attendanceJson.ok) setAttendanceData(attendanceJson.data);
        await loadRequests(token);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAccessToken]);

  const daysUntil = (endDate: string) =>
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);

  const fmtCurrency = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;

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
      {!loading && metrics?.pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="flex items-center gap-3 px-4 py-3.5 bg-orange-50 border border-orange-200 rounded-2xl"
        >
          <CreditCard className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-sm font-bold text-orange-700 flex-1">
            {metrics.pendingCount} payment{metrics.pendingCount !== 1 ? 's' : ''} pending — {fmtCurrency(metrics.pendingAmount || 0)} outstanding
          </p>
          <Link
            href="/users?tab=pending_payment"
            className="text-xs font-black text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            View
          </Link>
        </motion.div>
      )}

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
        className="grid grid-cols-2 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        <AnalyticsCard
          title="Total Members"
          value={loading ? '—' : (metrics?.usersCount ?? '—')}
          subtitle="Registered"
          accent="green"
          loading={loading}
          href="/users"
        />
        <AnalyticsCard
          title="Active Members"
          value={loading ? '—' : (metrics?.activeSubscriptions ?? 0)}
          subtitle="Active subscription"
          accent="blue"
          loading={loading}
          href={!loading && (metrics?.activeSubscriptions ?? 0) > 0 ? '/users?tab=active' : undefined}
        />
        <AnalyticsCard
          title="Revenue (MTD)"
          value={loading ? '—' : fmtCurrency(metrics?.revenueThisMonth ?? 0)}
          subtitle="Collected this month"
          accent="green"
          loading={loading}
          href="/payments"
        />
        <AnalyticsCard
          title="Pending Payments"
          value={loading ? '—' : (metrics?.pendingCount ?? 0)}
          subtitle={loading ? '—' : metrics?.pendingAmount > 0 ? `${fmtCurrency(metrics.pendingAmount)} outstanding` : 'All clear'}
          accent="amber"
          loading={loading}
          href={!loading && (metrics?.pendingCount ?? 0) > 0 ? '/users?tab=pending_payment' : undefined}
        />
      </motion.div>

      {/* ── ATTENDANCE CARD (only if enabled) ── */}
      {!loading && attendanceData?.attendanceEnabled && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Link href="/attendance" className="block bg-black rounded-2xl p-4 hover:bg-gray-900 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00E676]/20 rounded-xl flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-[#00E676]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Attendance</p>
                  <p className="text-2xl font-black text-white mt-0.5">
                    {attendanceData.summary?.presentCount ?? 0}
                    <span className="text-sm font-bold text-gray-500 ml-1">/ {attendanceData.summary?.total ?? 0} members</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <div className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                  <span className="text-xs font-black text-[#00E676]">{attendanceData.summary?.currentlyIn ?? 0} in gym</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 group-hover:text-gray-300 transition-colors">View details →</p>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

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
                      <p className="text-xs text-gray-400 truncate">{u.subscription?.planName || 'No plan'}</p>
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
              <Link href="/users?tab=expiring" className="block text-center text-xs font-bold text-gray-400 hover:text-gray-600 py-1">
                +{expiringUsers.length - 4} more →
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent members */}
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
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{u.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.subscription?.planName || 'No plan'}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  u.subscription?.status === 'active' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-gray-100 text-gray-400'
                }`}>{u.subscription?.status || 'no plan'}</span>
              </Link>
            ))}
          </div>
          <div className="px-4 pb-3">
            <Link href="/users" className="block text-center text-xs font-bold text-gray-400 hover:text-gray-600 py-1">
              View all members →
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
