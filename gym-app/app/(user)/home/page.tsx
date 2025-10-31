"use client";

import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Link from "next/link";

export default function UserDashboard() {
  const user = {
    name: "John Doe",
    subscriptionStatus: "active",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back, {user.name}! 💪
          </h1>
          <p className="text-gray-600 mt-1">Let's crush today's workout!</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {user.subscriptionStatus.toUpperCase()}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Streak" value="12 days" icon="🔥" />
        <StatCard label="Workouts" value="45" icon="💪" />
        <StatCard label="Calories" value="2,400" icon="🍎" />
        <StatCard label="Weight" value="75 kg" icon="⚖️" />
      </div>

      {/* Today's Workout */}
      <Card>
        <CardHeader title="Today's Workout" subtitle="Day 1: Chest & Triceps" />
        <CardBody>
          <div className="space-y-3">
            {['Bench Press', 'Incline Dumbbell Press', 'Cable Fly'].map((ex, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{ex}</span>
                <span className="text-sm text-gray-600">3 × 12</span>
              </div>
            ))}
          </div>
          <Link href="/workout" className="block mt-4">
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Start Workout
            </button>
          </Link>
        </CardBody>
      </Card>

      {/* Today's Diet */}
      <Card>
        <CardHeader title="Today's Meals" subtitle="2,375 kcal target" />
        <CardBody>
          <div className="space-y-2">
            {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map((meal, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm font-medium">{meal}</span>
                <span className="text-xs text-gray-500">Pending</span>
              </div>
            ))}
          </div>
          <Link href="/diet" className="block mt-4">
            <button className="w-full px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50">
              View Diet Plan
            </button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-center">
          <div className="text-3xl mb-2">{icon}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
        </div>
      </CardBody>
    </Card>
  );
}
