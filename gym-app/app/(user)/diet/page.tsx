"use client";

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import MealCard from '@/components/user/MealCard';

interface Meal {
  name: string;
  time: string;
  calories: number;
  foods: {
    name: string;
    portion: string;
  }[];
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

interface NutritionPlan {
  name: string;
  dailyCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  meals: Meal[];
}

export default function DietPlanPage() {
  const [plan] = useState<NutritionPlan>({
    name: "Muscle Gain Nutrition Plan",
    dailyCalories: 2800,
    macros: {
      protein: 175,
      carbs: 350,
      fats: 78
    },
    meals: [
      {
        name: "Breakfast",
        time: "7:30 AM",
        calories: 689,
        foods: [
          { name: "Oatmeal", portion: "1 cup" },
          { name: "Banana", portion: "1 medium" },
          { name: "Whey Protein Shake", portion: "1 scoop" },
          { name: "Almonds", portion: "1 oz" }
        ],
        macros: { protein: 35, carbs: 85, fats: 15 }
      },
      {
        name: "Morning Snack",
        time: "10:30 AM",
        calories: 170,
        foods: [
          { name: "Greek Yogurt", portion: "1 cup" },
          { name: "Berries", portion: "1/2 cup" }
        ],
        macros: { protein: 20, carbs: 18, fats: 2 }
      },
      {
        name: "Lunch",
        time: "1:00 PM",
        calories: 670,
        foods: [
          { name: "Grilled Chicken Breast", portion: "6 oz" },
          { name: "Brown Rice", portion: "1 cup" },
          { name: "Broccoli", portion: "1 cup" },
          { name: "Olive Oil", portion: "1 tbsp" }
        ],
        macros: { protein: 52, carbs: 58, fats: 15 }
      }
      // Add more meals as needed
    ]
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader 
          title={plan.name}
          subtitle="Daily nutritional targets"
        />
        <CardBody>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{plan.dailyCalories}</p>
              <p className="text-sm text-gray-500">Daily Calories</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{plan.macros.protein}g</p>
              <p className="text-sm text-gray-500">Protein</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{plan.macros.carbs}g</p>
              <p className="text-sm text-gray-500">Carbs</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{plan.macros.fats}g</p>
              <p className="text-sm text-gray-500">Fats</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <h2 className="text-xl font-bold">Daily Meal Plan</h2>
      <p className="text-gray-600">Follow this plan for optimal results</p>

      <div className="space-y-4">
        {plan.meals.map((meal, index) => (
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
    </div>
  );
}
