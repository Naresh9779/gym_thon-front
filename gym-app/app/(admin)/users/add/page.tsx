'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Loader2, Check, Dumbbell, Salad, CalendarOff, TrendingUp, Phone, IndianRupee, Info } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';

interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  durationDays: number;
  features: {
    aiWorkoutPlan: boolean;
    aiDietPlan: boolean;
    leaveRequests: boolean;
    progressTracking: boolean;
  };
  color: string;
  isActive: boolean;
}

const inputCls = (err?: boolean) =>
  `w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none transition-all text-sm font-medium bg-white ${
    err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'
  }`;

const Req = () => <span className="text-red-400 ml-0.5">*</span>;

export default function AddUserPage() {
  const router = useRouter();
  const toast = useToast();
  const { getAccessToken } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const [paymentReceived, setPaymentReceived] = useState(true);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    mobile: '',
    age: '', weight: '', height: '',
    gender: '',
    goal: 'muscle_gain',
    activityLevel: 'moderate',
    experienceLevel: 'beginner',
    isVegetarian: false,
    weeklyBudget: '',
    dietType: 'balanced',
  });

  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    (async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`${base}/api/admin/subscription-plans`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (j.ok) {
          const active = (j.data.plans || []).filter((p: SubscriptionPlan) => p.isActive);
          setPlans(active);
          if (active.length > 0) setSelectedPlanId(active[0]._id);
        }
      } catch { /* ignore */ }
    })();
  }, [base, getAccessToken]);

  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Full name is required (min 2 chars)';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';

    const age = Number(form.age);
    if (!form.age) e.age = 'Age is required';
    else if (age < 10 || age > 100) e.age = 'Age must be between 10 and 100';

    const weight = Number(form.weight);
    if (!form.weight) e.weight = 'Weight is required';
    else if (weight < 20 || weight > 300) e.weight = 'Weight must be between 20–300 kg';

    const height = Number(form.height);
    if (!form.height) e.height = 'Height is required';
    else if (height < 100 || height > 250) e.height = 'Height must be between 100–250 cm';

    if (!form.gender) e.gender = 'Gender is required';
    if (!selectedPlanId) e.plan = 'Please select a subscription plan';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const goalMap: Record<string, string> = {
        muscle_gain: 'muscle_gain', weight_loss: 'weight_loss',
        endurance: 'endurance', strength: 'maintenance', general_fitness: 'maintenance',
      };
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          ...(form.mobile.trim() ? { mobile: form.mobile.trim() } : {}),
          paymentReceived,
          planId: selectedPlanId,
          profile: {
            age: Number(form.age),
            weight: Number(form.weight),
            height: Number(form.height),
            gender: form.gender,
            activityLevel: form.activityLevel,
            goals: [goalMap[form.goal] || 'maintenance'],
            experienceLevel: form.experienceLevel,
            dietPreferences: {
              isVegetarian: form.isVegetarian,
              dietType: form.dietType,
              weeklyBudget: form.weeklyBudget ? Number(form.weeklyBudget) : undefined,
            },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrors({ _form: json?.error?.message || 'Failed to create user' });
        return;
      }
      toast.success(`User ${form.name} created!`);
      router.push('/users');
    } catch {
      setErrors({ _form: 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  };

  const section = (title: string, sub: string, children: React.ReactNode) => (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-50">
        <h2 className="font-black text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const fieldErr = (k: string) => errors[k]
    ? <p className="text-xs text-red-500 font-semibold mt-1">{errors[k]}</p>
    : null;

  return (
    <div className="space-y-5 max-w-3xl w-full">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Add Member</h1>
        <p className="text-xs text-gray-400 mt-1">All fields marked <span className="text-red-400">*</span> are required</p>
      </motion.div>

      {errors._form && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600">
          {errors._form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* Account */}
        {section('Account Credentials', 'Login details for the new member', (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-cap block mb-2">Full Name <Req /></label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                className={inputCls(!!errors.name)} placeholder="John Doe" />
              {fieldErr('name')}
            </div>
            <div>
              <label className="label-cap block mb-2">Email <Req /></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className={inputCls(!!errors.email)} placeholder="john@example.com" />
              {fieldErr('email')}
            </div>
            <div className="relative">
              <label className="label-cap block mb-2">Password <Req /></label>
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)}
                className={`${inputCls(!!errors.password)} pr-10`} placeholder="Min. 6 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {fieldErr('password')}
            </div>
            <div>
              <label className="label-cap block mb-2">Confirm Password <Req /></label>
              <input type={showPw ? 'text' : 'password'} value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                className={inputCls(!!errors.confirmPassword)} placeholder="Repeat password" />
              {fieldErr('confirmPassword')}
            </div>
            <div className="sm:col-span-2">
              <label className="label-cap block mb-2">
                <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />Mobile Number</span>
                <span className="text-gray-400 normal-case font-medium ml-1">(optional)</span>
              </label>
              <input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)}
                className={inputCls()} placeholder="e.g. 9876543210" maxLength={15} />
            </div>
          </div>
        ))}

        {/* Physical */}
        {section('Physical Info', 'Used for AI plan generation', (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { key: 'age' as const,    label: 'Age',    unit: 'yrs', placeholder: '25', min: 10,  max: 100 },
              { key: 'weight' as const, label: 'Weight', unit: 'kg',  placeholder: '75', min: 20,  max: 300 },
              { key: 'height' as const, label: 'Height', unit: 'cm',  placeholder: '175', min: 100, max: 250 },
            ]).map(({ key, label, unit, placeholder, min, max }) => (
              <div key={key}>
                <label className="label-cap block mb-2">{label} <span className="text-gray-400 normal-case font-medium">({unit})</span> <Req /></label>
                <input type="number" value={form[key]} onChange={e => set(key, e.target.value)}
                  className={inputCls(!!errors[key])} placeholder={placeholder} min={min} max={max} />
                {fieldErr(key)}
              </div>
            ))}
          </div>
        ))}

        {/* Goals & Activity */}
        {section('Fitness Profile', 'Sets the baseline for AI plan generation', (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-cap block mb-2">Gender <Req /></label>
              <CustomSelect
                value={form.gender}
                onChange={v => set('gender', v)}
                options={[
                  { value: '',       label: 'Select gender' },
                  { value: 'male',   label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other',  label: 'Other' },
                ]}
              />
              {fieldErr('gender')}
            </div>
            <div>
              <label className="label-cap block mb-2">Primary Goal <Req /></label>
              <CustomSelect
                value={form.goal}
                onChange={v => set('goal', v)}
                options={[
                  { value: 'muscle_gain',     label: 'Muscle Gain' },
                  { value: 'weight_loss',     label: 'Weight Loss' },
                  { value: 'strength',        label: 'Strength' },
                  { value: 'endurance',       label: 'Endurance' },
                  { value: 'general_fitness', label: 'General Fitness' },
                ]}
              />
            </div>
            <div>
              <label className="label-cap block mb-2">Activity Level <Req /></label>
              <CustomSelect
                value={form.activityLevel}
                onChange={v => set('activityLevel', v)}
                options={[
                  { value: 'sedentary',   label: 'Sedentary' },
                  { value: 'light',       label: 'Light' },
                  { value: 'moderate',    label: 'Moderate' },
                  { value: 'active',      label: 'Active' },
                  { value: 'very_active', label: 'Very Active' },
                ]}
              />
            </div>
            <div>
              <label className="label-cap block mb-2">Experience Level <Req /></label>
              <CustomSelect
                value={form.experienceLevel}
                onChange={v => set('experienceLevel', v)}
                options={[
                  { value: 'beginner',     label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced',     label: 'Advanced' },
                ]}
              />
            </div>
          </div>
        ))}

        {/* Diet Preferences */}
        {section('Diet Preferences', 'Used to personalise nutrition plans', (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label-cap block mb-2">Diet Type <Req /></label>
                <CustomSelect
                  value={form.dietType}
                  onChange={v => set('dietType', v)}
                  options={[
                    { value: 'balanced',      label: 'Balanced' },
                    { value: 'high_protein',  label: 'High Protein' },
                    { value: 'low_carb',      label: 'Low Carb' },
                    { value: 'mediterranean', label: 'Mediterranean' },
                  ]}
                />
              </div>
              <div>
                <label className="label-cap block mb-2">Weekly Budget <span className="text-gray-400 normal-case font-medium">(optional)</span></label>
                <input type="number" value={form.weeklyBudget} onChange={e => set('weeklyBudget', e.target.value)}
                  className={inputCls()} placeholder="e.g. 100" min="0" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set('isVegetarian', !form.isVegetarian)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.isVegetarian ? 'bg-black' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isVegetarian ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-bold text-gray-700">Vegetarian</span>
              {form.isVegetarian && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00E676]/10 text-[#00E676]">On</span>}
            </div>
          </div>
        ))}

        {/* Subscription */}
        {section('Subscription Plan', 'Select the membership tier for this member', (
          <div className="space-y-3">
            {plans.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                No active plans found.{' '}
                <a href="/subscriptions" className="font-bold text-gray-600 hover:underline">
                  Create a plan first →
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {plans.map(plan => {
                  const isSelected = selectedPlanId === plan._id;
                  const durationLabel = plan.durationDays % 30 === 0
                    ? `${plan.durationDays / 30} month${plan.durationDays / 30 !== 1 ? 's' : ''}`
                    : `${plan.durationDays} days`;
                  return (
                    <button
                      key={plan._id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan._id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: plan.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-gray-900">{plan.name}</span>
                          <span className="text-sm font-black text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{durationLabel}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {plan.features.aiWorkoutPlan && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black text-[#00E676]"><Dumbbell className="w-2.5 h-2.5" />AI Workout</span>}
                          {plan.features.aiDietPlan    && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600"><Salad className="w-2.5 h-2.5" />AI Diet</span>}
                          {plan.features.leaveRequests && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600"><CalendarOff className="w-2.5 h-2.5" />Leave</span>}
                          {plan.features.progressTracking && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600"><TrendingUp className="w-2.5 h-2.5" />Progress</span>}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#00E676]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.plan && <p className="text-xs text-red-500 font-semibold">{errors.plan}</p>}

            {/* Payment received toggle */}
            {selectedPlanId && (() => {
              const plan = plans.find(p => p._id === selectedPlanId);
              return plan ? (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-black text-gray-900">Payment Received</p>
                        <p className="text-xs text-gray-400">₹{plan.price.toLocaleString('en-IN')} — mark as received or pending</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentReceived(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${paymentReceived ? 'bg-black' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${paymentReceived ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {!paymentReceived && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 font-semibold">
                      Payment will be marked as <strong>pending</strong>. You can record it later from the Payments page.
                    </p>
                  )}
                  {(plan.features.aiWorkoutPlan || plan.features.aiDietPlan) && (
                    <div className="flex items-start gap-2 bg-[#00E676]/5 border border-[#00E676]/20 rounded-xl px-3 py-2.5">
                      <Info className="w-4 h-4 text-[#00E676] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600">
                        A plan generation request will be <strong>automatically created</strong> for{' '}
                        {[plan.features.aiWorkoutPlan && 'AI Workout', plan.features.aiDietPlan && 'AI Diet'].filter(Boolean).join(' + ')}.
                        It will appear in <strong>Requests</strong> for you to generate.
                      </p>
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        ))}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-end pb-6">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Member'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
