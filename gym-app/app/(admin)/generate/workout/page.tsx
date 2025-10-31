'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserGroupIcon, AcademicCapIcon, CalendarIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface User {
  id: number;
  name: string;
  username: string;
  age: string;
  weight: string;
  goal: string;
}

export default function AdminGenerateWorkout() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState({
    goal: 'muscle_gain',
    experience: 'intermediate',
    daysPerWeek: '4',
    preferences: '',
  });

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers(storedUsers);
  }, []);

  const selectedUser = users.find(u => u.id.toString() === selectedUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }
    alert(`🎉 Workout plan generated successfully for ${selectedUser?.name}!`);
  };

  const goals = [
    { value: 'muscle_gain', label: 'Muscle Gain', icon: '💪', color: 'from-blue-500 to-blue-600' },
    { value: 'weight_loss', label: 'Weight Loss', icon: '🔥', color: 'from-red-500 to-red-600' },
    { value: 'strength', label: 'Strength', icon: '⚡', color: 'from-yellow-500 to-yellow-600' },
    { value: 'endurance', label: 'Endurance', icon: '🏃', color: 'from-green-500 to-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 -m-6 p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generate Workout Plan</h1>
            <p className="text-gray-600 mt-0.5">Create a personalized training program powered by AI</p>
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
                <p className="text-sm text-yellow-700">Please add a user first to generate workout plans.</p>
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
                    <option key={user.id} value={user.id}>
                      {user.name} (@{user.username})
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
                      <p className="text-base font-bold text-gray-800">{selectedUser.age || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Weight</p>
                      <p className="text-base font-bold text-gray-800">{selectedUser.weight || 'N/A'} kg</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Goal</p>
                      <p className="text-base font-bold text-green-600 capitalize">{selectedUser.goal.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Training Goals Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3">
              <div className="flex items-center text-white">
                <FireIcon className="w-5 h-5 mr-2" />
                <h2 className="text-lg font-semibold">Training Goals</h2>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {goals.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, goal: goal.value })}
                    className={`p-3 rounded-xl border-2 transition-all transform hover:scale-[1.02] ${
                      formData.goal === goal.value
                        ? `border-transparent bg-gradient-to-br ${goal.color} text-white shadow-lg`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1.5">{goal.icon}</div>
                    <div className={`font-semibold ${formData.goal === goal.value ? 'text-white' : 'text-gray-800'}`}>
                      {goal.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plan Configuration Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3">
              <div className="flex items-center text-white">
                <AcademicCapIcon className="w-5 h-5 mr-2" />
                <h2 className="text-lg font-semibold">Plan Configuration</h2>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <AcademicCapIcon className="w-4 h-4 mr-1 text-indigo-600" />
                    Experience Level
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  >
                    <option value="beginner">🌱 Beginner</option>
                    <option value="intermediate">💪 Intermediate</option>
                    <option value="advanced">🏆 Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    <CalendarIcon className="w-4 h-4 mr-1 text-indigo-600" />
                    Training Frequency
                  </label>
                  <select
                    value={formData.daysPerWeek}
                    onChange={(e) => setFormData({ ...formData, daysPerWeek: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  >
                    <option value="3">📅 3 days per week</option>
                    <option value="4">📅 4 days per week</option>
                    <option value="5">📅 5 days per week</option>
                    <option value="6">📅 6 days per week</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <SparklesIcon className="w-4 h-4 mr-1 text-indigo-600" />
                  Preferences & Notes (Optional)
                </label>
                <textarea
                  value={formData.preferences}
                  onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                  placeholder="e.g., Avoid exercises that strain the lower back, prefer dumbbell over barbell exercises, focus on compound movements..."
                  rows={4}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add any specific preferences, injuries, or equipment limitations
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
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 focus:ring-4 focus:ring-green-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              ✨ Generate Workout Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
