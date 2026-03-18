'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Dumbbell, Salad, X, StickyNote, Plus, Trash2, BarChart3, TrendingUp, Scale, Activity, Zap, Moon, ClipboardList, CalendarOff, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import OverrideModal, { OverrideFormData } from '@/components/admin/OverrideModal';
import SubscriptionModal from '@/components/admin/SubscriptionModal';

interface Props {
  params: Promise<{ id: string }>;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  profile: {
    age?: number;
    weight?: number;
    height?: number;
    bodyFat?: number;
    gender?: string;
    goals?: string[];
    activityLevel?: string;
    experienceLevel?: string;
    preferences?: string[];
    restrictions?: string[];
    timezone?: string;
    dietPreferences?: {
      isVegetarian?: boolean;
      dietType?: string;
      weeklyBudget?: number;
    };
  };
  subscription?: {
    plan: string;
    status: string;
    startDate?: string;
    endDate?: string;
    durationMonths?: number;
  };
  assignedTrainerId?: string | null;
}

interface WorkoutPlan {
  _id: string;
  name: string;
  startDate: string;
  duration: number;
  days: any[];
  checkIn?: {
    currentWeight?: number;
    energyLevel?: number;
    sleepQuality?: number;
    muscleSoreness?: number;
    dietAdherence?: number;
    injuries?: string;
    notes?: string;
  };
}

interface DietPlan {
  _id: string;
  name: string;
  date?: string;
  weekStartDate?: string;
  weekEndDate?: string;
  dailyCalories?: number;
  avgDailyCalories?: number;
  meals?: any[];
  days?: any[];
  checkIn?: {
    currentWeight?: number;
    energyLevel?: number;
    sleepQuality?: number;
    muscleSoreness?: number;
    dietAdherence?: number;
    injuries?: string;
    notes?: string;
  };
}

const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none transition-all text-sm font-medium bg-white";

