"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "./useAuth";

export function useWorkoutPlans() {
  const { getAccessToken } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const data = await fetchWithAuth<{ workoutPlans: any[] }>(`/api/workouts`, token);
      setPlans(data.workoutPlans || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  const generateCycle = useCallback(async (startDateISO: string, durationWeeks = 4) => {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    const data = await fetchWithAuth(`/api/workouts/generate-cycle`, token, {
      method: "POST",
      body: JSON.stringify({ startDate: startDateISO, durationWeeks }),
    });
    await refresh();
    return data;
  }, [getAccessToken, refresh]);

  const removePlan = useCallback(async (id: string) => {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    await fetchWithAuth(`/api/workouts/${id}`, token, { method: "DELETE" });
    await refresh();
  }, [getAccessToken, refresh]);

  useEffect(() => { if (getAccessToken()) refresh(); }, [getAccessToken, refresh]);

  return { plans, loading, error, refresh, generateCycle, removePlan };
}
