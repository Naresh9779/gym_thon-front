'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
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
    startDate?: string;
    endDate?: string;
    durationMonths?: number;
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
  const toast = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionAction, setSubscriptionAction] = useState<'extend' | 'expire' | 'setDate'>('extend');
  const [subscriptionValue, setSubscriptionValue] = useState('1'); // months/days/date value

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
        toast.success('User stats updated successfully!');
        // Refresh user data
        if (user) {
          setUser({ ...user, profile: { ...user.profile, ...stats } });
        }
      } else {
        toast.error(`Failed to update: ${json.error?.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Failed to update stats:', e);
      toast.error('Failed to update user stats');
    }
  };

  const handleSubscriptionUpdate = async () => {
    try {
      const token = accessToken();
      const payload: any = {};
      
      if (subscriptionAction === 'extend') {
        payload.extendByMonths = Number(subscriptionValue);
      } else if (subscriptionAction === 'expire') {
        payload.status = 'expired';
      } else if (subscriptionAction === 'setDate') {
        payload.setEndDate = subscriptionValue;
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${id}/subscription`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.ok) {
        toast.success('Subscription updated successfully!');
        setShowSubscriptionModal(false);
        // Refresh user data
        if (json.data?.user) {
          setUser(json.data.user);
        }
      } else {
        toast.error(`Failed to update: ${json.error?.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Failed to update subscription:', e);
      toast.error('Failed to update subscription');
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
                    user.subscription?.status === 'active' ? 'text-green-600' : 
                    user.subscription?.status === 'expired' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {user.subscription?.status || 'Active'}
                  </span>
                </div>
                {user.subscription?.startDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Start:</span>
                    <span className="text-sm font-medium">
                      {new Date(user.subscription.startDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {user.subscription?.endDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">End:</span>
                    <span className="text-sm font-medium">
                      {new Date(user.subscription.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {user.subscription?.durationMonths && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="text-sm font-medium">{user.subscription.durationMonths} months</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Role:</span>
                  <span className="text-sm font-medium capitalize">{user.role}</span>
                </div>
              </div>
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Manage Subscription
              </button>
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
                              toast.success('Workout plan deleted');
                              setWorkoutPlans(plans => plans.filter(p => p._id !== plan._id));
                            } else {
                              toast.error(j.error?.message || 'Failed to delete plan');
                            }
                          } catch (err) {
                            toast.error('Failed to delete workout plan');
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
                              toast.success('Diet plan deleted');
                              setDietPlans(plans => plans.filter(p => p._id !== plan._id));
                            } else {
                              toast.error(j.error?.message || 'Failed to delete plan');
                            }
                          } catch (err) {
                            toast.error('Failed to delete diet plan');
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

      {/* Subscription Management Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Manage Subscription</h3>
            
            {/* Action Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="subscriptionAction"
                    value="extend"
                    checked={subscriptionAction === 'extend'}
                    onChange={(e) => setSubscriptionAction(e.target.value as 'extend' | 'expire' | 'setDate')}
                    className="mr-2"
                  />
                  <span>Extend/Reduce Subscription</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="subscriptionAction"
                    value="setDate"
                    checked={subscriptionAction === 'setDate'}
                    onChange={(e) => setSubscriptionAction(e.target.value as 'extend' | 'expire' | 'setDate')}
                    className="mr-2"
                  />
                  <span>Set End Date</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="subscriptionAction"
                    value="expire"
                    checked={subscriptionAction === 'expire'}
                    onChange={(e) => setSubscriptionAction(e.target.value as 'extend' | 'expire' | 'setDate')}
                    className="mr-2"
                  />
                  <span>Mark as Expired</span>
                </label>
              </div>
            </div>

            {/* Value Input */}
            {subscriptionAction === 'extend' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Months to Extend/Reduce
                </label>
                <input
                  type="number"
                  value={subscriptionValue}
                  onChange={(e) => setSubscriptionValue(e.target.value)}
                  placeholder="Enter number (negative to reduce)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use positive numbers to extend, negative to reduce
                </p>
              </div>
            )}

            {subscriptionAction === 'setDate' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New End Date
                </label>
                <input
                  type="date"
                  value={subscriptionValue}
                  onChange={(e) => setSubscriptionValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {subscriptionAction === 'expire' && (
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  This will immediately mark the subscription as expired. The user will no longer be able to access their plans.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setSubscriptionAction('extend');
                  setSubscriptionValue('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubscriptionUpdate}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Update Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
