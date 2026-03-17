"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DataPoint {
  date: string;
  workouts?: number;
  meals?: number;
  value?: number;
}

interface Props {
  data?: DataPoint[];
}

const VIEWS = [
  { key: "combined", label: "All", color: "text-gray-700" },
  { key: "workouts", label: "Workouts", color: "text-blue-600" },
  { key: "meals", label: "Meals", color: "text-purple-600" },
] as const;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function ProgressChart({ data = [] }: Props) {
  const [view, setView] = useState<"combined" | "workouts" | "meals">("combined");

  const sample: DataPoint[] = data.length
    ? data
    : [
        { date: "Mon", workouts: 1, meals: 3 },
        { date: "Tue", workouts: 1, meals: 2 },
        { date: "Wed", workouts: 0, meals: 3 },
        { date: "Thu", workouts: 1, meals: 3 },
        { date: "Fri", workouts: 1, meals: 4 },
        { date: "Sat", workouts: 1, meals: 3 },
        { date: "Sun", workouts: 0, meals: 2 },
      ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h4 className="font-bold text-gray-900">Activity Trends</h4>
          <p className="text-xs text-gray-400 mt-0.5">Last {sample.length} days</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === v.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
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
              <linearGradient id="workoutGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {(view === "combined" || view === "workouts") && (
              <Area
                type="monotone"
                dataKey="workouts"
                stroke="#3B82F6"
                strokeWidth={2.5}
                fill="url(#workoutGrad)"
                name="Workouts"
                dot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            )}
            {(view === "combined" || view === "meals") && (
              <Area
                type="monotone"
                dataKey="meals"
                stroke="#A855F7"
                strokeWidth={2.5}
                fill="url(#mealGrad)"
                name="Meals"
                dot={{ r: 4, fill: "#A855F7", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
