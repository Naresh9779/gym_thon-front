'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import MealCard from '@/components/user/MealCard';
import ExerciseCard from '@/components/user/ExerciseCard';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useDietPlan } from '@/hooks/useDietPlan';
import { Dumbbell, Salad, ChevronDown, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [expandedDietDay, setExpandedDietDay] = useState<number | null>(null);
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();

  const latestWorkout = workoutPlans[0];

  // Find latest weekly diet plan
  const latestDiet = dietPlans[0];
  const dietDays: any[] = latestDiet?.days || [];

  return (
    <div className="space-y-4 pb-6">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Your programs</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Plans</h1>
      </motion.div>

      {/* ── TAB PILLS ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex bg-black/5 rounded-2xl p-1 gap-1"
      >
        {[
          { key: 'workout', label: 'Workout', icon: Dumbbell },
          { key: 'diet',    label: 'Nutrition', icon: Salad },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'workout' | 'diet')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── WORKOUT TAB ── */}
        {activeTab === 'workout' && (
          <motion.div
            key="workout"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="space-y-3"
          >
            {workoutLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
              </div>
            ) : latestWorkout ? (
              <>
                {/* Plan hero */}
                <div className="hero-card p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="label-cap text-gray-500 mb-2">Active program</p>
                      <h2 className="text-xl font-black text-white leading-tight">{latestWorkout.name || 'Workout Program'}</h2>
                      <p className="text-xs text-gray-500 mt-1">{latestWorkout.durationWeeks || 4}-week plan</p>
                    </div>
                    <div className="text-right">
                      <p className="stat-hero text-white num">{latestWorkout.days?.length || 0}</p>
                      <p className="label-cap text-gray-500">days</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Link
                      href="/today-workout"
                      className="flex items-center gap-2 text-[#00E676] text-sm font-bold"
                    >
                      Go to today's workout <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Day accordion */}
                <div className="space-y-2">
                  {latestWorkout.days?.map((day: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="text-left">
                          <p className="font-black text-gray-900">{day.day || `Day ${idx + 1}`}</p>
                          <p className="label-cap mt-0.5">
                            {day.exercises?.length
                              ? `${day.exercises.length} exercises`
                              : 'Rest day'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {day.exercises?.length > 0 && (
                            <span className="text-xs font-bold bg-black text-[#00E676] px-2.5 py-1 rounded-full">
                              {day.exercises.length}
                            </span>
                          )}
                          <motion.div animate={{ rotate: expandedDay === idx ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </motion.div>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {expandedDay === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                          >
                            <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
                              {day.exercises?.length ? (
                                day.exercises.map((ex: any, i: number) => (
                                  <ExerciseCard key={i} name={ex.name} sets={ex.sets} reps={ex.reps} rest={ex.rest} />
                                ))
                              ) : (
                                <div className="py-6 text-center">
                                  <p className="text-gray-400 text-sm font-medium">Recovery day — rest up</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Dumbbell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-xl font-black text-gray-900 mb-2">No Workout Plan</p>
                <p className="text-gray-400 text-sm">Contact your trainer to get a personalized program.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── DIET TAB ── */}
        {activeTab === 'diet' && (
          <motion.div
            key="diet"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="space-y-3"
          >
            {dietLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
              </div>
            ) : latestDiet ? (
              <>
                {/* Diet hero */}
                <div className="hero-card p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="label-cap text-gray-500 mb-2">Active plan</p>
                      <h2 className="text-xl font-black text-white leading-tight">{latestDiet.name || 'Nutrition Plan'}</h2>
                      {latestDiet.weekStartDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(latestDiet.weekStartDate, { month: 'short', day: 'numeric' })}
                          {latestDiet.weekEndDate && ` – ${formatDate(latestDiet.weekEndDate, { month: 'short', day: 'numeric' })}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="stat-hero accent-orange num">{latestDiet.avgDailyCalories || latestDiet.dailyCalories || 0}</p>
                      <p className="label-cap text-gray-500">kcal/day</p>
                    </div>
                  </div>
                  {(latestDiet.avgMacros || latestDiet.macros) && (
                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
                      {[
                        { label: 'Protein', val: (latestDiet.avgMacros || latestDiet.macros)?.protein, color: 'text-red-400' },
                        { label: 'Carbs',   val: (latestDiet.avgMacros || latestDiet.macros)?.carbs,   color: 'text-yellow-400' },
                        { label: 'Fats',    val: (latestDiet.avgMacros || latestDiet.macros)?.fats,    color: 'text-blue-400' },
                      ].map(m => (
                        <div key={m.label} className="text-center">
                          <p className={`text-xl font-black num ${m.color}`}>{m.val ?? 0}<span className="text-xs font-bold text-gray-600 ml-0.5">g</span></p>
                          <p className="label-cap">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <Link href="/today-diet" className="flex items-center gap-2 text-[#00E676] text-sm font-bold">
                      Log today's meals <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Day-by-day accordion (weekly plan) */}
                {dietDays.length > 0 ? (
                  <div className="space-y-2">
                    {dietDays.map((day: any, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedDietDay(expandedDietDay === idx ? null : idx)}
                          className="w-full flex items-center justify-between p-4"
                        >
                          <div className="text-left">
                            <p className="font-black text-gray-900">
                              {day.dayName || `Day ${idx + 1}`}
                              {day.date && (
                                <span className="text-xs text-gray-400 font-medium ml-2">
                                  {formatDate(day.date, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </p>
                            <p className="label-cap mt-0.5">
                              {day.meals?.length
                                ? `${day.meals.length} meals · ${day.totalCalories ?? 0} kcal`
                                : 'No meals'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {day.meals?.length > 0 && (
                              <span className="text-xs font-bold bg-orange-50 text-orange-500 px-2.5 py-1 rounded-full">
                                {day.meals.length}
                              </span>
                            )}
                            <motion.div animate={{ rotate: expandedDietDay === idx ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            </motion.div>
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {expandedDietDay === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                            >
                              <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
                                {day.meals?.length ? (
                                  day.meals.map((meal: any, i: number) => (
                                    <MealCard
                                      key={i}
                                      mealName={meal.name}
                                      time={meal.time}
                                      calories={meal.totalCalories ?? meal.calories}
                                      foods={meal.foods || []}
                                      macros={meal.macros}
                                    />
                                  ))
                                ) : (
                                  <div className="py-6 text-center">
                                    <p className="text-gray-400 text-sm font-medium">No meals for this day</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  // Legacy: no days array, show flat meals
                  <div className="space-y-2">
                    {(latestDiet.meals || []).map((meal: any, i: number) => (
                      <MealCard
                        key={i}
                        mealName={meal.name}
                        time={meal.time}
                        calories={meal.totalCalories ?? meal.calories}
                        foods={meal.foods || []}
                        macros={meal.macros}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Salad className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-xl font-black text-gray-900 mb-2">No Nutrition Plan</p>
                <p className="text-gray-400 text-sm">Ask your trainer to set up a nutrition plan.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
