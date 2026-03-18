"use client";
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';

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

export default function AdminEditWorkoutPage({ params }: Props) {
  const { planId } = use(params);
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationWeeks, setDurationWeeks] = useState<number | ''>('');
  const [status, setStatus] = useState<WorkoutPlan['status']>('active');
  const [days, setDays] = useState<WorkoutDay[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/workouts/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error?.message || 'Failed to fetch plan');
        const p = j.data.workoutPlan as WorkoutPlan;
        setPlan(p);
        setName(p.name || '');
        setStartDate(new Date(p.startDate).toISOString().slice(0, 10));
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
  }, [planId, getAccessToken]);

  const save = async () => {
    setSaving(true);
    const body: any = {};
    if (name && name !== plan?.name) body.name = name;
    if (startDate) body.startDate = startDate;
    if (typeof durationWeeks === 'number' && durationWeeks > 0) body.durationWeeks = durationWeeks;
    if (status) body.status = status;
    if (days.length > 0) body.days = days;

    const token = getAccessToken();
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/workouts/${planId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await resp.json();
    setSaving(false);
    if (j.ok) {
      toast.success('Workout plan updated');
      router.push(`/users/${j.data.workoutPlan.userId}`);
    } else {
      toast.error(j.error?.message || 'Failed to update plan');
    }
  };

  const addDay = () => setDays([...days, { day: days.length + 1, name: `Day ${days.length + 1}`, exercises: [] }]);
  const removeDay = (i: number) => setDays(days.filter((_, idx) => idx !== i));
  const addExercise = (di: number) => { const d = [...days]; d[di].exercises.push({ name: '', sets: 3, reps: 10, rest: 60 }); setDays(d); };
  const removeExercise = (di: number, ei: number) => { const d = [...days]; d[di].exercises = d[di].exercises.filter((_, i) => i !== ei); setDays(d); };
  const updateExercise = (di: number, ei: number, field: keyof Exercise, value: any) => {
    const d = [...days]; d[di].exercises[ei] = { ...d[di].exercises[ei], [field]: value }; setDays(d);
  };
  const updateDayName = (di: number, v: string) => { const d = [...days]; d[di].name = v; setDays(d); };

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
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Edit Workout Plan</h1>
        <p className="text-sm text-gray-400 mt-1">{plan.name}</p>
      </motion.div>

      {section('Plan Details', 'Basic info and configuration', (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-cap block mb-2">Plan Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="label-cap block mb-2">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="label-cap block mb-2">Duration (weeks)</label>
            <input type="number" value={durationWeeks as any} onChange={e => setDurationWeeks(Number(e.target.value))} className={inputCls} min="1" />
          </div>
          <div>
            <label className="label-cap block mb-2">Status</label>
            <CustomSelect
              value={status || 'active'}
              onChange={v => setStatus(v as any)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>
      ))}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <div>
            <h2 className="font-black text-gray-900">Workout Days</h2>
            <p className="text-xs text-gray-400 mt-0.5">{days.length} day{days.length !== 1 ? 's' : ''} configured</p>
          </div>
          <button
            type="button"
            onClick={addDay}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-[#00E676] text-xs font-black hover:bg-gray-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Day
          </button>
        </div>

        <div className="p-5 space-y-4">
          {days.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No workout days yet. Click "Add Day" to create one.</p>
          ) : days.map((day, di) => (
            <div key={di} className="border-2 border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-gray-50">
                <input
                  type="text"
                  value={day.name}
                  onChange={e => updateDayName(di, e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-black focus:border-gray-900 focus:outline-none bg-white"
                  placeholder={`Day ${day.day} name`}
                />
                <button type="button" onClick={() => removeDay(di)} className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 space-y-2">
                {day.exercises.map((ex, ei) => (
                  <div key={ei} className="bg-white border border-gray-100 rounded-xl p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                      <div className="sm:col-span-2">
                        <label className="label-cap block mb-1">Exercise</label>
                        <input type="text" value={ex.name} onChange={e => updateExercise(di, ei, 'name', e.target.value)} className={inputCls} placeholder="e.g. Bench Press" />
                      </div>
                      <div>
                        <label className="label-cap block mb-1">Sets</label>
                        <input type="number" value={ex.sets} onChange={e => updateExercise(di, ei, 'sets', Number(e.target.value))} className={inputCls} min="1" />
                      </div>
                      <div>
                        <label className="label-cap block mb-1">Reps</label>
                        <input type="number" value={ex.reps} onChange={e => updateExercise(di, ei, 'reps', Number(e.target.value))} className={inputCls} min="1" />
                      </div>
                      <div>
                        <label className="label-cap block mb-1">Rest (s)</label>
                        <input type="number" value={ex.rest} onChange={e => updateExercise(di, ei, 'rest', Number(e.target.value))} className={inputCls} min="0" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="text" value={ex.notes || ''} onChange={e => updateExercise(di, ei, 'notes', e.target.value)} className={`${inputCls} flex-1`} placeholder="Notes (optional)" />
                      <button type="button" onClick={() => removeExercise(di, ei)} className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addExercise(di)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
                >
                  + Add Exercise
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
