"use client";
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Props { params: Promise<{ planId: string }> }

interface DietPlan {
  _id: string;
  userId: string;
  name: string;
  date: string;
  dailyCalories: number;
  macros?: { protein?: number; carbs?: number; fats?: number };
  meals?: any[];
}

export default function AdminEditDietPage({ params }: Props) {
  const { planId } = use(params);
  const { accessToken } = useAuth();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // form
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [dailyCalories, setDailyCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fats, setFats] = useState<number | ''>('');

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
        setLoading(false);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
        setLoading(false);
      }
    };
    run();
  }, [planId, accessToken]);

  const save = async () => {
    const body: any = {};
    if (name && name !== plan?.name) body.name = name;
    if (date) body.date = date;
    if (typeof dailyCalories === 'number' && dailyCalories >= 0) body.dailyCalories = dailyCalories;
    const macros: any = {};
    if (typeof protein === 'number') macros.protein = protein;
    if (typeof carbs === 'number') macros.carbs = carbs;
    if (typeof fats === 'number') macros.fats = fats;
    if (Object.keys(macros).length) body.macros = macros;

    const token = accessToken();
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/diet/${planId}`,{
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await resp.json();
    if (j.ok) {
      alert('Diet plan updated');
      window.location.href = `/users/${j.data.dietPlan.userId}`;
    } else {
      alert(j.error?.message || 'Failed to update plan');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !plan) return <div className="p-6 text-red-600">{error || 'Not found'}</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href={`/users/${plan.userId}`} className="text-sm text-gray-600">← Back</Link>
      <Card className="mt-4">
        <CardHeader title="Edit Diet Plan" subtitle={plan.name} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" value={name} onChange={(e) => setName((e.target as any).value)} />
            <Input label="Date" type="date" value={date} onChange={(e) => setDate((e.target as any).value)} />
            <Input label="Daily Calories" type="number" value={dailyCalories as any} onChange={(e) => setDailyCalories(Number((e.target as any).value))} />
            <Input label="Protein (g)" type="number" value={protein as any} onChange={(e) => setProtein(Number((e.target as any).value))} />
            <Input label="Carbs (g)" type="number" value={carbs as any} onChange={(e) => setCarbs(Number((e.target as any).value))} />
            <Input label="Fats (g)" type="number" value={fats as any} onChange={(e) => setFats(Number((e.target as any).value))} />
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="primary" className="bg-green-500 hover:bg-green-600" onClick={save}>Save</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