export default function AdminUserDetail({ params }: Props) {
  const { id } = use(params);
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [trainers, setTrainers] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [assigningTrainer, setAssigningTrainer] = useState(false);

  // stats form
  const [statsForm, setStatsForm] = useState({
    age: '', weight: '', height: '',
    gender: '', activityLevel: '', experienceLevel: '',
    goals: [] as string[],
    isVegetarian: false, dietType: '',
  });
  const [savingStats, setSavingStats] = useState(false);

  // trainer notes
  const [notes, setNotes] = useState<{ _id: string; text: string; createdAt: string }[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // progress summary
  const [progressSummary, setProgressSummary] = useState<{ workoutsCompleted: number; totalMealsLogged: number; activeDays: number; latestMeasurement: any } | null>(null);

  // leave requests
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const token = getAccessToken();
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userJson = await userRes.json();
        if (userJson.ok) {
          const foundUser = userJson.data.users.find((u: any) => u._id === id);
          if (foundUser) {
            setUser(foundUser);
            setStatsForm({
              age: foundUser.profile?.age ? String(foundUser.profile.age) : '',
              weight: foundUser.profile?.weight ? String(foundUser.profile.weight) : '',
              height: foundUser.profile?.height ? String(foundUser.profile.height) : '',
              gender: foundUser.profile?.gender || '',
              activityLevel: foundUser.profile?.activityLevel || '',
              experienceLevel: foundUser.profile?.experienceLevel || '',
              goals: foundUser.profile?.goals || [],
              isVegetarian: foundUser.profile?.dietPreferences?.isVegetarian || false,
              dietType: foundUser.profile?.dietPreferences?.dietType || '',
            });
          }
        }

        const workoutRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/workouts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const workoutJson = await workoutRes.json();
        if (workoutJson.ok) setWorkoutPlans(workoutJson.data.workoutPlans || []);

        const dietRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/diet`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dietJson = await dietRes.json();
        if (dietJson.ok) setDietPlans(dietJson.data.dietPlans || []);

        const notesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/notes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const notesJson = await notesRes.json();
        if (notesJson.ok) setNotes(notesJson.data.notes || []);

        const progressRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/progress-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const progressJson = await progressRes.json();
        if (progressJson.ok) setProgressSummary(progressJson.data);

        // Load trainers list for assignment dropdown
        const trainersRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/trainers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const trainersJson = await trainersRes.json();
        if (trainersJson.ok) setTrainers(trainersJson.data.trainers || []);

        // Load user's leave requests
        const leaveRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/leave/admin/user/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const leaveJson = await leaveRes.json();
        if (leaveJson.ok) setLeaveRequests(leaveJson.data.requests || []);


        setLoading(false);
      } catch {
        setError('Failed to load user data');
        setLoading(false);
      }
    }
    fetchUserData();
  }, [id, getAccessToken]);

  const handleStatsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStats(true);
    try {
      const token = getAccessToken();
      const stats: any = {};
      if (statsForm.age) stats.age = Number(statsForm.age);
      if (statsForm.weight) stats.weight = Number(statsForm.weight);
      if (statsForm.height) stats.height = Number(statsForm.height);
      if (statsForm.gender) stats.gender = statsForm.gender;
      if (statsForm.activityLevel) stats.activityLevel = statsForm.activityLevel;
      if (statsForm.experienceLevel) stats.experienceLevel = statsForm.experienceLevel;
      if (statsForm.goals.length > 0) stats.goals = statsForm.goals;
      stats.dietPreferences = {
        isVegetarian: statsForm.isVegetarian,
        ...(statsForm.dietType ? { dietType: statsForm.dietType } : {}),
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(stats)
      });
      const json = await res.json();
      if (json.ok) {
        toast.success('Profile updated!');
        if (user) setUser({
          ...user,
          profile: {
            ...user.profile,
            ...stats,
            dietPreferences: stats.dietPreferences,
          }
        });
      } else {
        toast.error(json.error?.message || 'Failed to update');
      }
    } catch { toast.error('Failed to update profile'); }
    finally { setSavingStats(false); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNote.trim() })
      });
      const json = await res.json();
      if (json.ok) { setNotes(json.data.notes || []); setNewNote(''); toast.success('Note added'); }
      else toast.error(json.error?.message || 'Failed');
    } catch { toast.error('Failed to add note'); }
    finally { setSavingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/notes/${noteId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.ok) setNotes(json.data.notes || []);
      else toast.error('Failed to delete note');
    } catch { toast.error('Failed to delete note'); }
  };

  const handleSubscriptionUpdate = async (changes: Record<string, any>) => {
    setSubscriptionSaving(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/subscription`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success('Subscription updated!');
        setShowSubscriptionModal(false);
        if (json.data?.user) setUser(json.data.user);
      } else {
        toast.error(json.error?.message || 'Failed to update');
      }
    } catch { toast.error('Failed to update subscription'); }
    finally { setSubscriptionSaving(false); }
  };

  const handleAssignTrainer = async (trainerId: string | null) => {
    setAssigningTrainer(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/trainer`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId }),
      });
      const json = await res.json();
      if (json.ok) {
        setUser((u: any) => u ? { ...u, assignedTrainerId: trainerId } : u);
        toast.success(trainerId ? 'Trainer assigned!' : 'Trainer removed');
      } else toast.error(json.error?.message || 'Failed');
    } catch { toast.error('Failed to assign trainer'); }
    finally { setAssigningTrainer(false); }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`${user?.name} and all their data deleted`);
        router.push('/users');
      } else {
        toast.error(json.error?.message || 'Failed to delete user');
      }
    } catch { toast.error('Failed to delete user'); }
    finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideGenerating, setOverrideGenerating] = useState(false);

  const handleOverrideConfirm = async (data: OverrideFormData) => {
    setOverrideGenerating(true);
    try {
      const token = getAccessToken();
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      const today = new Date().toISOString().slice(0, 10);

      if (data.planType === 'workout') {
        const res = await fetch(`${base}/api/admin/users/${id}/generate-workout-cycle`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: today,
            durationWeeks: data.durationWeeks ?? 4,
            daysPerWeek: data.daysPerWeek,
            exercisesPerDay: data.exercisesPerDay,
            adminNote: data.adminNote,
            additionalContext: data.additionalContext,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error?.message || 'Failed');
        toast.success('Workout plan generated!');
        if (json.data?.workoutPlan) setWorkoutPlans(p => [json.data.workoutPlan, ...p]);
      } else {
        const res = await fetch(`${base}/api/admin/users/${id}/generate-diet-weekly`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminNote: data.adminNote,
            additionalContext: data.additionalContext,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error?.message || 'Failed');
        toast.success('Diet plan generated!');
        if (json.data?.dietPlan) setDietPlans(p => [json.data.dietPlan, ...p]);
      }
      setOverrideOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate plan');
    } finally {
      setOverrideGenerating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !user) return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-semibold text-red-600">
      {error || 'User not found'}
    </div>
  );

  return (
    <div className="space-y-5">
      <OverrideModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        onConfirm={handleOverrideConfirm}
        generating={overrideGenerating}
        userName={user.name}
      />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/users" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Users
        </Link>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.name}</h1>
      </motion.div>

      {/* Progress summary row */}
      {progressSummary && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h2 className="font-black text-gray-900">Last 30 Days Activity</h2>
            </div>
            <Link href={`/users/${id}/reports`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-[#00E676] rounded-xl text-xs font-black hover:bg-gray-900 transition-colors">
              <BarChart3 className="w-3 h-3" /> Reports
            </Link>
          </div>
          <div className="grid grid-cols-4 divide-x divide-gray-50">
            {[
              { label: 'Workouts', val: progressSummary.workoutsCompleted, accent: 'text-[#00E676]' },
              { label: 'Meals Logged', val: progressSummary.totalMealsLogged, accent: 'text-[#FF6D00]' },
              { label: 'Active Days', val: progressSummary.activeDays, accent: 'text-blue-500' },
              { label: 'Weight', val: progressSummary.latestMeasurement?.weight ? `${progressSummary.latestMeasurement.weight}kg` : '—', accent: 'text-gray-700' },
            ].map(({ label, val, accent }) => (
              <div key={label} className="p-4 text-center">
                <p className={`text-2xl font-black num ${accent}`}>{val}</p>
                <p className="label-cap mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {progressSummary.latestMeasurement && (
            <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-t border-gray-50 text-xs font-medium text-gray-500">
              <Scale className="w-3.5 h-3.5 text-gray-400" />
              {[
                progressSummary.latestMeasurement.bodyFat && `${progressSummary.latestMeasurement.bodyFat}% body fat`,
                progressSummary.latestMeasurement.waist && `${progressSummary.latestMeasurement.waist}cm waist`,
                progressSummary.latestMeasurement.chest && `${progressSummary.latestMeasurement.chest}cm chest`,
              ].filter(Boolean).join(' · ') || 'No body measurements logged yet'}
            </div>
          )}
        </motion.div>
      )}

      {/* Latest Check-In */}
      {(() => {
        const latestCheckIn =
          workoutPlans.find((p) => p.checkIn)?.checkIn ||
          dietPlans.find((p) => p.checkIn)?.checkIn;

        if (!latestCheckIn) return null;

        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-50">
              <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h2 className="font-black text-gray-900">Latest Check-In</h2>
                <p className="text-xs text-gray-400">From most recent plan generation</p>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {latestCheckIn.currentWeight && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="label-cap">Weight</p>
                      <p className="font-black text-gray-900 text-sm">{latestCheckIn.currentWeight} kg</p>
                    </div>
                  </div>
                )}
                {latestCheckIn.energyLevel !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#00E676] shrink-0" />
                    <div>
                      <p className="label-cap">Energy</p>
                      <p className="font-black text-gray-900 text-sm">{latestCheckIn.energyLevel}/5</p>
                    </div>
                  </div>
                )}
                {latestCheckIn.sleepQuality !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                    <Moon className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="label-cap">Sleep</p>
                      <p className="font-black text-gray-900 text-sm">{latestCheckIn.sleepQuality}/5</p>
                    </div>
                  </div>
                )}
                {latestCheckIn.muscleSoreness !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#FF6D00] shrink-0" />
                    <div>
                      <p className="label-cap">Soreness</p>
                      <p className="font-black text-gray-900 text-sm">{latestCheckIn.muscleSoreness}/5</p>
                    </div>
                  </div>
                )}
                {latestCheckIn.dietAdherence !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="label-cap">Diet Adherence</p>
                      <p className="font-black text-gray-900 text-sm">{latestCheckIn.dietAdherence}%</p>
                    </div>
                  </div>
                )}
              </div>
              {latestCheckIn.injuries && (
                <div className="mt-3 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-0.5">Injuries / Limitations</p>
                  <p className="text-sm text-red-700">{latestCheckIn.injuries}</p>
                </div>
              )}
              {latestCheckIn.notes && (
                <div className="mt-2 px-3 py-2 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Notes</p>
                  <p className="text-sm text-gray-700">{latestCheckIn.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Identity card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-[#00E676] text-lg font-black shrink-0">
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">{user.name}</p>
                <p className="text-sm text-gray-400 truncate">{user.email}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                  user.role === 'admin' ? 'bg-black text-[#00E676]' : 'bg-gray-100 text-gray-600'
                }`}>{user.role}</span>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <h2 className="font-black text-gray-900">Subscription</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                user.subscription?.status === 'active' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-red-50 text-red-500'
              }`}>{user.subscription?.status || 'active'}</span>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                { label: 'Plan', val: user.subscription?.plan || 'Free' },
                ...(user.subscription?.startDate ? [{ label: 'Start', val: new Date(user.subscription.startDate).toLocaleDateString() }] : []),
                ...(user.subscription?.endDate ? [{ label: 'End', val: new Date(user.subscription.endDate).toLocaleDateString() }] : []),
                ...(user.subscription?.durationMonths ? [{ label: 'Duration', val: `${user.subscription.durationMonths} months` }] : []),
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 font-medium">{label}</span>
                  <span className="font-bold text-gray-900 capitalize">{val}</span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full py-2.5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 transition-colors"
              >
                Manage Subscription
              </button>
            </div>
          </div>

          {/* Trainer Assignment */}
          {trainers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50">
                <h2 className="font-black text-gray-900">Assigned Trainer</h2>
              </div>
              <div className="p-4">
                <select
                  value={user.assignedTrainerId || ''}
                  onChange={e => handleAssignTrainer(e.target.value || null)}
                  disabled={assigningTrainer}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-gray-900 focus:outline-none transition-all disabled:opacity-60"
                >
                  <option value="">— No trainer assigned —</option>
                  {trainers.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                  ))}
                </select>
                {assigningTrainer && (
                  <p className="text-xs text-gray-400 mt-2 font-medium">Saving…</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — Profile */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h2 className="font-black text-gray-900">Fitness Profile</h2>
              <p className="text-xs text-gray-400 mt-0.5">Used for AI plan generation</p>
            </div>
            <form onSubmit={handleStatsUpdate} className="p-5 space-y-5">
              {/* Body stats */}
              <div>
                <p className="label-cap mb-2">Body Measurements</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'age' as const, label: 'Age (yrs)', placeholder: '25' },
                    { key: 'weight' as const, label: 'Weight (kg)', placeholder: '75' },
                    { key: 'height' as const, label: 'Height (cm)', placeholder: '175' },
                  ]).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="label-cap block mb-1.5">{label}</label>
                      <input
                        type="number"
                        value={statsForm[key]}
                        onChange={e => setStatsForm(f => ({ ...f, [key]: e.target.value }))}
                        className={inputCls}
                        placeholder={placeholder}
                        min="1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Gender + Experience */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-cap block mb-1.5">Gender</label>
                  <select
                    value={statsForm.gender}
                    onChange={e => setStatsForm(f => ({ ...f, gender: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— Select —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label-cap block mb-1.5">Experience Level</label>
                  <select
                    value={statsForm.experienceLevel}
                    onChange={e => setStatsForm(f => ({ ...f, experienceLevel: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— Select —</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="label-cap block mb-1.5">Activity Level</label>
                <select
                  value={statsForm.activityLevel}
                  onChange={e => setStatsForm(f => ({ ...f, activityLevel: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">— Select —</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="very_active">Very Active</option>
                </select>
              </div>

              {/* Goals */}
              <div>
                <label className="label-cap block mb-2">Goals</label>
                <div className="flex flex-wrap gap-2">
                  {(['weight_loss', 'muscle_gain', 'maintenance', 'endurance'] as const).map(g => {
                    const label = { weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', maintenance: 'Maintenance', endurance: 'Endurance' }[g];
                    const active = statsForm.goals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setStatsForm(f => ({
                          ...f,
                          goals: active ? f.goals.filter(x => x !== g) : [...f.goals, g],
                        }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 ${
                          active ? 'bg-black text-[#00E676] border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Diet Preferences */}
              <div>
                <label className="label-cap block mb-2">Diet Preferences</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-cap block mb-1.5">Diet Type</label>
                    <select
                      value={statsForm.dietType}
                      onChange={e => setStatsForm(f => ({ ...f, dietType: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">— Select —</option>
                      <option value="balanced">Balanced</option>
                      <option value="high_protein">High Protein</option>
                      <option value="low_carb">Low Carb</option>
                      <option value="mediterranean">Mediterranean</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 border-2 border-gray-200 rounded-xl">
                    <input
                      type="checkbox"
                      id="isVeg"
                      checked={statsForm.isVegetarian}
                      onChange={e => setStatsForm(f => ({ ...f, isVegetarian: e.target.checked }))}
                      className="w-4 h-4 accent-black"
                    />
                    <label htmlFor="isVeg" className="text-sm font-bold text-gray-700 cursor-pointer">Vegetarian</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={savingStats}
                  className="px-6 py-2.5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {savingStats ? 'Saving...' : 'Save Profile'}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Workout Plans */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00E676]/10 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-[#00E676]" />
            </div>
            <div>
              <h2 className="font-black text-gray-900">Workout Plans</h2>
              <p className="text-xs text-gray-400">{workoutPlans.length} plan{workoutPlans.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setOverrideOpen(true)}
            className="px-3 py-2 rounded-xl bg-black text-[#00E676] text-xs font-black hover:bg-gray-900 transition-colors"
          >
            + Generate
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {workoutPlans.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No workout plans yet</p>
          ) : workoutPlans.map(plan => (
            <div key={plan._id} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="font-bold text-gray-900 text-sm">{plan.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(plan.startDate).toLocaleDateString()} · {plan.duration || 0}w · {plan.days?.length || 0} days
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/workouts/${plan._id}/edit`} className="px-3 py-1.5 rounded-lg border-2 border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  Edit
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${plan.name}"?`)) return;
                    const token = getAccessToken();
                    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/workouts/${plan._id}`, {
                      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
                    });
                    const j = await resp.json();
                    if (j.ok) { toast.success('Deleted'); setWorkoutPlans(p => p.filter(x => x._id !== plan._id)); }
                    else toast.error(j.error?.message || 'Failed');
                  }}
                  className="px-3 py-1.5 rounded-lg border-2 border-red-100 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diet Plans */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF6D00]/10 rounded-xl flex items-center justify-center">
              <Salad className="w-4 h-4 text-[#FF6D00]" />
            </div>
            <div>
              <h2 className="font-black text-gray-900">Diet Plans</h2>
              <p className="text-xs text-gray-400">{dietPlans.length} plan{dietPlans.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setOverrideOpen(true)}
            className="px-3 py-2 rounded-xl bg-black text-[#FF6D00]/80 text-xs font-black hover:bg-gray-900 transition-colors"
          >
            + Generate
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {dietPlans.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No diet plans yet</p>
          ) : dietPlans.map(plan => (
            <div key={plan._id} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="font-bold text-gray-900 text-sm">{plan.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {plan.weekStartDate
                    ? `Week of ${new Date(plan.weekStartDate).toLocaleDateString()} · ${plan.avgDailyCalories || plan.dailyCalories || 0} kcal/day · ${plan.days?.length || 0} days`
                    : `${plan.date ? new Date(plan.date).toLocaleDateString() : '—'} · ${plan.dailyCalories || plan.avgDailyCalories || 0} kcal · ${plan.meals?.length || 0} meals`
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/diet/${plan._id}/edit`} className="px-3 py-1.5 rounded-lg border-2 border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  Edit
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${plan.name}"?`)) return;
                    const token = getAccessToken();
                    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/diet/${plan._id}`, {
                      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
                    });
                    const j = await resp.json();
                    if (j.ok) { toast.success('Deleted'); setDietPlans(p => p.filter(x => x._id !== plan._id)); }
                    else toast.error(j.error?.message || 'Failed');
                  }}
                  className="px-3 py-1.5 rounded-lg border-2 border-red-100 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave History */}
      {leaveRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-gray-50">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
              <CalendarOff className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="font-black text-gray-900">Leave History</h2>
              <p className="text-xs text-gray-400">{leaveRequests.length} request{leaveRequests.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {leaveRequests.map(req => {
              const statusIcon = {
                pending: <Clock className="w-3.5 h-3.5 text-amber-400" />,
                approved: <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676]" />,
                rejected: <XCircle className="w-3.5 h-3.5 text-red-400" />,
                cancelled: <CalendarOff className="w-3.5 h-3.5 text-gray-300" />,
              }[req.status as string];
              const approvedDates = req.dates.filter((d: string) => !req.forcedDates.includes(d));
              return (
                <div key={req._id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 shrink-0">{statusIcon}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{req.reason}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {req.dates.length} day{req.dates.length !== 1 ? 's' : ''}
                          {req.status === 'approved' && req.forcedDates.length > 0 && ` · ${req.forcedDates.length} attended`}
                          {req.status === 'approved' && approvedDates.length > 0 && ` · ${approvedDates.length} extended`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      req.status === 'approved' ? 'bg-green-50 text-green-700' :
                      req.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      req.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                    }`}>{req.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {req.dates.map((d: string) => (
                      <span key={d} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        req.forcedDates.includes(d) ? 'bg-blue-50 text-blue-500 line-through' : 'bg-amber-50 text-amber-600'
                      }`}>{d}</span>
                    ))}
                  </div>
                  {req.adminNote && (
                    <p className="text-xs text-gray-400 italic mt-1.5">"{req.adminNote}"</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trainer Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-50">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
            <StickyNote className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="font-black text-gray-900">Trainer Notes</h2>
            <p className="text-xs text-gray-400">Internal notes — not visible to the member</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {/* Add note */}
          <div className="flex gap-2">
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note about this member…"
              rows={2}
              className={`${inputCls} resize-none flex-1`}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddNote}
              disabled={savingNote || !newNote.trim()}
              className="px-3 py-2 bg-black text-[#00E676] rounded-xl text-xs font-black hover:bg-gray-900 disabled:opacity-40 transition-colors self-start mt-0.5"
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
          {/* Notes list */}
          {notes.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-4">No notes yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...notes].reverse().map(note => (
                <div key={note._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{note.text}</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">
                      {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DELETE USER ── */}
      <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-black text-red-500">Delete Member</p>
            <p className="text-xs text-gray-400 mt-0.5">Permanently removes this member and all their data</p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-black hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Member
          </button>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900">Delete {user.name}?</h3>
                <p className="text-xs text-gray-400 mt-0.5">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 bg-red-50 rounded-xl px-3 py-2.5">
              All workout plans, diet plans, progress logs, reports, plan requests, and leave requests will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SubscriptionModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSave={handleSubscriptionUpdate}
        saving={subscriptionSaving}
        subscription={user.subscription}
        userName={user.name}
      />
    </div>
  );
}
