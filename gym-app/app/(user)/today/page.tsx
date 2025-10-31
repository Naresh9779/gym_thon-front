'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import MealCard from '@/components/user/MealCard';
import ExerciseCard from '@/components/user/ExerciseCard';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
}

interface Meal {
  name: string;
  time: string;
  calories: number;
  foods: { name: string; portion: string }[];
  macros: { protein: number; carbs: number; fats: number };
}

export default function TodayPage() {
  const [exercises] = useState<Exercise[]>([
    {
      name: 'Barbell Bench Press',
      sets: 4,
      reps: '8-10',
      rest: 90
    },
    {
      name: 'Incline Dumbbell Press',
      sets: 3,
      reps: '10-12',
      rest: 60
    },
    {
      name: 'Cable Flyes',
      sets: 3,
      reps: '12-15',
      rest: 60
    },
    {
      name: 'Tricep Dips',
      sets: 3,
      reps: '8-10',
      rest: 60
    }
  ]);

  const [meals, setMeals] = useState<Meal[]>([
    {
      name: 'Breakfast',
      time: '7:30 AM',
      calories: 689,
      foods: [
        { name: 'Oatmeal', portion: '1 cup' },
        { name: 'Banana', portion: '1 medium' },
      ],
      macros: { protein: 35, carbs: 85, fats: 15 }
    },
    // Add more meals as needed
  ]);

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
              <p className="text-2xl font-bold text-gray-800">4</p>
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
              <p className="text-2xl font-bold text-gray-800">2800</p>
              <p className="text-xs text-gray-500 mt-1">Target Cal</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-2 shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-800">5</p>
              <p className="text-xs text-gray-500 mt-1">Active Days</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Workout Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Today's Workout</h2>
        <div className="space-y-4">
          {exercises.map((exercise, index) => (
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
          <Link href="/workout/today">
            <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:from-green-600 hover:to-green-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Workout
            </button>
          </Link>
        </div>
      </section>

      {/* Meals Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Today's Meals</h2>
        <div className="space-y-4">
          {meals.map((meal, index) => (
            <MealCard
              key={index}
              mealName={meal.name}
              time={meal.time}
              calories={meal.calories}
              foods={meal.foods}
              macros={meal.macros}
              onLog={() => alert(`Logged ${meal.name}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}