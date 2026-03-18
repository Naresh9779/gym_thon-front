"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "./useAuth";

export function useDietPlan() {
  const { getAccessToken } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (startDate?: string, endDate?: string) => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const qs: string[] = [];
      if (startDate) qs.push(`startDate=${encodeURIComponent(startDate)}`);
      if (endDate) qs.push(`endDate=${encodeURIComponent(endDate)}`);
      const query = qs.length ? `?${qs.join('&')}` : '';
      const data = await fetchWithAuth<{ dietPlans: any[] }>(`/api/diet${query}`, token);
      setPlans(data.dietPlans || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  const removePlan = useCallback(async (id: string) => {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    await fetchWithAuth(`/api/diet/${id}`, token, { method: "DELETE" });
    await refresh();
  }, [getAccessToken, refresh]);

  const getPlan = useCallback(async (id: string) => {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    return fetchWithAuth(`/api/diet/${id}`, token);
  }, [getAccessToken]);

  useEffect(() => {
    if (getAccessToken()) refresh();
  }, [getAccessToken, refresh]);

  return { plans, loading, error, refresh, removePlan, getPlan };
}
