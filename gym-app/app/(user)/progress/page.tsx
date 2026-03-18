'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressChart from '@/components/user/ProgressChart';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useDietPlan } from '@/hooks/useDietPlan';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Scale, Plus, ChevronDown, TrendingDown, TrendingUp, ClipboardList, Zap, Moon, Activity } from 'lucide-react';

interface Measurement { date: string; weight?: number; bodyFat?: number; waist?: number; hips?: number; chest?: number }

const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none text-sm font-medium bg-white transition-all";

export default function ProgressPage() {
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { plans: dietPlans, loading: dietLoading } = useDietPlan();
  const { stats, loading: progressLoading } = useUserProgress();
  const { getAccessToken } = useAuth();
  const toast = useToast();

  const [trendData, setTrendData] = useState<{ date: string; workouts: number; meals: number; value: number }[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [savingMeasure, setSavingMeasure] = useState(false);
  const [form, setForm] = useState({ weight: '', bodyFat: '', waist: '', hips: '', chest: '' });
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);

  const latestWorkout = workoutPlans?.[0];
  const latestDiet = dietPlans?.[0];
  const loading = workoutLoading || dietLoading || progressLoading;

  const fetchMeasurements = useCallback(async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/measurements?days=90`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.ok) setMeasurements(json.data.entries || []);
    } catch { /* ignore */ }
  }, [getAccessToken]);

  useEffect(() => {
    async function loadTrends() {
      try {
        const token = getAccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/trends?days=14`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) {
          const series = json.data.series as Array<{ date: string; workouts: number; meals: number }>;
          setTrendData(series.map(d => ({
            date: d.date.slice(5),
            workouts: d.workouts,
            meals: d.meals,
            value: d.workouts * 2 + d.meals,
          })));
        }
      } catch { /* ignore */ }
    }
    loadTrends();
    fetchMeasurements();

    // Load check-in history
    (async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/checkin-history?limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.ok) setCheckInHistory(json.data.history || []);
      } catch { /* ignore */ }
    })();
  }, [getAccessToken, fetchMeasurements]);

  const handleSaveMeasurement = async () => {
    const weight = parseFloat(form.weight);
    const bodyFat = parseFloat(form.bodyFat);
    const waist = parseFloat(form.waist);
    const hips = parseFloat(form.hips);
    const chest = parseFloat(form.chest);

    if (!form.weight && !form.bodyFat && !form.waist && !form.hips && !form.chest) {
      toast.error('Enter at least one measurement');
      return;
    }

    setSavingMeasure(true);
    try {
      const token = getAccessToken();
      const date = new Date().toISOString().slice(0, 10);
      const body: any = { date };
      if (!isNaN(weight)) body.weight = weight;
      if (!isNaN(bodyFat)) body.bodyFat = bodyFat;
      if (!isNaN(waist)) body.waist = waist;
      if (!isNaN(hips)) body.hips = hips;
      if (!isNaN(chest)) body.chest = chest;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/measurements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success('Measurements saved!');
        setForm({ weight: '', bodyFat: '', waist: '', hips: '', chest: '' });
        setShowMeasureForm(false);
        await fetchMeasurements();
      } else {
        toast.error(json.error?.message || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save measurements');
    } finally {
      setSavingMeasure(false);
    }
  };

  const latest = measurements[0];
  const prev = measurements[1];

  const delta = (key: keyof Measurement) => {
    const a = latest?.[key] as number | undefined;
    const b = prev?.[key] as number | undefined;
    if (a == null || b == null) return null;
    return +(a - b).toFixed(1);
  };

  const statGrid = [
    { label: 'Day Streak',    value: stats.currentStreak,    unit: 'd',   color: 'accent-green' },
    { label: 'Workouts Done', value: stats.workoutsCompleted, unit: '',    color: 'text-gray-900' },
    { label: 'Meals Logged',  value: stats.totalMealsLogged,  unit: '',    color: 'text-gray-900' },
    { label: 'Active Days',   value: stats.activeDays,        unit: 'd',   color: 'accent-blue' },
  ];

  return (
    <div className="space-y-4 pb-6">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Your stats</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Progress</h1>
      </motion.div>

      {/* ── BIG STAT GRID ── */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {statGrid.map((s) => (
          <motion.div
            key={s.label}
            variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
          >
            <p className="label-cap mb-3">{s.label}</p>
            {loading ? (
              <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <div className={`stat-hero num ${s.color}`}>
                {s.value}
                {s.unit && <span className="text-2xl font-bold text-gray-300 ml-1">{s.unit}</span>}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ── TREND CHART ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <ProgressChart data={trendData} />
      </motion.div>

      {/* ── BODY MEASUREMENTS ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-gray-400" />
            <div>
              <p className="label-cap mb-0">Body Measurements</p>
              <h3 className="text-base font-black text-gray-900 leading-tight">Track your body</h3>
            </div>
          </div>
          <button
            onClick={() => setShowMeasureForm(!showMeasureForm)}
            className="flex items-center gap-1.5 px-3 py-2 bg-black text-[#00E676] rounded-xl text-xs font-black hover:bg-gray-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Log
          </button>
        </div>

        {/* Log form */}
        <AnimatePresence>
          {showMeasureForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="p-5 border-b border-gray-50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="label-cap mb-1.5">Weight (kg)</p>
                    <input type="number" step="0.1" placeholder="e.g. 75.5" value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <p className="label-cap mb-1.5">Body Fat (%)</p>
                    <input type="number" step="0.1" placeholder="e.g. 18.5" value={form.bodyFat}
                      onChange={e => setForm(f => ({ ...f, bodyFat: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <p className="label-cap mb-1.5">Waist (cm)</p>
                    <input type="number" step="0.5" placeholder="e.g. 82" value={form.waist}
                      onChange={e => setForm(f => ({ ...f, waist: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <p className="label-cap mb-1.5">Hips (cm)</p>
                    <input type="number" step="0.5" placeholder="e.g. 95" value={form.hips}
                      onChange={e => setForm(f => ({ ...f, hips: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <p className="label-cap mb-1.5">Chest (cm)</p>
                    <input type="number" step="0.5" placeholder="e.g. 100" value={form.chest}
                      onChange={e => setForm(f => ({ ...f, chest: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveMeasurement}
                  disabled={savingMeasure}
                  className="w-full py-3 bg-black text-[#00E676] rounded-xl text-sm font-black hover:bg-gray-900 transition-colors disabled:opacity-60"
                >
                  {savingMeasure ? 'Saving...' : 'Save Measurements'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Latest snapshot */}
        {latest ? (
          <div className="p-5">
            <p className="label-cap mb-3">Latest — {latest.date}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Weight', val: latest.weight, unit: 'kg', key: 'weight' as const },
                { label: 'Body Fat', val: latest.bodyFat, unit: '%', key: 'bodyFat' as const },
                { label: 'Waist', val: latest.waist, unit: 'cm', key: 'waist' as const },
                { label: 'Hips', val: latest.hips, unit: 'cm', key: 'hips' as const },
                { label: 'Chest', val: latest.chest, unit: 'cm', key: 'chest' as const },
              ].filter(m => m.val != null).map(m => {
                const d = delta(m.key);
                const isGood = m.key === 'weight' || m.key === 'waist' || m.key === 'hips' || m.key === 'bodyFat'
                  ? d !== null && d < 0
                  : d !== null && d > 0;
                return (
                  <div key={m.label} className="text-center bg-gray-50 rounded-xl p-3">
                    <p className="text-xl font-black text-gray-900 num">{m.val}<span className="text-xs text-gray-400 ml-0.5">{m.unit}</span></p>
                    <p className="label-cap mt-0.5">{m.label}</p>
                    {d !== null && d !== 0 && (
                      <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-bold ${isGood ? 'text-[#00E676]' : 'text-orange-500'}`}>
                        {d < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        {d > 0 ? '+' : ''}{d}{m.unit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* History */}
            {measurements.length > 1 && (
              <details className="mt-4">
                <summary className="flex items-center gap-1.5 text-xs font-bold text-gray-400 cursor-pointer list-none">
                  <ChevronDown className="w-3.5 h-3.5" /> History ({measurements.length - 1} more entries)
                </summary>
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                  {measurements.slice(1).map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                      <span className="text-gray-400 font-medium">{m.date}</span>
                      <div className="flex gap-3">
                        {m.weight && <span className="font-bold text-gray-700">{m.weight}kg</span>}
                        {m.bodyFat && <span className="font-bold text-gray-500">{m.bodyFat}% bf</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-black text-gray-400 mb-1">No measurements yet</p>
            <p className="text-xs text-gray-300">Tap Log to track your body stats</p>
          </div>
        )}
      </motion.div>

      {/* ── CURRENT PLANS ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-50">
          <p className="label-cap mb-0.5">Active programs</p>
          <h3 className="text-lg font-black text-gray-900">Current Plans</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-xl" />
              <div className="h-10 bg-gray-100 rounded-xl" />
            </div>
          ) : (
            <>
              {latestWorkout && (
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="label-cap mb-0.5">Workout</p>
                    <p className="font-black text-gray-900">{latestWorkout.name}</p>
                  </div>
                  <span className="text-xs font-bold bg-black text-[#00E676] px-3 py-1.5 rounded-full">
                    {latestWorkout.days?.length || 0}d / wk
                  </span>
                </div>
              )}
              {latestDiet && (
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="label-cap mb-0.5">Nutrition</p>
                    <p className="font-black text-gray-900">{latestDiet.name || 'Diet Plan'}</p>
                  </div>
                  <span className="text-xs font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full">
                    {latestDiet.dailyCalories} kcal
                  </span>
                </div>
              )}
              {!latestWorkout && !latestDiet && (
                <div className="p-5 text-center text-gray-400 text-sm">No active plans</div>
              )}
              <div className="flex p-5 pt-3 pb-4">
                <div className="flex-1 text-center border-r border-gray-100">
                  <p className="text-2xl font-black text-gray-900 num">{stats.workoutsCompleted}</p>
                  <p className="label-cap mt-0.5">workouts</p>
                </div>
                <div className="flex-1 text-center border-r border-gray-100">
                  <p className="text-2xl font-black text-gray-900 num">{stats.totalMealsLogged}</p>
                  <p className="label-cap mt-0.5">meals</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-2xl font-black text-gray-900 num">{stats.activeDays}</p>
                  <p className="label-cap mt-0.5">active days</p>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── CHECK-IN HISTORY ── */}
      {checkInHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <div>
                <p className="label-cap mb-0.5">History</p>
                <h3 className="text-lg font-black text-gray-900">Check-In Trends</h3>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {checkInHistory.map((req: any, i: number) => {
              const ci = req.checkIn;
              if (!ci) return null;
              const date = new Date(req.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-gray-500">{date}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${
                      req.status === 'generated' ? 'bg-green-100 text-green-700'
                        : req.status === 'dismissed' ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-100 text-blue-600'
                    }`}>{req.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {ci.currentWeight !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-black text-gray-900">{ci.currentWeight} kg</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-[#00E676]" />
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className={`w-2 h-2 rounded-sm ${n <= ci.energyLevel ? 'bg-[#00E676]' : 'bg-gray-100'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Moon className="w-3 h-3 text-blue-400" />
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className={`w-2 h-2 rounded-sm ${n <= ci.sleepQuality ? 'bg-blue-400' : 'bg-gray-100'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-[#FF6D00]" />
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className={`w-2 h-2 rounded-sm ${n <= ci.muscleSoreness ? 'bg-[#FF6D00]' : 'bg-gray-100'}`} />
                        ))}
                      </div>
                    </div>
                    {ci.dietAdherence !== undefined && (
                      <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                        <ClipboardList className="w-3 h-3 text-gray-400 shrink-0" />
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-black h-1.5 rounded-full" style={{ width: `${ci.dietAdherence}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-gray-500">{ci.dietAdherence}%</span>
                      </div>
                    )}
                  </div>
                  {ci.injuries && (
                    <p className="text-xs text-red-500 font-medium mt-1.5">⚠️ {ci.injuries}</p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
