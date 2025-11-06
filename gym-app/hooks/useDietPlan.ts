"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "./useAuth";

export function useDietPlan() {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const refresh = useCallback(async (startDate?: string, endDate?: string) => {
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
  }, [token]);

  const generateForDate = useCallback(async (dateISO: string) => {
    if (!token) throw new Error("Not authenticated");
    const data = await fetchWithAuth(`/api/diet/generate`, token, {
      method: "POST",
      body: JSON.stringify({ date: dateISO }),
    });
    await refresh(dateISO, dateISO);
    return data;
  }, [token, refresh]);

  const generateToday = useCallback(async () => {
    if (!token) throw new Error("Not authenticated");
    const data = await fetchWithAuth(`/api/diet/generate-daily`, token, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await refresh();
    return data;
  }, [token, refresh]);

  const removePlan = useCallback(async (id: string) => {
    if (!token) throw new Error("Not authenticated");
    await fetchWithAuth(`/api/diet/${id}`, token, { method: "DELETE" });
    await refresh();
  }, [token, refresh]);

  const getPlan = useCallback(async (id: string) => {
    if (!token) throw new Error("Not authenticated");
    return fetchWithAuth(`/api/diet/${id}`, token);
  }, [token]);

  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  return { plans, loading, error, refresh, generateForDate, generateToday, removePlan, getPlan };
}
