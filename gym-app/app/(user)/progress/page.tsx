 'use client';

import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import ProgressChart from '@/components/user/ProgressChart';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function ProgressPage() {
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { stats, loading: progressLoading } = useUserProgress();
  const { accessToken } = useAuth();
  const [trendData, setTrendData] = useState<{ date: string; workouts: number; meals: number; value: number }[]>([]);

  const latestWorkout = workoutPlans?.[0];
  const latestDiet = dietPlans?.[0];

  useEffect(() => {
    async function loadTrends() {
      try {
        const token = accessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/trends?days=14`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) {
          const series = (json.data.series as Array<{ date: string; workouts: number; meals: number }>);
          const mapped = series.map(d => ({ 
            date: d.date.slice(5), // MM-DD format
            workouts: d.workouts, 
            meals: d.meals,
            value: d.workouts * 2 + d.meals 
          }));
          setTrendData(mapped);
        }
      } catch (e) {
        // ignore chart errors
      }
    }
    loadTrends();
  }, [accessToken]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Progress</h1>

      <Card>
        <CardHeader title="Overall Progress" subtitle="Your fitness journey stats" />
        <CardBody>
          {workoutLoading || dietLoading || progressLoading ? (
            <p className="text-center py-8 text-gray-500">Loading progress...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">{stats.currentStreak}</p>
                <p className="text-sm text-gray-500">Day Streak</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">{stats.workoutsCompleted}</p>
                <p className="text-sm text-gray-500">Workouts Done</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">{stats.totalMealsLogged}</p>
                <p className="text-sm text-gray-500">Meals Logged</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">{stats.activeDays}</p>
                <p className="text-sm text-gray-500">Active Days</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent Activity" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {workoutLoading || dietLoading ? (
                <p className="text-gray-500 text-sm">Loading activity...</p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-700">
                  {latestWorkout && <li>Current Workout: {latestWorkout.name}</li>}
                  {latestDiet && <li>Daily Target: {latestDiet.dailyCalories} kcal</li>}
                  <li>Last 30 Days: {stats.workoutsCompleted} workouts, {stats.totalMealsLogged} meals</li>
                  <li>Active days: {stats.activeDays}</li>
                </ul>
              )}
            </div>
            <div>
              <ProgressChart data={trendData} />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
