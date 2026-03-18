"use client";
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, Loader2 } from 'lucide-react';

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
  macros: { protein: number; carbs: number; fats: number };
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

const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none transition-all text-sm font-medium bg-white";

const section = (title: string, sub: string, children: React.ReactNode) => (
  <div className="bg-white rounded-2xl border border-gray-100">
    <div className="p-4 border-b border-gray-50">
      <h2 className="font-black text-gray-900">{title}</h2>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

export default function AdminEditDietPage({ params }: Props) {
  const { planId } = use(params);
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
        const token = getAccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/diet/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error?.message || 'Failed to fetch plan');
        const p = j.data.dietPlan as DietPlan;
        setPlan(p);
        setName(p.name || '');
        setDate(new Date(p.date).toISOString().slice(0, 10));
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
  }, [planId, getAccessToken]);

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

    const token = getAccessToken();
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/diet/${planId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await resp.json();
    setSaving(false);
    if (j.ok) {
      toast.success('Diet plan updated');
      router.push(`/users/${j.data.dietPlan.userId}`);
    } else {
      toast.error(j.error?.message || 'Failed to update plan');
    }
  };

  const addMeal = () => setMeals([...meals, { time: '08:00', name: 'New Meal', foods: [], totalCalories: 0, macros: { protein: 0, carbs: 0, fats: 0 } }]);
  const removeMeal = (i: number) => setMeals(meals.filter((_, idx) => idx !== i));

  const addFood = (mi: number) => {
    const m = [...meals];
    m[mi].foods.push({ name: '', portion: '', calories: 0, protein: 0, carbs: 0, fats: 0 });
    setMeals(m);
  };

  const removeFood = (mi: number, fi: number) => {
    const m = [...meals];
    m[mi].foods = m[mi].foods.filter((_, i) => i !== fi);
    recalcMeal(mi, m);
  };

  const updateFood = (mi: number, fi: number, field: keyof FoodItem, value: any) => {
    const m = [...meals];
    m[mi].foods[fi] = { ...m[mi].foods[fi], [field]: value };
    recalcMeal(mi, m);
  };

  const updateMeal = (mi: number, field: 'time' | 'name', value: string) => {
    const m = [...meals]; m[mi][field] = value; setMeals(m);
  };

  const recalcMeal = (mi: number, arr: Meal[]) => {
    const meal = arr[mi];
    meal.totalCalories = meal.foods.reduce((s, f) => s + (f.calories || 0), 0);
    meal.macros.protein = meal.foods.reduce((s, f) => s + (f.protein || 0), 0);
    meal.macros.carbs = meal.foods.reduce((s, f) => s + (f.carbs || 0), 0);
    meal.macros.fats = meal.foods.reduce((s, f) => s + (f.fats || 0), 0);
    setMeals([...arr]);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error || !plan) return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-semibold text-red-600">{error || 'Not found'}</div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href={`/users/${plan.userId}`} className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to User
        </Link>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Edit Diet Plan</h1>
        <p className="text-sm text-gray-400 mt-1">{plan.name}</p>
      </motion.div>

      {section('Plan Details', 'Calories and macro targets', (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-cap block mb-2">Plan Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="label-cap block mb-2">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="label-cap block mb-2">Daily Calories <span className="text-gray-400 normal-case font-medium">(kcal)</span></label>
            <input type="number" value={dailyCalories as any} onChange={e => setDailyCalories(Number(e.target.value))} className={inputCls} min="0" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Protein', val: protein, set: setProtein },
              { label: 'Carbs', val: carbs, set: setCarbs },
              { label: 'Fats', val: fats, set: setFats },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="label-cap block mb-2">{label} <span className="text-gray-400 normal-case">(g)</span></label>
                <input type="number" value={val as any} onChange={e => set(Number(e.target.value))} className={inputCls} min="0" />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <div>
            <h2 className="font-black text-gray-900">Meals</h2>
            <p className="text-xs text-gray-400 mt-0.5">{meals.length} meal{meals.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            type="button"
            onClick={addMeal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-[#00E676] text-xs font-black hover:bg-gray-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Meal
          </button>
        </div>

        <div className="p-5 space-y-4">
          {meals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No meals yet. Click "Add Meal" to create one.</p>
          ) : meals.map((meal, mi) => (
            <div key={mi} className="border-2 border-gray-100 rounded-2xl overflow-hidden">
              {/* Meal header */}
              <div className="flex items-center gap-3 p-3 bg-gray-50">
                <input
                  type="time"
                  value={meal.time}
                  onChange={e => updateMeal(mi, 'time', e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-gray-900 focus:outline-none bg-white w-32"
                />
                <input
                  type="text"
                  value={meal.name}
                  onChange={e => updateMeal(mi, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-black focus:border-gray-900 focus:outline-none bg-white"
                  placeholder="Meal name"
                />
                <button type="button" onClick={() => removeMeal(mi)} className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Meal totals */}
              <div className="grid grid-cols-4 gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                {[
                  { label: 'Calories', val: meal.totalCalories, unit: 'kcal' },
                  { label: 'Protein', val: meal.macros.protein, unit: 'g' },
                  { label: 'Carbs', val: meal.macros.carbs, unit: 'g' },
                  { label: 'Fats', val: meal.macros.fats, unit: 'g' },
                ].map(({ label, val, unit }) => (
                  <div key={label} className="text-center">
                    <p className="label-cap">{label}</p>
                    <p className="text-sm font-black text-gray-900">{val}<span className="text-gray-400 font-medium text-xs">{unit}</span></p>
                  </div>
                ))}
              </div>

              {/* Foods */}
              <div className="p-3 space-y-2">
                {meal.foods.map((food, fi) => (
                  <div key={fi} className="bg-white border border-gray-100 rounded-xl p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-2">
                      <div className="sm:col-span-2">
                        <label className="label-cap block mb-1">Food</label>
                        <input type="text" value={food.name} onChange={e => updateFood(mi, fi, 'name', e.target.value)} className={inputCls} placeholder="e.g. Chicken breast" />
                      </div>
                      <div>
                        <label className="label-cap block mb-1">Portion</label>
                        <input type="text" value={food.portion} onChange={e => updateFood(mi, fi, 'portion', e.target.value)} className={inputCls} placeholder="100g" />
                      </div>
                      <div>
                        <label className="label-cap block mb-1">Cal</label>
                        <input type="number" value={food.calories} onChange={e => updateFood(mi, fi, 'calories', Number(e.target.value))} className={inputCls} min="0" />
                      </div>
                      <div>
                        <label className="label-cap block mb-1">Protein</label>
                        <input type="number" value={food.protein} onChange={e => updateFood(mi, fi, 'protein', Number(e.target.value))} className={inputCls} min="0" />
                      </div>
                      <div>
                        <label className="label-cap block mb-1">Carbs</label>
                        <input type="number" value={food.carbs} onChange={e => updateFood(mi, fi, 'carbs', Number(e.target.value))} className={inputCls} min="0" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="label-cap block mb-1">Fats</label>
                        <input type="number" value={food.fats} onChange={e => updateFood(mi, fi, 'fats', Number(e.target.value))} className={inputCls} min="0" />
                      </div>
                      <button type="button" onClick={() => removeFood(mi, fi)} className="mt-5 p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addFood(mi)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
                >
                  + Add Food
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Link href={`/users/${plan.userId}`} className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </Link>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
        </motion.button>
      </div>
    </div>
  );
}
