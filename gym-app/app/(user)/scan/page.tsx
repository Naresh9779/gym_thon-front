"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { XCircle, Loader2, Clock, LogIn, LogOut, Zap } from "lucide-react";
import Link from "next/link";

type State = "loading" | "success-in" | "success-out" | "already-in" | "already-complete" | "marking-out" | "error" | "no-token";

interface MarkResult {
  state: State;
  message?: string;
  markedInAt?: string;
  markedOutAt?: string;
  durationMinutes?: number;
}

export default function ScanPage() {
  const searchParams = useSearchParams();
  const { getAccessToken, user } = useAuth();
  const [result, setResult] = useState<MarkResult>({ state: "loading" });
  const called = useRef(false);

  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setResult({ state: "no-token" });
      return;
    }

    async function markIn() {
      const accessToken = getAccessToken();
      try {
        const res = await fetch(`${base}/api/attendance/mark-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();

        if (json.ok) {
          const d = json.data;
          if (d.alreadyMarkedIn) {
            if (d.markedOutAt) {
              setResult({
                state: "already-complete",
                markedInAt: d.markedInAt,
                markedOutAt: d.markedOutAt,
                durationMinutes: d.durationMinutes,
              });
            } else {
              setResult({ state: "already-in", markedInAt: d.markedInAt });
            }
          } else {
            setResult({ state: "success-in", markedInAt: d.markedInAt });
          }
        } else {
          const msg: string = json.error?.message || json.error || "Something went wrong";
          setResult({ state: "error", message: msg });
        }
      } catch {
        setResult({ state: "error", message: "Network error. Please try again." });
      }
    }

    markIn();
  }, [searchParams, getAccessToken, base]);

  async function handleMarkOut() {
    setResult(prev => ({ ...prev, state: "marking-out" }));
    const accessToken = getAccessToken();
    try {
      const res = await fetch(`${base}/api/attendance/mark-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.ok) {
        const d = json.data;
        setResult(prev => ({
          state: "success-out",
          markedInAt: prev.markedInAt,
          markedOutAt: d.markedOutAt,
          durationMinutes: d.durationMinutes,
        }));
      } else {
        setResult(prev => ({
          ...prev,
          state: "error",
          message: json.error?.message || "Failed to mark out",
        }));
      }
    } catch {
      setResult(prev => ({ ...prev, state: "error", message: "Network error." }));
    }
  }

  const fmt = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const fmtDuration = (mins?: number) => {
    if (!mins) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const { state } = result;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow">
            <Zap className="w-5 h-5 text-[#00E676]" />
          </div>
          <span className="text-xl font-black text-gray-900">FitFlow</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {(state === "loading" || state === "marking-out") && (
            <div className="p-10 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
              <p className="text-sm font-bold text-gray-500">
                {state === "marking-out" ? "Marking you out…" : "Marking attendance…"}
              </p>
            </div>
          )}

          {state === "success-in" && (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-[#00E676]/10 rounded-full flex items-center justify-center">
                <LogIn className="w-8 h-8 text-[#00E676]" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">Checked In!</p>
                <p className="text-sm text-gray-400 mt-1">
                  Welcome, {user?.name?.split(" ")[0] || "there"} 💪
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-1 bg-gray-50 px-4 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-700">{fmt(result.markedInAt)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Scan again when you leave to check out.</p>
            </div>
          )}

          {state === "success-out" && (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                <LogOut className="w-8 h-8 text-[#00E676]" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">Checked Out!</p>
                <p className="text-sm text-gray-400 mt-1">
                  Great session, {user?.name?.split(" ")[0] || "champ"}!
                </p>
              </div>
              <div className="w-full bg-gray-50 rounded-xl p-4 mt-1 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold">In</span>
                  <span className="text-sm font-black text-gray-700">{fmt(result.markedInAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold">Out</span>
                  <span className="text-sm font-black text-gray-700">{fmt(result.markedOutAt)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold">Duration</span>
                  <span className="text-sm font-black text-[#00E676]">{fmtDuration(result.durationMinutes)}</span>
                </div>
              </div>
            </div>
          )}

          {state === "already-in" && (
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-[#00E676]/10 rounded-full flex items-center justify-center">
                <LogIn className="w-8 h-8 text-[#00E676]" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">Already Checked In</p>
                <p className="text-sm text-gray-400 mt-1">
                  Checked in at <span className="font-bold text-gray-600">{fmt(result.markedInAt)}</span>
                </p>
              </div>
              <button
                onClick={handleMarkOut}
                className="w-full flex items-center justify-center gap-2 bg-black text-[#00E676] font-black text-sm py-3 rounded-xl hover:bg-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Mark Out Now
              </button>
            </div>
          )}

          {state === "already-complete" && (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">Session Complete</p>
                <p className="text-sm text-gray-400 mt-1">You've already completed your session today.</p>
              </div>
              <div className="w-full bg-gray-50 rounded-xl p-4 mt-1 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold">In</span>
                  <span className="text-sm font-black text-gray-700">{fmt(result.markedInAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold">Out</span>
                  <span className="text-sm font-black text-gray-700">{fmt(result.markedOutAt)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold">Duration</span>
                  <span className="text-sm font-black text-[#00E676]">{fmtDuration(result.durationMinutes)}</span>
                </div>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">Failed</p>
                <p className="text-sm text-gray-400 mt-1">{result.message}</p>
              </div>
            </div>
          )}

          {state === "no-token" && (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">Invalid QR</p>
                <p className="text-sm text-gray-400 mt-1">
                  This QR code is invalid or has expired. Ask the gym staff for a new one.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          {state !== "loading" && state !== "marking-out" && (
            <div className="px-6 pb-6 pt-2">
              <Link
                href="/home"
                className="block w-full text-center bg-black text-[#00E676] font-black text-sm py-3 rounded-xl hover:bg-gray-900 transition-colors"
              >
                Go to Home
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
