'use client';

import Link from 'next/link';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import MealCard from '@/components/user/MealCard';
import ExerciseCard from '@/components/user/ExerciseCard';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useDietPlan } from '@/hooks/useDietPlan';

export default function TodayPage() {
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();

  const latestWorkout = workoutPlans?.[0];
  const latestDiet = dietPlans?.[0];

  // Get today's workout using plan startDate and index fallback
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];
  let todayWorkout: any = null;
  if (latestWorkout?.startDate && Array.isArray(latestWorkout?.days) && latestWorkout.days.length > 0) {
    const start = new Date(latestWorkout.startDate);
    start.setHours(0,0,0,0);
    const now = new Date();
    now.setHours(0,0,0,0);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      const idx = diffDays % latestWorkout.days.length;
      todayWorkout = latestWorkout.days[idx];
    }
  }

  const exercises = todayWorkout?.exercises || [];
  const meals = latestDiet?.meals || [];
  const isRestDay = !exercises || exercises.length === 0;

  if (workoutLoading || dietLoading) {
    return (
      <div className="space-y-6">
        <Card><CardBody><p className="text-center py-8 text-gray-500">Loading today's plans...</p></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Progress */}
      <Card>
        <CardHeader title="Today's Progress" />
        <CardBody>
          <div className="grid grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2 shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-800">{isRestDay ? 0 : exercises.length}</p>
              <p className="text-xs text-gray-500 mt-1">Exercises</p>
            </div>
            
            <div className="flex flex-col items-center relative">
              <div className="absolute left-0 top-7 w-full border-t-2 border-dotted border-gray-300 -z-10"></div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-800">{latestDiet?.dailyCalories || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Target Cal</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-2 shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-800">{workoutPlans?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active Plans</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Workout Section */}
      <section>
  <h2 className="text-xl font-bold mb-4">Today's Workout - {todayWorkout?.day || todayName}</h2>
        {isRestDay ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <div className="text-5xl mb-4">😴</div>
                <h3 className="text-xl font-bold mb-2">Rest Day</h3>
                <p className="text-gray-600">No workout scheduled for today. Take time to recover!</p>
              </div>
            </CardBody>
          </Card>
        ) : exercises.length > 0 ? (
          <>
            <div className="space-y-4">
              {exercises.map((exercise: any, index: number) => (
                <ExerciseCard
                  key={index}
                  name={exercise.name}
                  sets={String(exercise.sets)}
                  reps={exercise.reps}
                  rest={exercise.rest}
                />
              ))}
            </div>
            
            {/* Start Workout Button */}
            <div className="mt-6 flex justify-end">
              <Link href="/workout?start=true">
                <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:from-green-600 hover:to-green-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Workout
                </button>
              </Link>
            </div>
          </>
        ) : (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <div className="text-5xl mb-4">💪</div>
                <h3 className="text-xl font-bold mb-2">No Workout Plan Yet</h3>
                <p className="text-gray-600">Contact your trainer to get a personalized workout plan.</p>
              </div>
            </CardBody>
          </Card>
        )}
      </section>

      {/* Meals Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Today's Meals</h2>
        {meals.length > 0 ? (
          <div className="space-y-4">
            {meals.map((meal: any, index: number) => (
              <MealCard
                key={index}
                mealName={meal.name}
                time={meal.time}
                calories={meal.calories}
                foods={meal.foods || []}
                macros={meal.macros || { protein: 0, carbs: 0, fats: 0 }}
                onLog={() => alert(`Logged ${meal.name}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🍽️</div>
                <h3 className="text-xl font-bold mb-2">No Diet Plan Yet</h3>
                <p className="text-gray-600">Contact your trainer to get a personalized nutrition plan.</p>
              </div>
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}