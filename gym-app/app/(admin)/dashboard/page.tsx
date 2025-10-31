import Link from 'next/link'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import AnalyticsCard from '@/components/admin/AnalyticsCard'
import { BoltIcon, FireIcon, UserPlusIcon, UsersIcon, ClipboardDocumentCheckIcon, PlayCircleIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard Overview</h2>
          <p className="text-gray-600 mt-0.5">Welcome back! Here's what's happening today.</p>
        </div>
        {/* Quick Actions moved to top-right */}
        <div className="flex items-center gap-2">
          <Link href="/generate/workout" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-sm hover:shadow transition-all">
            <BoltIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Workout</span>
          </Link>
          <Link href="/generate/diet" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm hover:shadow transition-all">
            <FireIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Diet</span>
          </Link>
          <Link href="/users/add" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm hover:shadow transition-all">
            <UserPlusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Add User</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <AnalyticsCard title="Total Users" value={342} subtitle="Active clients" Icon={UsersIcon} accent="green" />
        <AnalyticsCard title="Plans Created" value={156} subtitle="This month" Icon={ClipboardDocumentCheckIcon} accent="blue" />
        <AnalyticsCard title="Active Plans" value={287} subtitle="Currently running" Icon={PlayCircleIcon} accent="purple" />
        <AnalyticsCard title="Completion Rate" value="87%" subtitle="Average" Icon={CheckBadgeIcon} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Recent Activity" subtitle="Latest updates" />
          <CardBody>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">New user registered</p>
                  <p className="text-xs text-gray-500">John Doe joined</p>
                </div>
                <span className="text-xs text-gray-400">2 min ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">Plan completed</p>
                  <p className="text-xs text-gray-500">Sarah Smith finished workout</p>
                </div>
                <span className="text-xs text-gray-400">15 min ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">New plan created</p>
                  <p className="text-xs text-gray-500">Diet plan for Mike Johnson</p>
                </div>
                <span className="text-xs text-gray-400">1 hour ago</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Reserved for future charts or summaries */}
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