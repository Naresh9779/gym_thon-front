'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import MealCard from '@/components/user/MealCard';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useUserProgress } from '@/hooks/useUserProgress';

export default function TodayMealPage() {
  // Temporary redirect to the new /today-diet route
  const router = useRouter();
  useEffect(() => { router.replace('/today-diet'); }, [router]);
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { logMeal, stats, logs } = useUserProgress();
  const [loggedMeals, setLoggedMeals] = useState<Set<string>>(new Set());
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const latestDiet = dietPlans?.[0];
  const meals = latestDiet?.meals || [];

  // Load already logged meals from today's progress log
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLog = logs.find(log => {
      const logDate = new Date(log.date).toISOString().slice(0, 10);
      return logDate === today;
    });
    
    if (todayLog && todayLog.meals) {
      const logged = new Set<string>();
      todayLog.meals.forEach((meal: any) => {
        if (meal.mealName) {
          logged.add(meal.mealName.trim().toLowerCase());
        }
      });
      setLoggedMeals(logged);
    }
  }, [logs]);

  const handleLogMeal = async (meal: any) => {
    setLoggingMeal(meal.name);
    
    const result = await logMeal(
      meal.name,
      meal.calories,
      {
        p: meal.macros?.protein,
        c: meal.macros?.carbs,
        f: meal.macros?.fats
      }
    );
    
    setLoggingMeal(null);
    
    if (result.success) {
      if (result.alreadyLogged) {
        alert(`${meal.name} has already been logged today!`);
      } else {
        const newLogged = new Set(loggedMeals);
        newLogged.add(meal.name.trim().toLowerCase());
        setLoggedMeals(newLogged);
        setShowSuccess(meal.name);
        setTimeout(() => setShowSuccess(null), 3000);
      }
    }
  };

  const loggedCount = loggedMeals.size;
  const totalCount = meals.length;
  const completionPercentage = totalCount > 0 
    ? Math.round((loggedCount / totalCount) * 100)
    : 0;

  const totalCalories = meals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
  const loggedCalories = meals
    .filter((meal: any) => loggedMeals.has(meal.name.trim().toLowerCase()))
    .reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);

  if (dietLoading) {
    return (
      <div className="space-y-6">
        <Card><CardBody><p className="text-center py-8 text-gray-500">Loading today's meals...</p></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Today's Meals</h1>
        <p className="text-gray-600">Track your nutrition for the day</p>
      </div>

      {/* Progress Card */}
      {meals.length > 0 && (
        <Card>
          <CardBody>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              {/* Meals Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Meals Logged</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {loggedCount} / {totalCount}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Calories Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Calories</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {loggedCalories} / {totalCalories}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${totalCalories > 0 ? Math.round((loggedCalories / totalCalories) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600 mb-1">Daily Progress</p>
              <p className="text-3xl font-bold text-orange-600">{completionPercentage}%</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-orange-800">{showSuccess} logged successfully!</p>
            <p className="text-sm text-orange-700">Great job tracking your nutrition 🍽️</p>
          </div>
        </div>
      )}

      {/* Meals List */}
      {meals.length > 0 ? (
        <div className="space-y-4">
          {meals.map((meal: any, index: number) => {
            const isLogged = loggedMeals.has(meal.name.trim().toLowerCase());
            const isLogging = loggingMeal === meal.name;

            return (
              <div key={index} className="relative">
                <Card className={`${isLogged ? 'border-2 border-orange-500 bg-orange-50' : ''}`}>
                  <CardBody>
                    <div className="flex items-start justify-between gap-4">
                      {/* Meal Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {isLogged && (
                            <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          <h3 className={`font-bold text-lg ${isLogged ? 'text-gray-600' : 'text-gray-800'}`}>
                            {meal.name}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {meal.time}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-orange-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                            </svg>
                            {meal.calories} kcal
                          </span>
                        </div>

                        {/* Foods */}
                        {meal.foods && meal.foods.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Foods</p>
                            <ul className="space-y-1">
                              {meal.foods.map((food: any, idx: number) => (
                                <li key={idx} className="text-sm text-gray-700">
                                  • {food.name} - {food.quantity}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Macros */}
                        {meal.macros && (
                          <div className="flex gap-4 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                              P: {meal.macros.protein || 0}g
                            </span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
                              C: {meal.macros.carbs || 0}g
                            </span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                              F: {meal.macros.fats || 0}g
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Log Button */}
                      <button
                        onClick={() => handleLogMeal(meal)}
                        disabled={isLogged || isLogging}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                          isLogged
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : isLogging
                            ? 'bg-orange-200 text-orange-600 cursor-wait'
                            : 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-md'
                        }`}
                      >
                        {isLogging ? (
                          <>
                            <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                            Logging...
                          </>
                        ) : isLogged ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Logged
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Log Meal
                          </>
                        )}
                      </button>
                    </div>
                  </CardBody>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-7xl mb-4">🍽️</div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">No Diet Plan Yet</h3>
              <p className="text-gray-600">Contact your trainer to get a personalized nutrition plan.</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Daily Summary */}
      {meals.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-50 to-white">
          <CardBody>
            <h3 className="font-bold text-lg mb-4 text-gray-800">Daily Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalCount}</div>
                <p className="text-xs text-gray-600">Total Meals</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{loggedCount}</div>
                <p className="text-xs text-gray-600">Logged</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalCalories}</div>
                <p className="text-xs text-gray-600">Target Cal</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
