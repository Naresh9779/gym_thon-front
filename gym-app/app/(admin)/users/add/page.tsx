'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import {
  UserIcon,
  AtSymbolIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CalendarIcon,
  ScaleIcon,
  ArrowsUpDownIcon,
  FlagIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

export default function AddUserPage() {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    weight: '',
    height: '',
    goal: 'muscle_gain',
    activityLevel: 'moderate',
    subscriptionDurationMonths: '1' // Default 1 month
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      // Map UI goal to backend allowed enums
      const goalMap: Record<string, string> = {
        muscle_gain: 'muscle_gain',
        weight_loss: 'weight_loss',
        endurance: 'endurance',
        strength: 'maintenance',
        general_fitness: 'maintenance',
      };
      const mappedGoal = goalMap[formData.goal] || 'maintenance';

      // Build payload for admin create API
      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        subscriptionDurationMonths: Number(formData.subscriptionDurationMonths),
        profile: {
          age: formData.age ? Number(formData.age) : undefined,
          weight: formData.weight ? Number(formData.weight) : undefined,
          height: formData.height ? Number(formData.height) : undefined,
          activityLevel: formData.activityLevel,
          goals: [mappedGoal],
        },
      };

      // Auth token from storage
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message || 'Failed to create user');
        return;
      }

      toast.success(`User ${formData.name} added successfully!`);
      // Redirect back to users list
      window.location.href = '/users';
    } catch (err: any) {
      console.error('Create user failed', err);
      setError('Failed to create user');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Add New User</h2>
        <p className="text-gray-600 mt-0.5">Create a new user account for a client</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader title="User Information" subtitle="Enter user details to create a new account" />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Credentials */}
            <div>
              <h3 className="text-base font-semibold mb-3">Account Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <AtSymbolIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                      className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-16 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Physical Information */}
            <div>
              <h3 className="text-base font-semibold mb-3">Physical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <div className="relative">
                    <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <div className="relative">
                    <ScaleIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      min="1"
                      step="0.1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <div className="relative">
                    <ArrowsUpDownIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fitness Goals */}
            <div>
              <h3 className="text-base font-semibold mb-3">Fitness Goals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <FlagIcon className="w-4 h-4 mr-1 text-green-600" />
                    Primary Goal
                  </label>
                  <select
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  >
                    <option value="muscle_gain">💪 Muscle Gain</option>
                    <option value="weight_loss">🔥 Weight Loss</option>
                    <option value="strength">⚡ Strength</option>
                    <option value="endurance">🏃 Endurance</option>
                    <option value="general_fitness">✨ General Fitness</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <BoltIcon className="w-4 h-4 mr-1 text-green-600" />
                    Activity Level
                  </label>
                  <select
                    value={formData.activityLevel}
                    onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  >
                    <option value="sedentary">🪑 Sedentary</option>
                    <option value="light">🚶 Light</option>
                    <option value="moderate">🏃 Moderate</option>
                    <option value="active">🏋️ Active</option>
                    <option value="very_active">🔥 Very Active</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Subscription Settings */}
            <div>
              <h3 className="text-base font-semibold mb-3">Subscription Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Duration (months) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.subscriptionDurationMonths}
                    onChange={(e) => setFormData({ ...formData, subscriptionDurationMonths: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    min="1"
                    max="60"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Subscription will be active for {formData.subscriptionDurationMonths} month(s) from creation
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 focus:ring-4 focus:ring-green-300 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Create User
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
