"use client";
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface Props { params: Promise<{ planId: string }> }

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest: number;
  notes?: string;
}

interface WorkoutDay {
  day: number;
  name: string;
  exercises: Exercise[];
}

interface WorkoutPlan {
  _id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate?: string;
  duration?: number;
  status?: 'active' | 'completed' | 'cancelled';
  days?: WorkoutDay[];
}

export default function AdminEditWorkoutPage({ params }: Props) {
  const { planId } = use(params);
  const { accessToken } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // form
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationWeeks, setDurationWeeks] = useState<number | ''>('');
  const [status, setStatus] = useState<WorkoutPlan['status']>('active');
  const [days, setDays] = useState<WorkoutDay[]>([]);

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
        setDays(p.days || []);
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
    if (startDate) body.startDate = startDate;
    if (typeof durationWeeks === 'number' && durationWeeks > 0) body.durationWeeks = durationWeeks;
    if (status) body.status = status;
    if (days.length > 0) body.days = days;

    const token = accessToken();
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/workouts/${planId}`,{
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await resp.json();
    setSaving(false);
    if (j.ok) {
      toast.success('Workout plan updated');
      window.location.href = `/users/${j.data.workoutPlan.userId}`;
    } else {
      toast.error(j.error?.message || 'Failed to update plan');
    }
  };

  const addDay = () => {
    setDays([...days, { day: days.length + 1, name: `Day ${days.length + 1}`, exercises: [] }]);
  };

  const removeDay = (dayIndex: number) => {
    setDays(days.filter((_, i) => i !== dayIndex));
  };

  const addExercise = (dayIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].exercises.push({ name: '', sets: 3, reps: 10, rest: 60 });
    setDays(newDays);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].exercises = newDays[dayIndex].exercises.filter((_, i) => i !== exerciseIndex);
    setDays(newDays);
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, field: keyof Exercise, value: any) => {
    const newDays = [...days];
    newDays[dayIndex].exercises[exerciseIndex] = {
      ...newDays[dayIndex].exercises[exerciseIndex],
      [field]: value
    };
    setDays(newDays);
  };

  const updateDayName = (dayIndex: number, newName: string) => {
    const newDays = [...days];
    newDays[dayIndex].name = newName;
    setDays(newDays);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !plan) return <div className="p-6 text-red-600">{error || 'Not found'}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href={`/users/${plan.userId}`} className="text-sm text-gray-600 hover:text-gray-800">← Back to User</Link>
      
      <Card className="mt-4">
        <CardHeader title="Edit Workout Plan" subtitle={plan.name} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input label="Plan Name" value={name} onChange={(e) => setName((e.target as any).value)} />
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate((e.target as any).value)} />
            <Input label="Duration (weeks)" type="number" value={durationWeeks as any} onChange={(e) => setDurationWeeks(Number((e.target as any).value))} />
            <Select label="Status" value={status} onChange={(v) => setStatus(v as any)} options={[
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]} />
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Workout Days & Exercises</h3>
              <Button variant="secondary" onClick={addDay} className="text-sm">
                + Add Day
              </Button>
            </div>

            {days.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No workout days yet. Click "Add Day" to create one.
              </div>
            )}

            <div className="space-y-6">
              {days.map((day, dayIndex) => (
                <div key={dayIndex} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <Input 
                      label={`Day ${day.day} Name`}
                      value={day.name} 
                      onChange={(e) => updateDayName(dayIndex, (e.target as any).value)}
                      className="flex-1 mr-4"
                    />
                    <Button 
                      variant="secondary" 
                      onClick={() => removeDay(dayIndex)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Remove Day
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {day.exercises.map((exercise, exerciseIndex) => (
                      <div key={exerciseIndex} className="bg-white p-3 rounded border">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <Input 
                            label="Exercise Name"
                            value={exercise.name}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'name', (e.target as any).value)}
                            className="md:col-span-2"
                          />
                          <Input 
                            label="Sets"
                            type="number"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'sets', Number((e.target as any).value))}
                          />
                          <Input 
                            label="Reps"
                            type="number"
                            value={exercise.reps}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'reps', Number((e.target as any).value))}
                          />
                          <Input 
                            label="Rest (sec)"
                            type="number"
                            value={exercise.rest}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'rest', Number((e.target as any).value))}
                          />
                        </div>
                        <div className="mt-2">
                          <Input 
                            label="Notes (optional)"
                            value={exercise.notes || ''}
                            onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'notes', (e.target as any).value)}
                            placeholder="Form cues, tips..."
                          />
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => removeExercise(dayIndex, exerciseIndex)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove Exercise
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    variant="secondary" 
                    onClick={() => addExercise(dayIndex)}
                    className="mt-3 w-full text-sm"
                  >
                    + Add Exercise to {day.name}
                  </Button>
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
