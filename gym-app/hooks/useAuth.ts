"use client";
import { useEffect, useState, useCallback, useRef } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
console.log("useAuth BASE_URL:", BASE_URL);

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

  // Track if a refresh is currently in progress to avoid duplicate calls from the interval
  const refreshingRef = useRef(false);

  // We will always read the latest token from storage when needed instead of storing in state.
  // This avoids stale values on tab focus/other updates.

  // Token expiry monitoring
  useEffect(() => {
    if (typeof window === "undefined") return;

    const attemptRefresh = async () => {
      if (refreshingRef.current) return; // already refreshing
      const rt = getStoredRefreshToken();
      if (!rt) return; // cannot refresh without refresh token
      refreshingRef.current = true;
      try {
        const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt })
        });
        const json = await res.json();
        if (json.ok && json.data?.accessToken) {
          setStoredTokens(json.data.accessToken); // keep existing refresh token
          // Refresh user data after successful token renewal
          await fetchMe();
          return;
        }
        // Failed refresh -> logout
        logout();
      } catch {
        logout();
      } finally {
        refreshingRef.current = false;
      }
    };

    const checkToken = () => {
      const token = getStoredToken();
      if (!token) return; // not logged in
      try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Malformed JWT');
        const payload = JSON.parse(atob(parts[1]));
        const expMs = payload.exp * 1000;
        const timeLeft = expMs - Date.now();
        // If expired or less than 2 minutes left, try refreshing instead of logging out.
        if (timeLeft <= 0 || timeLeft < 120000) {
          attemptRefresh();
        }
      } catch (e) {
        console.warn('[Auth] Token decode error, attempting refresh:', (e as Error).message);
        attemptRefresh();
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 30000);
    return () => clearInterval(interval);
  }, [fetchMe, logout]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true); setError(null);
    try {
      console.log("Attempting login to:", `${BASE_URL}/api/auth/login`);
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      console.log("Login response status:", res.status);
      const json: AuthResponse = await res.json();
      console.log("Login response data:", json);
      if (!json.ok || !json.data) {
        throw new Error(json.error?.message || "Login failed");
      }
      setStoredTokens(json.data.accessToken, json.data.refreshToken);
      setStoredUser(json.data.user);
      setUser(json.data.user);
      setLoading(false);
      return json.data;
    } catch (e: any) {
      console.error("Login error:", e);
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
      // Token is invalid, clear it
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

  useEffect(() => {
    if (initialized) return;
    // Hydrate user immediately from cache to avoid flash logout
    const cachedUser = getStoredUser();
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false); // we already have a user; we will still validate token
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
    initialized
  };
}
