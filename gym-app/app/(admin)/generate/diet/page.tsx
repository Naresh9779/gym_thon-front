'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserGroupIcon, CurrencyRupeeIcon, HeartIcon, SparklesIcon, FireIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';

interface AdminUserItem {
  _id: string;
  name: string;
  email: string;
  role?: string;
  profile?: {
    age?: number;
    weight?: number;
    height?: number;
    activityLevel?: string;
    goals?: string[];
  };
}

export default function AdminGenerateDiet() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState({
    goal: 'muscle_gain',
    activityLevel: 'moderate',
    dietType: 'balanced',
    isVegetarian: false,
    budget: '',
    preferences: '',
  });

  const { accessToken } = useAuth();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = accessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.ok) setUsers(json.data.users || []);
      } catch (e) {
        console.error('Failed to load users for generation', e);
      }
    }
    fetchUsers();
  }, [accessToken]);

  const selectedUser = users.find(u => u._id === selectedUserId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }
    try {
      const token = accessToken();
      // Generate diet plan for today for the selected user
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${selectedUserId}/generate-diet-daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message || `Failed with status ${res.status}`);
      }
      alert(`🎉 Diet plan ${json.data?.alreadyExists ? 'already exists' : 'generated'} for ${selectedUser?.name}.`);
    } catch (err: any) {
      alert(`Failed to generate diet plan: ${err.message || 'Unknown error'}`);
    }
  };

  const dietTypes = [
    { value: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Well-rounded nutrition' },
    { value: 'high_protein', label: 'High Protein', icon: '🥩', desc: 'Muscle building focus' },
    { value: 'low_carb', label: 'Low Carb', icon: '🥗', desc: 'Keto-friendly' },
    { value: 'mediterranean', label: 'Mediterranean', icon: '🫒', desc: 'Heart-healthy' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 -m-6 p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generate Diet Plan</h1>
            <p className="text-gray-600 mt-0.5">Create a personalized nutrition program powered by AI</p>
          </div>
          <Link 
            href="/users/add"
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
          >
            + Add New User
          </Link>
        </div>

        {users.length === 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex items-center">
              <div className="text-yellow-600 text-2xl mr-3">⚠️</div>
              <div>
                <p className="font-semibold text-yellow-800">No users found</p>
                <p className="text-sm text-yellow-700">Please add a user first to generate diet plans.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User Selection Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3">
              <div className="flex items-center text-white">
                <UserGroupIcon className="w-5 h-5 mr-2" />
                <h2 className="text-lg font-semibold">Select Client</h2>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  required
                >
                  <option value="">-- Choose a client --</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <SparklesIcon className="w-4 h-4 mr-2 text-green-600" />
                    Client Profile
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-2.5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Age</p>
                      <p className="text-base font-bold text-gray-800">{selectedUser.profile?.age ?? 'N/A'}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Weight</p>
                      <p className="text-base font-bold text-gray-800">{selectedUser.profile?.weight ?? 'N/A'} kg</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Height</p>
                      <p className="text-base font-bold text-gray-800">{selectedUser.profile?.height ?? 'N/A'} cm</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Activity</p>
                      <p className="text-base font-bold text-green-600 capitalize">{selectedUser.profile?.activityLevel || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Diet Type Selection Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-5 py-3">
              <div className="flex items-center text-white">
                <FireIcon className="w-5 h-5 mr-2" />
                <h2 className="text-lg font-semibold">Diet Type</h2>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {dietTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, dietType: type.value })}
                    className={`p-3 rounded-xl border-2 transition-all transform hover:scale-[1.02] ${
                      formData.dietType === type.value
                        ? 'border-orange-500 bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1.5">{type.icon}</div>
                    <div className={`font-semibold mb-1 ${formData.dietType === type.value ? 'text-white' : 'text-gray-800'}`}>
                      {type.label}
                    </div>
                    <div className={`text-xs ${formData.dietType === type.value ? 'text-orange-100' : 'text-gray-500'}`}>
                      {type.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dietary Preferences Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3">
              <div className="flex items-center text-white">
                <HeartIcon className="w-5 h-5 mr-2" />
                <h2 className="text-lg font-semibold">Dietary Preferences</h2>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Vegetarian Toggle */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center">
                  <span className="text-xl mr-3">🌱</span>
                  <div>
                    <p className="font-semibold text-gray-800">Vegetarian</p>
                    <p className="text-sm text-gray-600">Exclude meat and fish</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isVegetarian: !formData.isVegetarian })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    formData.isVegetarian ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      formData.isVegetarian ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <FireIcon className="w-4 h-4 mr-1 text-purple-600" />
                    Nutrition Goal
                  </label>
                  <select
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value="muscle_gain">💪 Muscle Gain (Surplus)</option>
                    <option value="weight_loss">🔥 Weight Loss (Deficit)</option>
                    <option value="maintenance">⚖️ Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <CurrencyRupeeIcon className="w-4 h-4 mr-1 text-purple-600" />
                    Budget (INR/week)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">₹</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="e.g., 1500"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full pl-8 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <SparklesIcon className="w-4 h-4 mr-1 text-purple-600" />
                  Food Preferences & Restrictions (Optional)
                </label>
                <textarea
                  value={formData.preferences}
                  onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                  placeholder="e.g., Allergic to nuts, prefer chicken over beef, avoid dairy, love spicy food, no seafood..."
                  rows={4}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add any allergies, food preferences, or cultural dietary restrictions
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3.5">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUserId}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 focus:ring-4 focus:ring-orange-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              ✨ Generate Diet Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
