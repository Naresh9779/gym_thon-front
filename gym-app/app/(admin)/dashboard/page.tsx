"use client";
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import AnalyticsCard from '@/components/admin/AnalyticsCard'
import { BoltIcon, FireIcon, UserPlusIcon, UsersIcon, ClipboardDocumentCheckIcon, PlayCircleIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const { accessToken } = useAuth();
  const [metrics, setMetrics] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = accessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) setMetrics(json.data);
      } catch (e) {
        console.error('Failed to load admin metrics', e);
      }
    }
    load();
  }, [accessToken]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard Overview</h2>
          <p className="text-gray-600 mt-0.5">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/generate/workout" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-sm hover:shadow transition-all">
            <BoltIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Workout</span>
          </Link>
          <Link href="/generate/diet" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm hover:shadow transition-all">
            <FireIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Diet</span>
          </Link>
          <Link href="/users" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm hover:shadow transition-all">
            <UserPlusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Users</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <AnalyticsCard title="Total Users" value={metrics?.usersCount ?? '—'} subtitle="All users" Icon={UsersIcon} accent="green" />
        <AnalyticsCard title="Workout Plans" value={metrics?.workoutPlansCount ?? '—'} subtitle="Total" Icon={ClipboardDocumentCheckIcon} accent="blue" />
        <AnalyticsCard title="Active Workouts" value={metrics?.activeWorkoutPlans ?? '—'} subtitle="Currently active" Icon={PlayCircleIcon} accent="purple" />
        <AnalyticsCard title="Diet Plans" value={metrics?.dietPlansCount ?? '—'} subtitle="Total" Icon={CheckBadgeIcon} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Recent Activity" subtitle="Latest updates" />
          <CardBody>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">New user registered</p>
                  <p className="text-xs text-gray-500">Recent signups will appear here</p>
                </div>
                <span className="text-xs text-gray-400">—</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">Plan events</p>
                  <p className="text-xs text-gray-500">Recent plan activity</p>
                </div>
                <span className="text-xs text-gray-400">—</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="System Summary" subtitle="Health and recent trends" />
          <CardBody>
            <p className="text-sm text-gray-600">Charts coming soon. This space will show overall activity across all users.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}