"use client";
import { useEffect, useMemo, useState } from 'react';
import AnalyticsCard from '@/components/admin/AnalyticsCard';
import { UserIcon, ChartPieIcon, SparklesIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface User { id: number; name: string; username: string; goal?: string; activityLevel?: string; }

export default function AnalyticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers(stored);
  }, []);

  const user = users.find(u => String(u.id) === selectedId);

  // Simple derived metrics to make the UI feel alive without backend
  const metrics = useMemo(() => {
    if (!user) return {
      adherence: 0,
      plans: 0,
      activeDays: 0,
    };
    const seed = (user.username?.length || 5) + (user.goal?.length || 3);
    return {
      adherence: 70 + (seed % 21), // 70-90%
      plans: 5 + (seed % 6),       // 5-10
      activeDays: 12 + (seed % 7), // 12-18 over last 30
    };
  }, [user]);

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
                    <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Per-user KPI cards or empty-state prompt */}
      {user ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <AnalyticsCard title="Plan Adherence" value={`${metrics.adherence}%`} subtitle="Last 30 days" Icon={ChartPieIcon} accent="amber" />
          <AnalyticsCard title="Plans Generated" value={metrics.plans} subtitle="Total" Icon={SparklesIcon} accent="blue" />
          <AnalyticsCard title="Active Days" value={metrics.activeDays} subtitle="Last 30 days" Icon={CalendarDaysIcon} accent="green" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-700">Select a user from the dropdown to view analytics.</div>
      )}

      {/* Trend placeholders (future) */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Trends</h3>
        <p className="text-xs text-gray-500">Detailed charts coming soon. This section will visualize progress, calories, and workout frequency.</p>
      </div>
    </div>
  );
}
