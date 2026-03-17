'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MealCard from '@/components/user/MealCard';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useUserProgress } from '@/hooks/useUserProgress';
import { Salad, Flame } from 'lucide-react';

export default function TodayDietPage() {
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { logs } = useUserProgress();

  const latestDiet = dietPlans?.[0];
  const meals = latestDiet?.meals || [];

  // Compute total calories and daily target
  const totalCalories = latestDiet?.dailyCalories ?? 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = logs.find(log => new Date(log.date).toISOString().slice(0, 10) === todayStr);
  const loggedCalories = todayLog?.meals?.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) ?? 0;
  const caloriePct = totalCalories > 0 ? Math.min(Math.round((loggedCalories / totalCalories) * 100), 100) : 0;

  if (dietLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-sm">
            <Salad className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today's Diet</h1>
            <p className="text-sm text-gray-500">Log your meals and stay consistent</p>
          </div>
        </div>
      </motion.div>

      {/* Calorie progress */}
      {totalCalories > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Calories</p>
              <p className="text-lg font-bold text-gray-900">
                {loggedCalories} <span className="text-gray-400 font-normal">/ {totalCalories} kcal</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-orange-500">
              <Flame className="w-5 h-5" />
              <span className="text-2xl font-extrabold tabular-nums">{caloriePct}%</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full"
              animate={{ width: `${caloriePct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* Meals */}
      {meals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm"
        >
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Salad className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Diet Plan</h3>
          <p className="text-gray-500">Ask your trainer to create a nutrition plan for you.</p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {meals.map((meal: any, index: number) => (
            <motion.div
              key={index}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            >
              <MealCard
                mealName={meal.name}
                time={meal.time}
                calories={meal.calories}
                foods={meal.foods}
                macros={meal.macros}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
