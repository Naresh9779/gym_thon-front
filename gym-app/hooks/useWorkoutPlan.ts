"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

export function useWorkoutPlans() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
  }, [token]);

  const generateCycle = useCallback(async (startDateISO: string, durationWeeks = 4) => {
    if (!token) throw new Error("Not authenticated");
    const data = await fetchWithAuth(`/api/workouts/generate-cycle`, token, {
      method: "POST",
      body: JSON.stringify({ startDate: startDateISO, durationWeeks }),
    });
    await refresh();
    return data;
  }, [token, refresh]);

  const removePlan = useCallback(async (id: string) => {
    if (!token) throw new Error("Not authenticated");
    await fetchWithAuth(`/api/workouts/${id}`, token, { method: "DELETE" });
    await refresh();
  }, [token, refresh]);

  useEffect(() => { if (token) refresh(); }, [token, refresh]);

  return { plans, loading, error, refresh, generateCycle, removePlan };
}
