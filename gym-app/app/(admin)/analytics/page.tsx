"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AnalyticsCard from '@/components/admin/AnalyticsCard';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';

interface User { _id: string; name: string; email?: string; username?: string; }

const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none transition-all text-sm font-medium bg-white";

export default function AnalyticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [userTrends, setUserTrends] = useState<any[]>([]);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = getAccessToken();
        const [resUsers, resOverview, resTrends] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/trends?days=30`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [ju, jo, jt] = await Promise.all([resUsers.json(), resOverview.json(), resTrends.json()]);
        if (ju.ok) setUsers(ju.data.users || []);
        if (jo.ok) setOverview(jo.data);
        if (jt.ok) setTrends(jt.data.series || []);
      } catch { /* ignore */ }
    }
    bootstrap();
  }, [getAccessToken]);

  const selectedUser = users.find(u => String(u._id) === selectedId);

  useEffect(() => {
    async function loadUser() {
      if (!selectedUser) { setUserMetrics(null); setUserTrends([]); return; }
      setLoading(true);
      try {
        const token = getAccessToken();
        const [resM, resT] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/user/${selectedUser._id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${selectedUser._id}/trends`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        const jm = await resM.json();
        if (jm.ok) setUserMetrics(jm.data);
        if (resT?.ok) {
          const jt = await resT.json();
          if (jt.ok) setUserTrends(jt.data.series || []);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [selectedUser, getAccessToken]);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs shadow-lg">
        <p className="font-bold text-gray-500 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="font-black">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">

      {/* ── USER SELECTOR ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <CustomSelect
          value={selectedId}
          onChange={setSelectedId}
          placeholder="All users (platform view)"
          options={users.map(u => ({ value: u._id, label: u.name }))}
        />
      </motion.div>

      {/* ── PLATFORM OVERVIEW ── */}
      {overview && (
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          <AnalyticsCard title="Total Users"    value={overview.usersCount}        subtitle="Registered"   accent="green"  />
          <AnalyticsCard title="Workout Plans"  value={overview.workoutPlansCount} subtitle="All time"     accent="blue"   />
          <AnalyticsCard title="Diet Plans"     value={overview.dietPlansCount}    subtitle="All time"     accent="amber"  />
          <AnalyticsCard title="Active (7d)"    value={overview.activeUsers7d}     subtitle="Unique users" accent="purple" />
        </motion.div>
      )}

      {/* ── PER-USER METRICS ── */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-[#00E676] text-xs font-black">
              {selectedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-black text-gray-900">{selectedUser.name}</p>
              <p className="text-xs text-gray-400">Last 30 days</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 bg-white rounded-2xl border border-gray-100">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <AnalyticsCard title="Workouts"    value={userMetrics?.workoutsCompleted ?? 0} accent="green"  />
              <AnalyticsCard title="Meals"       value={userMetrics?.totalMealsLogged ?? 0}  accent="amber"  />
              <AnalyticsCard title="Active Days" value={userMetrics?.activeDays ?? 0}        accent="blue"   />
              <AnalyticsCard title="Streak"      value={userMetrics?.currentStreak ?? 0}     subtitle="days" accent="rose"   />
            </div>
          )}

          {userTrends.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="label-cap mb-1">User trend</p>
              <h3 className="font-black text-gray-900 mb-4">{selectedUser.name} — 30 days</h3>
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={userTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 'auto']} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="workouts" stroke="#00E676" name="Workouts" strokeWidth={2.5} dot={{ r: 3, fill: '#00E676', strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="meals"    stroke="#FF6D00" name="Meals"    strokeWidth={2.5} dot={{ r: 3, fill: '#FF6D00', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── PLATFORM TRENDS ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-5"
      >
        <p className="label-cap mb-1">Platform</p>
        <h3 className="font-black text-gray-900 mb-4">Activity Trends — 30 days</h3>
        {trends.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No trend data available yet.</p>
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="workouts"    stroke="#00E676" name="Workouts"     strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="meals"       stroke="#FF6D00" name="Meals"        strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="activeUsers" stroke="#2979FF" name="Active Users" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>
    </div>
  );
}
