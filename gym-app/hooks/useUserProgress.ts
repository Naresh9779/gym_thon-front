import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface ProgressLog {
  _id: string;
  userId: string;
  date: string;
  workout?: {
    day?: string;
    completedExercises: number;
    totalExercises: number;
    durationSec?: number;
  };
  meals?: Array<{
    mealName: string;
    loggedAt: string;
    calories?: number;
    macros?: { p?: number; c?: number; f?: number };
  }>;
}

interface ProgressStats {
  workoutsCompleted: number;
  totalMealsLogged: number;
  activeDays: number;
  currentStreak: number;
  logs: ProgressLog[];
}

export function useUserProgress() {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    workoutsCompleted: 0,
    totalMealsLogged: 0,
    activeDays: 0,
    currentStreak: 0,
    logs: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { accessToken } = useAuth();

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const token = accessToken();
      
      // Fetch stats from backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/stats?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const json = await res.json();
      
      if (json.ok) {
        setLogs(json.data.logs || []);
        setStats({
          workoutsCompleted: json.data.workoutsCompleted || 0,
          totalMealsLogged: json.data.totalMealsLogged || 0,
          activeDays: json.data.activeDays || 0,
          currentStreak: json.data.currentStreak || 0,
          logs: json.data.logs || []
        });
      } else {
        setError(json.error?.message || 'Failed to fetch progress');
      }
    } catch (e) {
      console.error('Failed to fetch progress:', e);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const logWorkout = useCallback(async (day: string, completedExercises: number, totalExercises: number, durationSec?: number) => {
    try {
      const token = accessToken();
      const date = new Date().toISOString().slice(0, 10);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/workout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date, day, completedExercises, totalExercises, durationSec })
      });
      
      const json = await res.json();
      
      if (json.ok) {
        await fetchProgress(); // Refresh progress data
        return true;
      } else {
        setError(json.error?.message || 'Failed to log workout');
        return false;
      }
    } catch (e) {
      console.error('Failed to log workout:', e);
      setError('Failed to log workout progress');
      return false;
    }
  }, [accessToken, fetchProgress]);

  const logMeal = useCallback(async (mealName: string, calories?: number, macros?: { p?: number; c?: number; f?: number }) => {
    try {
      const token = accessToken();
      const date = new Date().toISOString().slice(0, 10);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/progress/meal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date, mealName, calories, macros })
      });
      
      if (res.status === 409) {
        // Duplicate meal log for today
        await fetchProgress();
        return { success: true, alreadyLogged: true } as const;
      }

      const json = await res.json();
      
      if (json.ok) {
        await fetchProgress(); // Refresh progress data
        return { success: true } as const;
      } else {
        setError(json.error?.message || 'Failed to log meal');
        return { success: false } as const;
      }
    } catch (e) {
      console.error('Failed to log meal:', e);
      setError('Failed to log meal progress');
      return { success: false } as const;
    }
  }, [accessToken, fetchProgress]);

  return {
    logs,
    stats,
    loading,
    error,
    refresh: fetchProgress,
    logWorkout,
    logMeal,
  };
}