'use client';

import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import SubscriptionCard from '@/components/user/SubscriptionCard';

export default function ProfilePage() {
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 28,
    weight: 75,
    height: 180,
    goal: 'Muscle Building',
    activityLevel: 'Moderate',
    joinedDate: 'Jan 15, 2024'
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Profile</h1>

      {/* Profile Info Card */}
      <Card>
        <CardHeader title="Personal Information" />
        <CardBody>
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 mt-1">Member since {user.joinedDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Age</p>
              <p className="text-2xl font-bold">{user.age}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Weight</p>
              <p className="text-2xl font-bold">{user.weight} kg</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Height</p>
              <p className="text-2xl font-bold">{user.height} cm</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Goals Card */}
      <Card>
        <CardHeader title="Fitness Goals" />
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Primary Goal</span>
              <span className="font-semibold text-green-600">{user.goal}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Activity Level</span>
              <span className="font-semibold">{user.activityLevel}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Subscription Card */}
      <SubscriptionCard
        planName="Premium Plan"
        price="$29.99/month"
        benefits={[
          'Personalized workout plans',
          'Custom meal plans',
          'Progress tracking',
          'AI-powered recommendations',
          'Priority support'
        ]}
      />

      {/* Action Buttons */}
      <div className="space-y-3">
        <button className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          Edit Profile
        </button>
        <button className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          Change Password
        </button>
        <button className="w-full bg-red-50 border border-red-200 text-red-600 py-3 rounded-lg hover:bg-red-100 transition-colors font-medium">
          Log Out
        </button>
      </div>
    </div>
  );
}
