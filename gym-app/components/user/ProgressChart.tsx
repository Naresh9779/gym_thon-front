"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

interface DataPoint { date: string; workouts?: number; meals?: number; value?: number; }
interface Props { data?: DataPoint[]; }

const VIEWS = [
  { key: "combined", label: "All" },
  { key: "workouts", label: "Workouts" },
  { key: "meals",    label: "Meals" },
] as const;

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-black">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function ProgressChart({ data = [] }: Props) {
  const [view, setView] = useState<"combined" | "workouts" | "meals">("combined");

  const sample: DataPoint[] = data.length ? data : [
    { date: "Mon", workouts: 1, meals: 3 },
    { date: "Tue", workouts: 1, meals: 2 },
    { date: "Wed", workouts: 0, meals: 3 },
    { date: "Thu", workouts: 1, meals: 3 },
    { date: "Fri", workouts: 1, meals: 4 },
    { date: "Sat", workouts: 1, meals: 3 },
    { date: "Sun", workouts: 0, meals: 2 },
  ];

  return (
    <div className="bg-black rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="label-cap text-gray-600 mb-0.5">Trends</p>
          <h4 className="font-black text-white text-lg">Activity</h4>
        </div>
        <div className="flex bg-white/5 rounded-xl p-0.5 gap-0.5">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === v.key ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <AreaChart data={sample} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gW" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00E676" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#FF6D00" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6D00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#4B5563" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#4B5563" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<Tip />} />
            {(view === "combined" || view === "workouts") && (
              <Area type="monotone" dataKey="workouts" stroke="#00E676" strokeWidth={2.5}
                fill="url(#gW)" name="Workouts"
                dot={{ r: 3, fill: "#00E676", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            )}
            {(view === "combined" || view === "meals") && (
              <Area type="monotone" dataKey="meals" stroke="#FF6D00" strokeWidth={2.5}
                fill="url(#gM)" name="Meals"
                dot={{ r: 3, fill: "#FF6D00", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
