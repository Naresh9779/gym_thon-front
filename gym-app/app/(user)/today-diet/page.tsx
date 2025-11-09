'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useUserProgress } from '@/hooks/useUserProgress';

// Today Diet page (replaces old /diet and /today-meal logic)
// Calories progress bar removed per request; focuses on meal logging only.
export default function TodayDietPage() {
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { logMeal, logs } = useUserProgress();
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
        if (meal.mealName) logged.add(meal.mealName.trim().toLowerCase());
      });
      setLoggedMeals(logged);
    }
  }, [logs]);

  const handleLogMeal = async (meal: any) => {
    setLoggingMeal(meal.name);
    const result = await logMeal(
      meal.name,
      meal.calories,
      { p: meal.macros?.protein, c: meal.macros?.carbs, f: meal.macros?.fats }
    );
    setLoggingMeal(null);
    if (result.success && !result.alreadyLogged) {
      const newLogged = new Set(loggedMeals);
      newLogged.add(meal.name.trim().toLowerCase());
      setLoggedMeals(newLogged);
      setShowSuccess(meal.name);
      setTimeout(() => setShowSuccess(null), 3000);
    }
  };

  if (dietLoading) {
    return (
      <div className="space-y-6">
        <Card><CardBody><p className="text-center py-8 text-gray-500">Loading today's diet plan...</p></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Today's Diet</h1>
        <p className="text-gray-600">Log your meals and stay consistent</p>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-green-800">{showSuccess} logged!</p>
            <p className="text-sm text-green-700">Nutrition progress updated.</p>
          </div>
        </div>
      )}

      {meals.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-7xl mb-4">🍽️</div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">No Diet Plan</h3>
              <p className="text-gray-600">Ask your trainer to create a nutrition plan for you.</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {meals.map((meal: any, index: number) => {
            const isLogged = loggedMeals.has(meal.name.trim().toLowerCase());
            const isLogging = loggingMeal === meal.name;
            return (
              <Card key={index} className={`${isLogged ? 'border-2 border-green-500 bg-green-50' : ''}`}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isLogged && (
                          <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <h3 className={`font-bold text-lg ${isLogged ? 'text-gray-600' : 'text-gray-800'}`}>{meal.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {meal.time}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-green-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                          </svg>
                          {meal.calories} kcal
                        </span>
                      </div>
                      {meal.foods && meal.foods.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Foods</p>
                          <ul className="space-y-1">
                            {meal.foods.map((food: any, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700">• {food.name} - {food.quantity || food.portion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {meal.macros && (
                        <div className="flex gap-4 text-xs">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">P: {meal.macros.protein || 0}g</span>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">C: {meal.macros.carbs || 0}g</span>
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-medium">F: {meal.macros.fats || 0}g</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleLogMeal(meal)}
                      disabled={isLogged || isLogging}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                        isLogged
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : isLogging
                          ? 'bg-green-200 text-green-600 cursor-wait'
                          : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
                      }`}
                    >
                      {isLogging ? (
                        <>
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
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
            );
          })}
        </div>
      )}
    </div>
  );
}
