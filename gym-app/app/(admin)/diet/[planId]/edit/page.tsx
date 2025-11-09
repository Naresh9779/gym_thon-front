"use client";
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Props { params: Promise<{ planId: string }> }

interface FoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Meal {
  time: string;
  name: string;
  foods: FoodItem[];
  totalCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

interface DietPlan {
  _id: string;
  userId: string;
  name: string;
  date: string;
  dailyCalories: number;
  macros?: { protein?: number; carbs?: number; fats?: number };
  meals?: Meal[];
}

export default function AdminEditDietPage({ params }: Props) {
  const { planId } = use(params);
  const { accessToken } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // form
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [dailyCalories, setDailyCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fats, setFats] = useState<number | ''>('');
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const token = accessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/diet/${planId}`,{ headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error?.message || 'Failed to fetch plan');
        const p = j.data.dietPlan as DietPlan;
        setPlan(p);
        setName(p.name || '');
        setDate(new Date(p.date).toISOString().slice(0,10));
        setDailyCalories(p.dailyCalories ?? '');
        setProtein(p.macros?.protein ?? '');
        setCarbs(p.macros?.carbs ?? '');
        setFats(p.macros?.fats ?? '');
        setMeals(p.meals || []);
        setLoading(false);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
        setLoading(false);
      }
    };
    run();
  }, [planId, accessToken]);

  const save = async () => {
    setSaving(true);
    const body: any = {};
    if (name && name !== plan?.name) body.name = name;
    if (date) body.date = date;
    if (typeof dailyCalories === 'number' && dailyCalories >= 0) body.dailyCalories = dailyCalories;
    const macros: any = {};
    if (typeof protein === 'number') macros.protein = protein;
    if (typeof carbs === 'number') macros.carbs = carbs;
    if (typeof fats === 'number') macros.fats = fats;
    if (Object.keys(macros).length) body.macros = macros;
    if (meals.length > 0) body.meals = meals;

    const token = accessToken();
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/diet/${planId}`,{
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await resp.json();
    setSaving(false);
    if (j.ok) {
      toast.success('Diet plan updated');
      window.location.href = `/users/${j.data.dietPlan.userId}`;
    } else {
      toast.error(j.error?.message || 'Failed to update plan');
    }
  };

  const addMeal = () => {
    setMeals([...meals, {
      time: '08:00',
      name: 'New Meal',
      foods: [],
      totalCalories: 0,
      macros: { protein: 0, carbs: 0, fats: 0 }
    }]);
  };

  const removeMeal = (mealIndex: number) => {
    setMeals(meals.filter((_, i) => i !== mealIndex));
  };

  const addFood = (mealIndex: number) => {
    const newMeals = [...meals];
    newMeals[mealIndex].foods.push({
      name: '',
      portion: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0
    });
    setMeals(newMeals);
  };

  const removeFood = (mealIndex: number, foodIndex: number) => {
    const newMeals = [...meals];
    newMeals[mealIndex].foods = newMeals[mealIndex].foods.filter((_, i) => i !== foodIndex);
    recalculateMeal(mealIndex, newMeals);
  };

  const updateFood = (mealIndex: number, foodIndex: number, field: keyof FoodItem, value: any) => {
    const newMeals = [...meals];
    newMeals[mealIndex].foods[foodIndex] = {
      ...newMeals[mealIndex].foods[foodIndex],
      [field]: value
    };
    recalculateMeal(mealIndex, newMeals);
  };

  const updateMeal = (mealIndex: number, field: 'time' | 'name', value: string) => {
    const newMeals = [...meals];
    newMeals[mealIndex][field] = value;
    setMeals(newMeals);
  };

  const recalculateMeal = (mealIndex: number, mealsArray: Meal[]) => {
    const meal = mealsArray[mealIndex];
    meal.totalCalories = meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
    meal.macros.protein = meal.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
    meal.macros.carbs = meal.foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
    meal.macros.fats = meal.foods.reduce((sum, f) => sum + (f.fats || 0), 0);
    setMeals([...mealsArray]);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !plan) return <div className="p-6 text-red-600">{error || 'Not found'}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href={`/users/${plan.userId}`} className="text-sm text-gray-600 hover:text-gray-800">← Back to User</Link>
      
      <Card className="mt-4">
        <CardHeader title="Edit Diet Plan" subtitle={plan.name} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input label="Plan Name" value={name} onChange={(e) => setName((e.target as any).value)} />
            <Input label="Date" type="date" value={date} onChange={(e) => setDate((e.target as any).value)} />
            <Input label="Daily Calories" type="number" value={dailyCalories as any} onChange={(e) => setDailyCalories(Number((e.target as any).value))} />
            <div className="grid grid-cols-3 gap-2">
              <Input label="Protein (g)" type="number" value={protein as any} onChange={(e) => setProtein(Number((e.target as any).value))} />
              <Input label="Carbs (g)" type="number" value={carbs as any} onChange={(e) => setCarbs(Number((e.target as any).value))} />
              <Input label="Fats (g)" type="number" value={fats as any} onChange={(e) => setFats(Number((e.target as any).value))} />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Meals & Foods</h3>
              <Button variant="secondary" onClick={addMeal} className="text-sm">
                + Add Meal
              </Button>
            </div>

            {meals.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No meals yet. Click "Add Meal" to create one.
              </div>
            )}

