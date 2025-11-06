"use client";
import { useEffect, useMemo, useState, useCallback } from "react";

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
    status?: 'active' | 'inactive' | 'trial';
    expiresAt?: string;
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

function setStoredTokens(accessToken?: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
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

  const accessToken = useMemo(() => getStoredToken(), [typeof window !== "undefined" && localStorage.getItem("accessToken")]);

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
    // On mount, try to populate user
    if (!initialized) {
      fetchMe();
    }
  }, [initialized, fetchMe]);

  return { 
    user, 
    loading, 
    error, 
    login, 
    register, 
    logout, 
    refreshUser: fetchMe,
    accessToken: getStoredToken, 
    initialized 
  };
}
