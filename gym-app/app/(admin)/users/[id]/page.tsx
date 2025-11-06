'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import UserCard from '@/components/admin/UserCard';
import UserStatsForm from '@/components/admin/UserStatsForm';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

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
    goals?: string[];
    preferences?: string[];
    restrictions?: string[];
    timezone?: string;
  };
  subscription?: {
    plan: string;
    status: string;
  };
}

interface WorkoutPlan {
  _id: string;
  name: string;
  startDate: string;
  duration: number; // weeks
  days: any[];
}

interface DietPlan {
  _id: string;
  name: string;
  date: string;
  dailyCalories: number;
  meals: any[];
}

export default function AdminUserDetail({ params }: Props) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // No inline edit state; we redirect to dedicated edit pages

  useEffect(() => {
    async function fetchUserData() {
      try {
        const token = accessToken();
        
        // Fetch user profile
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userJson = await userRes.json();
        
        if (userJson.ok) {
          const foundUser = userJson.data.users.find((u: any) => u._id === id);
          if (foundUser) {
            setUser(foundUser);
          }
        }

        // Fetch user's workout plans
        const workoutRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/workouts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const workoutJson = await workoutRes.json();
        if (workoutJson.ok) {
          setWorkoutPlans(workoutJson.data.workoutPlans || []);
        }

        // Fetch user's diet plans (admin)
        const dietRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/diet`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dietJson = await dietRes.json();
        if (dietJson.ok) {
          setDietPlans(dietJson.data.dietPlans || []);
        }

        setLoading(false);
      } catch (e) {
        console.error('Failed to fetch user data:', e);
        setError('Failed to load user data');
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [id, accessToken]);

  const handleStatsUpdate = async (stats: { age?: number; weight?: number; height?: number }) => {
    try {
      const token = accessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stats)
      });
      
      const json = await res.json();
      if (json.ok) {
        alert('User stats updated successfully!');
        // Refresh user data
        if (user) {
          setUser({ ...user, profile: { ...user.profile, ...stats } });
        }
      } else {
        alert(`Failed to update: ${json.error?.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Failed to update stats:', e);
      alert('Failed to update user stats');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading user data...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700">
        {error || 'User not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/users" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Users
      </Link>

      {/* User Info & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <UserCard id={user._id} name={user.name} email={user.email} />
          
          {/* Subscription Info */}
          <Card className="mt-4">
            <CardHeader title="Subscription" />
            <CardBody>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Plan:</span>
                  <span className="text-sm font-medium capitalize">{user.subscription?.plan || 'Free'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium capitalize ${
                    user.subscription?.status === 'active' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {user.subscription?.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Role:</span>
                  <span className="text-sm font-medium capitalize">{user.role}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        
        <div className="md:col-span-2">
            <UserStatsForm 
              initial={{
                age: user.profile?.age,
                weight: user.profile?.weight,
                height: user.profile?.height
              }}
              onSave={handleStatsUpdate}
            />
        </div>
      </div>

      {/* Current Workout Plans */}
      <Card>
        <CardHeader 
          title="Workout Plans" 
          subtitle={`${workoutPlans.length} active plan${workoutPlans.length !== 1 ? 's' : ''}`}
        />
        <CardBody>
          {workoutPlans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No workout plans assigned yet</p>
              <Link href={`/generate?userId=${id}&type=workout`}>
                <Button variant="primary" className="bg-green-500 hover:bg-green-600">
                  Generate Workout Plan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {workoutPlans.map((plan) => (
                <div key={plan._id} className="border rounded-lg p-4 hover:border-green-500 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="text-sm text-gray-600">
                        Started: {new Date(plan.startDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {plan.duration || 0} weeks • {plan.days?.length || 0} training days
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/workouts/${plan._id}/edit`}>
                        <Button variant="secondary" className="text-sm">Edit</Button>
                      </Link>
                      <Button 
                        variant="secondary" 
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (!confirm(`Delete workout plan "${plan.name}"?`)) return;
                          try {
                            const token = accessToken();
                            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/workouts/${plan._id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const j = await resp.json();
                            if (j.ok) {
                              alert('Workout plan deleted');
                              setWorkoutPlans(plans => plans.filter(p => p._id !== plan._id));
                            } else {
                              alert(j.error?.message || 'Failed to delete plan');
                            }
                          } catch (err) {
                            alert('Failed to delete workout plan');
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                </div>
              ))}
              <div className="pt-2">
                <Link href={`/generate?userId=${id}&type=workout`}>
                  <Button variant="secondary" className="w-full">
                    + Generate New Workout Plan
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Current Diet Plans */}
      <Card>
        <CardHeader 
          title="Diet Plans" 
          subtitle={`${dietPlans.length} active plan${dietPlans.length !== 1 ? 's' : ''}`}
        />
        <CardBody>
          {dietPlans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No diet plans assigned yet</p>
              <Link href={`/generate?userId=${id}&type=diet`}>
                <Button variant="primary" className="bg-green-500 hover:bg-green-600">
                  Generate Diet Plan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {dietPlans.map((plan) => (
                <div key={plan._id} className="border rounded-lg p-4 hover:border-green-500 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="text-sm text-gray-600">
                        Date: {new Date(plan.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {plan.dailyCalories} kcal • {plan.meals?.length || 0} meals
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/diet/${plan._id}/edit`}>
                        <Button variant="secondary" className="text-sm">Edit</Button>
                      </Link>
                      <Button 
                        variant="secondary" 
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (!confirm(`Delete diet plan "${plan.name}"?`)) return;
                          try {
                            const token = accessToken();
                            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/diet/${plan._id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const j = await resp.json();
                            if (j.ok) {
                              alert('Diet plan deleted');
                              setDietPlans(plans => plans.filter(p => p._id !== plan._id));
                            } else {
                              alert(j.error?.message || 'Failed to delete plan');
                            }
                          } catch (err) {
                            alert('Failed to delete diet plan');
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                </div>
              ))}
              <div className="pt-2">
                <Link href={`/generate?userId=${id}&type=diet`}>
                  <Button variant="secondary" className="w-full">
                    + Generate New Diet Plan
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