            <div className="space-y-6">
              {meals.map((meal, mealIndex) => (
                <div key={mealIndex} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Input 
                      label="Meal Time"
                      type="time"
                      value={meal.time} 
                      onChange={(e) => updateMeal(mealIndex, 'time', (e.target as any).value)}
                    />
                    <Input 
                      label="Meal Name"
                      value={meal.name} 
                      onChange={(e) => updateMeal(mealIndex, 'name', (e.target as any).value)}
                      className="md:col-span-2"
                    />
                  </div>

                  <div className="bg-white p-3 rounded border mb-3">
                    <div className="text-sm font-semibold mb-2">Meal Totals</div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Calories:</span>
                        <span className="ml-1 font-medium">{meal.totalCalories}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Protein:</span>
                        <span className="ml-1 font-medium">{meal.macros.protein}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Carbs:</span>
                        <span className="ml-1 font-medium">{meal.macros.carbs}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fats:</span>
                        <span className="ml-1 font-medium">{meal.macros.fats}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {meal.foods.map((food, foodIndex) => (
                      <div key={foodIndex} className="bg-white p-3 rounded border">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <Input 
                            label="Food Name"
                            value={food.name}
                            onChange={(e) => updateFood(mealIndex, foodIndex, 'name', (e.target as any).value)}
                            className="md:col-span-2"
                          />
                          <Input 
                            label="Portion"
                            value={food.portion}
                            onChange={(e) => updateFood(mealIndex, foodIndex, 'portion', (e.target as any).value)}
                            placeholder="e.g. 100g, 1 cup"
                          />
                          <Input 
                            label="Calories"
                            type="number"
                            value={food.calories}
                            onChange={(e) => updateFood(mealIndex, foodIndex, 'calories', Number((e.target as any).value))}
                          />
                          <Input 
                            label="Protein (g)"
                            type="number"
                            value={food.protein}
                            onChange={(e) => updateFood(mealIndex, foodIndex, 'protein', Number((e.target as any).value))}
                          />
                          <Input 
                            label="Carbs (g)"
                            type="number"
                            value={food.carbs}
                            onChange={(e) => updateFood(mealIndex, foodIndex, 'carbs', Number((e.target as any).value))}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <Input 
                            label="Fats (g)"
                            type="number"
                            value={food.fats}
                            onChange={(e) => updateFood(mealIndex, foodIndex, 'fats', Number((e.target as any).value))}
                          />
                          <div className="flex items-end">
                            <button
                              onClick={() => removeFood(mealIndex, foodIndex)}
                              className="text-sm text-red-600 hover:text-red-800 pb-2"
                            >
                              Remove Food
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between mt-3">
                    <Button 
                      variant="secondary" 
                      onClick={() => addFood(mealIndex)}
                      className="text-sm"
                    >
                      + Add Food to {meal.name}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => removeMeal(mealIndex)}
                      className="text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove Meal
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Link href={`/users/${plan.userId}`}>
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button 
              variant="primary" 
              className="bg-green-500 hover:bg-green-600" 
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
