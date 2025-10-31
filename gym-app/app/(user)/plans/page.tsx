'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import MealCard from '@/components/user/MealCard';

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');

  const meals = [
    {
      name: 'Breakfast',
      time: '7:30 AM',
      calories: 689,
      foods: [
        { name: 'Oatmeal', portion: '1 cup' },
        { name: 'Banana', portion: '1 medium' },
        { name: 'Protein Shake', portion: '1 scoop' }
      ],
      macros: { protein: 35, carbs: 85, fats: 15 }
    },
    {
      name: 'Lunch',
      time: '12:30 PM',
      calories: 750,
      foods: [
        { name: 'Grilled Chicken', portion: '200g' },
        { name: 'Brown Rice', portion: '1 cup' },
        { name: 'Mixed Vegetables', portion: '1.5 cups' }
      ],
      macros: { protein: 50, carbs: 70, fats: 18 }
    },
    {
      name: 'Dinner',
      time: '7:00 PM',
      calories: 680,
      foods: [
        { name: 'Salmon', portion: '180g' },
        { name: 'Sweet Potato', portion: '1 medium' },
        { name: 'Broccoli', portion: '1 cup' }
      ],
      macros: { protein: 45, carbs: 65, fats: 20 }
    }
  ];

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
          <Card>
            <CardHeader title="Muscle Building Program" subtitle="4-week progressive strength training program focused on hypertrophy" />
            <CardBody>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-green-100 rounded flex items-center justify-center text-4xl">💪</div>
                <div>
                  <p className="text-sm text-gray-500">4 week program</p>
                  <p className="text-sm text-gray-600 mt-1">5 days per week • 45-60 min sessions</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <h2 className="text-2xl font-bold">Week Overview</h2>

          <div className="space-y-4">
            {['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'].map((day) => (
              <Card key={day}>
                <CardBody>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-semibold">{day}</h3>
                    <Link 
                      href={`/workout/${day.toLowerCase()}`}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">Barbell Bench Press</h4>
                          <p className="text-sm text-gray-500">Rest: 90s between sets</p>
                        </div>
                        <div className="bg-gray-100 text-sm px-3 py-1 rounded-full">4 × 8-10</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">Incline Dumbbell Press</h4>
                          <p className="text-sm text-gray-500">Rest: 60s between sets</p>
                        </div>
                        <div className="bg-gray-100 text-sm px-3 py-1 rounded-full">3 × 10-12</div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Diet Plan Tab */}
      {activeTab === 'diet' && (
        <>
          <Card>
            <CardHeader title="Muscle Gain Nutrition Plan" subtitle="High-protein diet plan optimized for muscle growth and recovery" />
            <CardBody>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">2800</p>
                  <p className="text-sm text-gray-500">Daily Calories</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">180g</p>
                  <p className="text-sm text-gray-500">Protein</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">220g</p>
                  <p className="text-sm text-gray-500">Carbs</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Daily Meal Plan</h2>
            <Link 
              href="/diet"
              className="text-green-600 hover:text-green-700 text-sm font-medium"
            >
              View Full Plan →
            </Link>
          </div>

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
        </>
      )}
    </div>
  );
}
