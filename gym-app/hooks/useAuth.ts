"use client";
import { useEffect, useState, useCallback, useRef } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type User = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  profile?: {
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    goals?: string[];
    activityLevel?: string;
    preferences?: string[];
    restrictions?: string[];
    timezone?: string;
  };
  subscription?: {
    plan?: string;
    status?: 'active' | 'inactive' | 'trial' | 'expired';
    startDate?: string;
    endDate?: string;
    durationMonths?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

type AuthResponse = {
  ok: boolean;
  data?: {
    user: User;
    accessToken: string;
    refreshToken?: string;
  };
  error?: { message: string };
};

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

function setStoredTokens(accessToken?: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}

function setStoredUser(user: User) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('authUser', JSON.stringify(user)); } catch {}
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('authUser');
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
}

function clearStoredTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refreshingRef = useRef(false);

  // Stable refs so the token-monitoring interval can always call the latest version
  // without being listed as a useEffect dependency (avoids temporal dead zone).
  const fetchMeRef = useRef<(() => Promise<User | null>) | null>(null);
  const logoutRef = useRef<(() => Promise<void>) | null>(null);

  const logout = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = getStoredToken();
      if (token) {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      clearStoredTokens();
      try { localStorage.removeItem('authUser'); } catch {}
      setUser(null);
      setLoading(false);
    }
  }, []);

  const fetchMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      setInitialized(true);
      return null;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok && json.data?.user) {
        setUser(json.data.user);
        setLoading(false);
        setInitialized(true);
        return json.data.user as User;
      }
      clearStoredTokens();
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return null;
    } catch {
      clearStoredTokens();
      setUser(null);
      setLoading(false);
      setInitialized(true);
      return null;
    }
  }, []);

  // Keep refs in sync with the latest function instances
  useEffect(() => { fetchMeRef.current = fetchMe; }, [fetchMe]);
  useEffect(() => { logoutRef.current = logout; }, [logout]);

  // Token expiry monitoring — runs once on mount.
  // Uses refs to call fetchMe/logout so it doesn't need them in the deps array.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const attemptRefresh = async () => {
      if (refreshingRef.current) return;
      const rt = getStoredRefreshToken();
      if (!rt) return;
      refreshingRef.current = true;
      try {
        const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
        const json = await res.json();
        if (json.ok && json.data?.accessToken) {
          setStoredTokens(json.data.accessToken);
          await fetchMeRef.current?.();
          return;
        }
        await logoutRef.current?.();
      } catch {
        await logoutRef.current?.();
      } finally {
        refreshingRef.current = false;
      }
    };

    const checkToken = () => {
      const token = getStoredToken();
      if (!token) return;
      try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Malformed JWT');
        const payload = JSON.parse(atob(parts[1]));
        const timeLeft = payload.exp * 1000 - Date.now();
        if (timeLeft <= 0 || timeLeft < 120000) {
          attemptRefresh();
        }
      } catch {
        attemptRefresh();
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 30000);
    return () => clearInterval(interval);
  }, []); // safe — uses refs internally

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json: AuthResponse = await res.json();
      if (!json.ok || !json.data) {
        throw new Error(json.error?.message || "Login failed");
      }
      setStoredTokens(json.data.accessToken, json.data.refreshToken);
      setStoredUser(json.data.user);
      setUser(json.data.user);
      setLoading(false);
      return json.data;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
      throw e;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const json: AuthResponse = await res.json();
      if (!json.ok || !json.data) {
        throw new Error(json.error?.message || "Register failed");
      }
      setStoredTokens(json.data.accessToken, json.data.refreshToken);
      setStoredUser(json.data.user);
      setUser(json.data.user);
      setLoading(false);
      return json.data;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
      throw e;
    }
  }, []);

  // Hydrate from cache on first mount, then validate with server
  useEffect(() => {
    if (initialized) return;
    const cachedUser = getStoredUser();
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);
    }
    fetchMe();
  }, [initialized, fetchMe]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refreshUser: fetchMe,
    getAccessToken: getStoredToken,
    initialized,
  };
}
