'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import MealCard from '@/components/user/MealCard';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useToast } from '@/hooks/useToast';

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const toast = useToast();

  const latestWorkout = workoutPlans[0];
  const latestDiet = dietPlans[0];

  const meals = latestDiet?.meals || [];

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">My Plans</h1>
      <p className="text-gray-600">View your personalized workout and nutrition plans</p>

      <div className="flex gap-4">
        <button 
          onClick={() => setActiveTab('workout')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'workout' 
              ? 'bg-green-500 text-white' 
              : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          🏋️‍♂️ Workout Plan
        </button>
        <button 
          onClick={() => setActiveTab('diet')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'diet' 
              ? 'bg-green-500 text-white' 
              : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          🍽 Diet Plan
        </button>
      </div>

      {/* Workout Plan Tab */}
      {activeTab === 'workout' && (
        <>
          {workoutLoading ? (
            <Card><CardBody><p className="text-center py-8 text-gray-500">Loading workout plans...</p></CardBody></Card>
          ) : latestWorkout ? (
            <>
              <Card>
                <CardHeader 
                  title={latestWorkout.name || "Workout Program"} 
                  subtitle={latestWorkout.description || `${latestWorkout.durationWeeks || 4}-week training program`} 
                />
                <CardBody>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-green-100 rounded flex items-center justify-center text-4xl">💪</div>
                    <div>
                      <p className="text-sm text-gray-500">{latestWorkout.durationWeeks || 4} week program</p>
                      <p className="text-sm text-gray-600 mt-1">{latestWorkout.days?.length || 0} training days</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Week Overview</h2>
                <Link 
                  href="/workout"
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  View Full Plan →
                </Link>
              </div>

              <div className="space-y-4">
                {latestWorkout.days?.map((dayData: any, idx: number) => (
                  <Card key={idx}>
                    <CardBody>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xl font-semibold">{dayData.day || `Day ${idx + 1}`}</h3>
                        {!dayData.isRestDay && (
                          <Link 
                            href="/workout"
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            View Details →
                          </Link>
                        )}
                      </div>
                      {dayData.isRestDay ? (
                        <div className="text-center py-6 bg-purple-50 rounded-lg">
                          <p className="text-purple-600 font-semibold">Rest & Recovery Day</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dayData.exercises?.slice(0, 2).map((ex: any, i: number) => (
                            <div key={i} className="bg-gray-50 p-4 rounded-md">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold">{ex.name}</h4>
                                  <p className="text-sm text-gray-500">Rest: {ex.rest}s between sets</p>
                                </div>
                                <div className="bg-gray-100 text-sm px-3 py-1 rounded-full">{ex.sets} × {ex.reps}</div>
                              </div>
                            </div>
                          ))}
                          {dayData.exercises?.length > 2 && (
                            <p className="text-sm text-gray-500 text-center">+{dayData.exercises.length - 2} more exercises</p>
                          )}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardBody>
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">💪</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Workout Plan Yet</h3>
                  <p className="text-gray-600 mb-4">Contact your trainer to get a personalized workout plan.</p>
                  <Link href="/workout" className="text-green-600 hover:text-green-700 font-medium">
                    Go to Workouts →
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* Diet Plan Tab */}
      {activeTab === 'diet' && (
        <>
          {dietLoading ? (
            <Card><CardBody><p className="text-center py-8 text-gray-500">Loading diet plans...</p></CardBody></Card>
          ) : latestDiet ? (
            <>
              <Card>
                <CardHeader 
                  title={latestDiet.name || "Nutrition Plan"} 
                  subtitle={latestDiet.description || "Personalized diet plan for your goals"} 
                />
                <CardBody>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{latestDiet.dailyCalories || 0}</p>
                      <p className="text-sm text-gray-500">Daily Calories</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{latestDiet.macros?.protein || 0}g</p>
                      <p className="text-sm text-gray-500">Protein</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{latestDiet.macros?.carbs || 0}g</p>
                      <p className="text-sm text-gray-500">Carbs</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Daily Meal Plan</h2>
                <Link 
                  href="/today-diet"
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  View Today Diet →
                </Link>
              </div>

              <div className="space-y-4">
                {meals.map((meal: any, index: number) => (
                  <MealCard
                    key={index}
                    mealName={meal.name}
                    time={meal.time}
                    calories={meal.calories}
                    foods={meal.foods || []}
                    macros={meal.macros || { protein: 0, carbs: 0, fats: 0 }}
                    onLog={() => toast.success(`${meal.name} logged!`)}
                  />
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardBody>
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🍽️</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Diet Plan Yet</h3>
                  <p className="text-gray-600 mb-4">Contact your trainer to get a personalized nutrition plan.</p>
                  <Link href="/today-diet" className="text-green-600 hover:text-green-700 font-medium">
                    Go to Today Diet →
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
