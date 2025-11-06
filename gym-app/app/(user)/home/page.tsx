"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutPlans } from "@/hooks/useWorkoutPlan";
import { useDietPlan } from "@/hooks/useDietPlan";

export default function UserDashboard() {
  const { user } = useAuth();
  const { plans: workoutPlans } = useWorkoutPlans();
  const { plans: dietPlans } = useDietPlan();
  
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayDiet, setTodayDiet] = useState<any>(null);

  // Find today's workout using plan startDate and day index (robust to arbitrary day labels)
  useEffect(() => {
    if (workoutPlans.length > 0) {
      const latest = workoutPlans[0];
      if (!latest?.startDate || !Array.isArray(latest?.days) || latest.days.length === 0) {
        setTodayWorkout(null);
        return;
      }
      const start = new Date(latest.startDate);
      start.setHours(0,0,0,0);
      const now = new Date();
      now.setHours(0,0,0,0);
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        // Plan starts in the future
        setTodayWorkout(null);
        return;
      }
      const idx = diffDays % latest.days.length;
      const todayDay = latest.days[idx];
      setTodayWorkout({
        ...todayDay,
        isRestDay: !todayDay?.exercises || todayDay.exercises.length === 0,
      });
    } else {
      setTodayWorkout(null);
    }
  }, [workoutPlans]);

  // Find today's diet
  useEffect(() => {
    if (dietPlans.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const todayPlan = dietPlans.find((p: any) => 
        new Date(p.date).toISOString().slice(0, 10) === today
      ) || dietPlans[0];
      setTodayDiet(todayPlan);
    }
  }, [dietPlans]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}! 💪
          </h1>
          <p className="text-gray-600 mt-1">
            {todayWorkout && !todayWorkout.isRestDay 
              ? "Let's crush today's workout!" 
              : todayWorkout?.isRestDay 
              ? "Rest day - recovery is important!" 
              : "Ready to get started!"}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${user?.subscription?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {user?.subscription?.status?.toUpperCase() || 'FREE'}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Plans" value={`${workoutPlans.length}`} icon="🏋️" />
        <StatCard label="Diet Plans" value={`${dietPlans.length}`} icon="🍎" />
        <StatCard label="Calories" value={todayDiet?.dailyCalories ? `${todayDiet.dailyCalories}` : '-'} icon="🔥" />
        <StatCard label="Weight" value={user?.profile?.weight ? `${user.profile.weight} kg` : '-'} icon="⚖️" />
      </div>

      {/* Today's Workout */}
      <Card>
        <CardHeader 
          title="Today's Workout" 
          subtitle={todayWorkout ? (todayWorkout.day || 'Today') : 'No workout today'} 
        />
        <CardBody>
          {todayWorkout && !todayWorkout.isRestDay && todayWorkout.exercises?.length > 0 ? (
            <>
              <div className="space-y-3">
                {todayWorkout.exercises.slice(0, 3).map((ex: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-sm text-gray-600">{ex.sets} × {ex.reps}</span>
                  </div>
                ))}
                {todayWorkout.exercises.length > 3 && (
                  <div className="text-center text-sm text-gray-500">
                    +{todayWorkout.exercises.length - 3} more exercises
                  </div>
                )}
              </div>
              <Link href="/workout?start=true" className="block mt-4">
                <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Today's Workout
                </button>
              </Link>
            </>
          ) : todayWorkout?.isRestDay ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">😴</div>
              <p className="text-lg font-semibold text-gray-900">Rest Day</p>
              <p className="text-sm text-gray-600 mt-1">Recovery is key to progress!</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No workout plan assigned yet.</p>
              <Link href="/workout" className="text-green-600 hover:text-green-700 font-medium mt-2 inline-block">
                View workout plans →
              </Link>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Today's Diet */}
      <Card>
        <CardHeader 
          title="Today's Meals" 
          subtitle={todayDiet ? `${todayDiet.dailyCalories || 0} kcal target` : 'No diet plan'} 
        />
        <CardBody>
          {todayDiet && todayDiet.meals?.length > 0 ? (
            <>
              <div className="space-y-2">
                {todayDiet.meals.map((meal: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <span className="text-sm font-medium">{meal.name}</span>
                      <p className="text-xs text-gray-500">{meal.time}</p>
                    </div>
                    <span className="text-xs font-semibold text-green-600">{meal.calories} kcal</span>
                  </div>
                ))}
              </div>
              <Link href="/diet" className="block mt-4">
                <button className="w-full px-4 py-2 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium">
                  View Full Diet Plan →
                </button>
              </Link>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No diet plan assigned yet.</p>
              <Link href="/diet" className="text-green-600 hover:text-green-700 font-medium mt-2 inline-block">
                View diet plans →
              </Link>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/progress">
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Progress</div>
                <div className="text-xs text-gray-600">Track your journey</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/plans">
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">My Plans</div>
                <div className="text-xs text-gray-600">View all programs</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/profile">
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Profile</div>
                <div className="text-xs text-gray-600">Update settings</div>
              </div>
            </div>
          </Card>
        </Link>
      </div>
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
