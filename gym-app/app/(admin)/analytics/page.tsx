"use client";
import { useEffect, useMemo, useState } from 'react';
import AnalyticsCard from '@/components/admin/AnalyticsCard';
import { UserIcon, ChartPieIcon, SparklesIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface User { _id: string; name: string; email?: string; username?: string; goal?: string; activityLevel?: string; }

export default function AnalyticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<Array<{ date: string; workouts: number; meals: number; activeUsers: number }>>([]);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = accessToken();
        // Load users for selector
        const resUsers = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const jsonUsers = await resUsers.json();
        if (jsonUsers.ok) setUsers(jsonUsers.data.users || []);

        // Load platform overview & trends
        const [resOverview, resTrends] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/trends?days=30`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const jsonOverview = await resOverview.json();
        const jsonTrends = await resTrends.json();
        if (jsonOverview.ok) setOverview(jsonOverview.data);
        if (jsonTrends.ok) setTrends(jsonTrends.data.series || []);
      } catch (e) {
        console.error('Failed to load users for analytics', e);
      }
    }
    bootstrap();
  }, [accessToken]);

  const user = users.find(u => String(u._id) === selectedId);

  // Load per-user analytics when selection changes
  useEffect(() => {
    async function loadUserMetrics() {
      if (!user) { setUserMetrics(null); return; }
      try {
        setLoading(true);
        const token = accessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/user/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) setUserMetrics(json.data);
      } catch (e) {
        console.error('Failed to load user analytics', e);
      } finally {
        setLoading(false);
      }
    }
    loadUserMetrics();
  }, [user, accessToken]);

  return (
    <div className="space-y-5">
      {/* Header with user selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Analytics</h2>
          <p className="text-gray-600 mt-0.5">View insights for an individual client</p>
        </div>
        <div className="w-64">
          <label className="sr-only">Select user</label>
          <div className="relative">
            <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
            >
              {users.length === 0 ? (
                <option value="">No users available</option>
              ) : (
                <>
                  <option value="">Select a user…</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} (@{u.username || u.email || 'user'})</option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Platform Overview KPIs */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <AnalyticsCard title="Users" value={overview.usersCount} subtitle="Total" Icon={UserIcon} accent="blue" />
          <AnalyticsCard title="Workout Plans" value={overview.workoutPlansCount} subtitle="Total" Icon={SparklesIcon} accent="purple" />
          <AnalyticsCard title="Diet Plans" value={overview.dietPlansCount} subtitle="Total" Icon={ChartPieIcon} accent="blue" />
          <AnalyticsCard title="Active (7d)" value={overview.activeUsers7d} subtitle="Unique users" Icon={CalendarDaysIcon} accent="green" />
        </div>
      )}

      {/* Per-user KPI cards or empty-state prompt */}
      {user ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <AnalyticsCard title="Workouts" value={userMetrics?.workoutsCompleted ?? 0} subtitle="Last 30 days" Icon={SparklesIcon} accent="green" />
          <AnalyticsCard title="Meals Logged" value={userMetrics?.totalMealsLogged ?? 0} subtitle="Last 30 days" Icon={ChartPieIcon} accent="amber" />
          <AnalyticsCard title="Active Days" value={userMetrics?.activeDays ?? 0} subtitle="Last 30 days" Icon={CalendarDaysIcon} accent="green" />
          <AnalyticsCard title="Streak" value={userMetrics?.currentStreak ?? 0} subtitle="Current" Icon={UserIcon} accent="rose" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-700">Select a user from the dropdown to view analytics.</div>
      )}

      {/* Platform Trends */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Platform Trends (30 days)</h3>
        {trends.length === 0 ? (
          <p className="text-xs text-gray-500">No data available.</p>
        ) : (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={trends}>
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="workouts" stroke="#10B981" name="Workouts" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="meals" stroke="#6366F1" name="Meals" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
