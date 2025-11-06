"use client";
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface Props { params: Promise<{ planId: string }> }

interface WorkoutPlan {
  _id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate?: string;
  duration?: number;
  status?: 'active' | 'completed' | 'cancelled';
}

export default function AdminEditWorkoutPage({ params }: Props) {
  const { planId } = use(params);
  const { accessToken } = useAuth();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // form
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationWeeks, setDurationWeeks] = useState<number | ''>('');
  const [status, setStatus] = useState<WorkoutPlan['status']>('active');

  useEffect(() => {
    const run = async () => {
      try {
        const token = accessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/workouts/${planId}`,{ headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error?.message || 'Failed to fetch plan');
        const p = j.data.workoutPlan as WorkoutPlan;
        setPlan(p);
        setName(p.name || '');
        setStartDate(new Date(p.startDate).toISOString().slice(0,10));
        setDurationWeeks(p.duration ?? '');
        setStatus(p.status ?? 'active');
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
    if (startDate) body.startDate = startDate;
    if (typeof durationWeeks === 'number' && durationWeeks > 0) body.durationWeeks = durationWeeks;
    if (status) body.status = status;

    const token = accessToken();
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/workouts/${planId}`,{
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await resp.json();
    if (j.ok) {
      alert('Workout plan updated');
      window.location.href = `/users/${j.data.workoutPlan.userId}`;
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
        <CardHeader title="Edit Workout Plan" subtitle={plan.name} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Name" value={name} onChange={(e) => setName((e.target as any).value)} />
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate((e.target as any).value)} />
            <Input label="Duration (weeks)" type="number" value={durationWeeks as any} onChange={(e) => setDurationWeeks(Number((e.target as any).value))} />
            <Select label="Status" value={status} onChange={(v) => setStatus(v as any)} options={[
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]} />
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="primary" className="bg-green-500 hover:bg-green-600" onClick={save}>Save</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
