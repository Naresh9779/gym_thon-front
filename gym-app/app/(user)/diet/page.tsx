"use client";
import { useDietPlan } from "@/hooks/useDietPlan";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import MealCard from "@/components/user/MealCard";

export default function DietPlanPage() {
  const { plans, loading, error, refresh } = useDietPlan();

  const latest = plans[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Diet Plan</h1>
          <p className="text-gray-600 mt-1">Your personalized nutrition plan</p>
        </div>
        <Button variant="secondary" onClick={()=>refresh()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading plans...
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {!loading && plans.length === 0 && (
        <Card className="p-12 text-center bg-gradient-to-br from-orange-50 to-white">
          <div className="text-orange-400 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Diet Plan Generated Yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your trainer hasn't created a personalized diet plan for you yet. Please contact your trainer to get started with a customized nutrition plan.
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              variant="primary" 
              className="bg-green-500 hover:bg-green-600"
              onClick={() => window.location.href = 'mailto:trainer@fitflow.com?subject=Diet Plan Request'}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Trainer
            </Button>
          </div>
        </Card>
      )}

      {latest && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{latest.name}</h2>
            <span className="text-sm text-gray-500">
              {new Date(latest.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-white">
            <h3 className="font-semibold text-lg mb-4">Daily Nutrition Targets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-green-600">{latest.dailyCalories}</p>
                <p className="text-sm text-gray-600 mt-1">Calories</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-blue-600">{latest.macros?.protein}g</p>
                <p className="text-sm text-gray-600 mt-1">Protein</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-orange-600">{latest.macros?.carbs}g</p>
                <p className="text-sm text-gray-600 mt-1">Carbs</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-purple-600">{latest.macros?.fats}g</p>
                <p className="text-sm text-gray-600 mt-1">Fats</p>
              </div>
            </div>
          </Card>

          <div>
            <h3 className="font-semibold text-lg mb-4">Meal Plan</h3>
            <div className="space-y-4">
              {latest.meals?.map((meal:any, idx:number)=> (
                <MealCard
                  key={idx}
                  mealName={meal.name}
                  time={meal.time}
                  calories={meal.calories}
                  foods={meal.foods}
                  macros={meal.macros || { protein:0, carbs:0, fats:0 }}
                  onLog={()=>{}}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
