'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionCard from '@/components/user/SubscriptionCard';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    age: user?.profile?.age || 0,
    weight: user?.profile?.weight || 0,
    height: user?.profile?.height || 0,
    goal: user?.profile?.goals?.[0] || '',
    activityLevel: user?.profile?.activityLevel || '',
    joinedDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        age: user.profile?.age || 0,
        weight: user.profile?.weight || 0,
        height: user.profile?.height || 0,
        goal: user.profile?.goals?.[0] || '',
        activityLevel: user.profile?.activityLevel || '',
        joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      
      // Map frontend goal to backend enum
      const goalMapping: { [key: string]: string } = {
        'Weight Loss': 'weight_loss',
        'Muscle Building': 'muscle_gain',
        'Muscle Gain': 'muscle_gain',
        'Maintenance': 'maintenance',
        'Endurance': 'endurance'
      };
      
      // Map activity level to backend enum
      const activityMapping: { [key: string]: string } = {
        'Sedentary': 'sedentary',
        'Light': 'light',
        'Moderate': 'moderate',
        'Active': 'active',
        'Very Active': 'very_active'
      };
      
      const mappedGoal = goalMapping[formData.goal] || 'maintenance';
      const mappedActivity = activityMapping[formData.activityLevel] || 'moderate';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          age: formData.age || undefined,
          weight: formData.weight || undefined,
          height: formData.height || undefined,
          goals: [mappedGoal],
          activityLevel: mappedActivity
        })
      });

      if (response.ok) {
        alert('Profile updated successfully!');
        setIsEditing(false);
        // Refresh user data from backend
        await refreshUser();
      } else {
        const data = await response.json();
        alert(`Failed to update profile: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
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
              {formData.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} />
                  <Input value={formData.email} onChange={(e)=>setFormData({...formData, email: e.target.value})} type="email" />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{formData.name}</h2>
                  <p className="text-gray-600">{formData.email}</p>
                  <p className="text-sm text-gray-500 mt-1">Member since {formData.joinedDate}</p>
                </>
              )}
            </div>
            <Button onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Age</p>
              {isEditing ? (
                <input type="number" value={formData.age} onChange={(e)=>setFormData({...formData, age: parseInt(e.target.value)})} className="w-full text-2xl font-bold border-b-2 border-green-500 bg-transparent focus:outline-none" />
              ) : (
                <p className="text-2xl font-bold">{formData.age}</p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Weight</p>
              {isEditing ? (
                <input type="number" value={formData.weight} onChange={(e)=>setFormData({...formData, weight: parseInt(e.target.value)})} className="w-full text-2xl font-bold border-b-2 border-green-500 bg-transparent focus:outline-none" />
              ) : (
                <p className="text-2xl font-bold">{formData.weight} kg</p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Height</p>
              {isEditing ? (
                <input type="number" value={formData.height} onChange={(e)=>setFormData({...formData, height: parseInt(e.target.value)})} className="w-full text-2xl font-bold border-b-2 border-green-500 bg-transparent focus:outline-none" />
              ) : (
                <p className="text-2xl font-bold">{formData.height} cm</p>
              )}
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
              <span className="font-semibold text-green-600">{formData.goal}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Activity Level</span>
              <span className="font-semibold">{formData.activityLevel}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Subscription Card */}
      <SubscriptionCard
        planName={user?.subscription?.plan || "free"}
        price={user?.subscription?.status === 'active' ? "$29.99/month" : "Free"}
        status={user?.subscription?.status}
        startDate={user?.subscription?.startDate}
        endDate={user?.subscription?.endDate}
        durationMonths={user?.subscription?.durationMonths}
        benefits={[
          'Personalized workout plans',
          'Custom meal plans',
          'Progress tracking',
          'AI-powered recommendations',
          'Priority support'
        ]}
      />

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Button 
          variant="secondary" 
          className="w-full py-3"
          onClick={() => router.push('/settings')}
        >
          Settings
        </Button>
        <Button 
          variant="danger" 
          className="w-full py-3"
          onClick={handleLogout}
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}
