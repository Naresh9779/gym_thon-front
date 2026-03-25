"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2, TrendingDown, AlertTriangle, CheckCircle,
  Clock, Users, BarChart2, PieChart as PieIcon,
  LineChart as LineIcon, Activity, UserX, ChevronDown, Check, IndianRupee,
} from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

/* ─── Types ──────────────────────────────────────────────── */

interface UserItem { _id: string; name: string; }

interface Summary {
  membership: { totalUsers: number; activeUsers: number; expiredUsers: number; trialUsers: number; expiringSoon: number; leftMembers: number; };
  thisMonth: { newUsers: number; activatedSubs: number; expiredSubs: number; workoutPlans: number; dietPlans: number; planRequestsPending: number; planRequestsDone: number; approvedLeaves: number; leftMembers: number; };
  lastMonth: { newUsers: number };
  activityTrend: { date: string; activeUsers: number; newUsers: number }[];
  dayOfWeekPattern: { day: string; count: number }[];
  retention: { day30: number | null; day60: number | null; day90: number | null };
  atRisk: { _id: string; name: string; recentDays: number; prevDays: number }[];
}

type ChartType = 'line' | 'bar' | 'pie';
type PresetId = 'activity' | 'registrations' | 'membership' | 'plans' | 'churn' | 'joins_leaves' | 'day_pattern' | 'retention';
type PeriodMode = '30' | '90' | '180' | 'custom';

interface Preset { id: PresetId; label: string; description: string; defaultType: ChartType; allowedTypes: ChartType[]; trendBased: boolean; }

/* ─── Config ─────────────────────────────────────────────── */

const PRESETS: Preset[] = [
  { id: 'activity',      label: 'Activity Trend',       description: 'Active users + new joins per day',              defaultType: 'line', allowedTypes: ['line', 'bar'], trendBased: true  },
  { id: 'registrations', label: 'Registrations',         description: 'New member sign-ups per day',                   defaultType: 'bar',  allowedTypes: ['bar', 'line'], trendBased: true  },
  { id: 'membership',    label: 'Membership Mix',         description: 'Current subscription breakdown',                defaultType: 'pie',  allowedTypes: ['pie', 'bar'],  trendBased: false },
  { id: 'plans',         label: 'Plans Generated',        description: 'Workout vs diet plans this month',              defaultType: 'pie',  allowedTypes: ['pie', 'bar'],  trendBased: false },
  { id: 'churn',         label: 'Activation vs Churn',   description: 'Subscriptions activated vs expired this month', defaultType: 'bar',  allowedTypes: ['bar', 'pie'],  trendBased: false },
  { id: 'joins_leaves',  label: 'Joins vs Left Gym',      description: 'New members joined vs members who left this month', defaultType: 'bar',  allowedTypes: ['bar', 'pie'],  trendBased: false },
  { id: 'day_pattern',   label: 'Day Pattern',            description: 'Which days members are most active (last 90d)', defaultType: 'bar',  allowedTypes: ['bar'],         trendBased: false },
  { id: 'retention',          label: 'Retention (30/60/90d)', description: '% of members still active after N days',         defaultType: 'bar',  allowedTypes: ['bar'],         trendBased: false },
];

const C = { green: '#00E676', blue: '#2979FF', red: '#EF4444', amber: '#F59E0B', orange: '#F97316', purple: '#8B5CF6', teal: '#14B8A6' };

/* ─── CompactSelect ──────────────────────────────────────── */

function CompactSelect<T extends string>({
  label, value, onChange, options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black text-gray-800 hover:border-gray-300 transition-colors whitespace-nowrap"
      >
        <span className="text-gray-400 font-semibold">{label}:</span>
        {current?.label}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 min-w-[180px] py-1.5 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between gap-3 transition-colors ${
                value === opt.value ? 'bg-black text-[#00E676]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
              {value === opt.value && <Check className="w-3 h-3 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Chart helpers ──────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs shadow-lg">
      {label && <p className="font-bold text-gray-500 mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey || p.name} style={{ color: p.color || p.fill }} className="font-black">
          {p.name}: {p.value}{p.dataKey === 'rate' ? '%' : ''}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p style={{ color: p.payload.fill }} className="font-black">{p.name}: {p.value}</p>
      <p className="text-gray-400">{((p.value / (p.payload.total || 1)) * 100).toFixed(1)}%</p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const { getAccessToken } = useAuth();

  const [summary, setSummary]               = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [periodMode, setPeriodMode]         = useState<PeriodMode>('30');
  const [customFrom, setCustomFrom]         = useState('');
  const [customTo, setCustomTo]             = useState('');
  const [customApplied, setCustomApplied]   = useState(false);
  const [preset, setPreset]                 = useState<PresetId>('activity');
  const [chartType, setChartType]           = useState<ChartType>('line');

  // Per-user
  const [users, setUsers]             = useState<UserItem[]>([]);
  const [selectedId, setSelectedId]   = useState('');
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [userTrends, setUserTrends]   = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    if (periodMode === 'custom' && (!customApplied || !customFrom || !customTo)) return;
    async function load() {
      setSummaryLoading(true);
      try {
        const token = getAccessToken();
        const h = { Authorization: `Bearer ${token}` };
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const q = periodMode === 'custom' ? `from=${customFrom}&to=${customTo}` : `days=${periodMode}`;
        const [resU, resS] = await Promise.all([
          fetch(`${base}/api/admin/users`, { headers: h }),
          fetch(`${base}/api/analytics/summary?${q}`, { headers: h }),
        ]);
        const [ju, js] = await Promise.all([resU.json(), resS.json()]);
        if (ju.ok) setUsers(ju.data.users || []);
        if (js.ok) setSummary(js.data);
      } catch { /* ignore */ } finally { setSummaryLoading(false); }
    }
    load();
  }, [getAccessToken, periodMode, customApplied]);

  /* ── Sync chart type when preset changes ── */
  useEffect(() => {
    const p = PRESETS.find(p => p.id === preset)!;
    if (!p.allowedTypes.includes(chartType)) setChartType(p.defaultType);
  }, [preset]);

  /* ── Per-user ── */
  const selectedUser = users.find(u => String(u._id) === selectedId);
  useEffect(() => {
    async function loadUser() {
      if (!selectedUser) { setUserMetrics(null); setUserTrends([]); return; }
      setUserLoading(true);
      try {
        const token = getAccessToken();
        const h = { Authorization: `Bearer ${token}` };
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        const [resM, resT] = await Promise.all([
          fetch(`${base}/api/analytics/user/${selectedUser._id}`, { headers: h }),
          fetch(`${base}/api/admin/users/${selectedUser._id}/trends`, { headers: h }).catch(() => null),
        ]);
        const jm = await resM.json();
        if (jm.ok) setUserMetrics(jm.data);
        if (resT?.ok) { const jt = await resT.json(); if (jt.ok) setUserTrends(jt.data.series || []); }
      } catch { /* ignore */ } finally { setUserLoading(false); }
    }
    loadUser();
  }, [selectedUser, getAccessToken]);

  /* ── Derived ── */
  const currentPreset = PRESETS.find(p => p.id === preset)!;
  const newUserDiff = summary ? summary.thisMonth.newUsers - summary.lastMonth.newUsers : 0;
  const churnRate = summary && (summary.membership.activeUsers + summary.thisMonth.expiredSubs) > 0
    ? ((summary.thisMonth.expiredSubs / (summary.membership.activeUsers + summary.thisMonth.expiredSubs)) * 100).toFixed(1)
    : null;

  /* ── Chart data ── */
  const chartData = useMemo(() => {
    if (!summary) return null;
    const { membership, thisMonth, activityTrend, dayOfWeekPattern, retention } = summary;
    const mkPie = (items: { name: string; value: number; fill: string }[]) => {
      const total = items.reduce((s, i) => s + i.value, 0);
      return items.filter(i => i.value > 0).map(i => ({ ...i, total }));
    };
    if (preset === 'activity')      return activityTrend.map(d => ({ date: d.date.slice(5), 'Active Users': d.activeUsers, 'New Joins': d.newUsers }));
    if (preset === 'registrations') return activityTrend.map(d => ({ date: d.date.slice(5), Registrations: d.newUsers }));
    if (preset === 'membership')    return chartType === 'bar'
      ? [{ name: 'Active', value: membership.activeUsers, fill: C.green }, { name: 'Expired', value: membership.expiredUsers, fill: C.red }, { name: 'Trial', value: membership.trialUsers, fill: C.amber }, { name: 'Expiring', value: membership.expiringSoon, fill: C.orange }, { name: 'Left Gym', value: membership.leftMembers ?? 0, fill: C.purple }].filter(d => d.value > 0)
      : mkPie([{ name: 'Active', value: membership.activeUsers, fill: C.green }, { name: 'Expired', value: membership.expiredUsers, fill: C.red }, { name: 'Trial', value: membership.trialUsers, fill: C.amber }, { name: 'Expiring Soon', value: membership.expiringSoon, fill: C.orange }, { name: 'Left Gym', value: membership.leftMembers ?? 0, fill: C.purple }]);
    if (preset === 'plans')         return chartType === 'pie'
      ? mkPie([{ name: 'Workout Plans', value: thisMonth.workoutPlans, fill: C.purple }, { name: 'Diet Plans', value: thisMonth.dietPlans, fill: C.amber }])
      : [{ name: 'Workout', value: thisMonth.workoutPlans, fill: C.purple }, { name: 'Diet', value: thisMonth.dietPlans, fill: C.amber }].filter(d => d.value > 0);
    if (preset === 'churn')         return chartType === 'pie'
      ? mkPie([{ name: 'Activated', value: thisMonth.activatedSubs, fill: C.green }, { name: 'Expired', value: thisMonth.expiredSubs, fill: C.red }])
      : [{ name: 'This Month', Activated: thisMonth.activatedSubs, Expired: thisMonth.expiredSubs }];
    if (preset === 'joins_leaves')  return chartType === 'pie'
      ? mkPie([{ name: 'New Joins', value: thisMonth.newUsers, fill: C.blue }, { name: 'Left Gym', value: thisMonth.leftMembers ?? 0, fill: C.red }])
      : [{ name: 'This Month', 'New Joins': thisMonth.newUsers, 'Left Gym': thisMonth.leftMembers ?? 0 }];
    if (preset === 'day_pattern')   return dayOfWeekPattern;
    if (preset === 'retention')     return [
      { period: '30 Day', rate: retention.day30, fill: C.green  },
      { period: '60 Day', rate: retention.day60, fill: C.blue   },
      { period: '90 Day', rate: retention.day90, fill: C.purple },
    ].filter(d => d.rate !== null);
    return null;
  }, [summary, preset, chartType]);

  /* ── Chart render ── */
  function renderChart() {
    if (summaryLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>;
    if (!chartData || (chartData as any[]).length === 0) return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-300">
        <BarChart2 className="w-10 h-10 mb-2" />
        <p className="text-sm font-bold">No data yet</p>
      </div>
    );

    const interval = (chartData as any[]).length > 60
      ? Math.floor((chartData as any[]).length / 8)
      : (chartData as any[]).length > 30 ? Math.floor((chartData as any[]).length / 6) : 'preserveStartEnd';

    if (chartType === 'pie') return (
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={chartData as any} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
              {(chartData as any[]).map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend formatter={(v: string, e: any) => <span style={{ color: '#6B7280', fontWeight: 700, fontSize: 12 }}>{v} <span style={{ color: e.color, fontWeight: 900 }}>{e.payload.value}</span></span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );

    if (preset === 'retention') return (
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={chartData as any} barSize={64}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="rate" name="Retention %" radius={[8, 8, 0, 0]} label={{ position: 'top', formatter: (v: number) => `${v}%`, fontSize: 13, fontWeight: 900, fill: '#374151' }}>
              {(chartData as any[]).map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );

    if (preset === 'day_pattern') return (
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={chartData as any}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Activity" radius={[6, 6, 0, 0]}>
              {(chartData as any[]).map((e, i) => {
                const max = Math.max(...(chartData as any[]).map((d: any) => d.count));
                const pct = max > 0 ? e.count / max : 0;
                return <Cell key={i} fill={pct >= 0.8 ? C.green : pct >= 0.5 ? C.blue : '#CBD5E1'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );

    if (preset === 'churn' || preset === 'joins_leaves') {
      const keys = preset === 'churn'
        ? [{ k: 'Activated', c: C.green }, { k: 'Expired', c: C.red }]
        : [{ k: 'New Joins', c: C.blue }, { k: 'Approved Leaves', c: C.amber }];
      return (
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData as any} barGap={8} barSize={52}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              {keys.map(({ k, c }) => <Bar key={k} dataKey={k} fill={c} radius={[6, 6, 0, 0]} />)}
              <Legend formatter={(v: string) => <span style={{ color: '#6B7280', fontWeight: 700, fontSize: 12 }}>{v}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (preset === 'membership' || preset === 'plans') return (
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={chartData as any} barSize={52}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
              {(chartData as any[]).map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );

    if (chartType === 'bar') return (
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={chartData as any}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={interval as any} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Registrations" fill={C.blue} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );

    return (
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={chartData as any}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={interval as any} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 'auto']} />
            <Tooltip content={<ChartTooltip />} />
            {preset === 'activity' ? (
              <>
                <Line type="monotone" dataKey="Active Users" stroke={C.green} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="New Joins"    stroke={C.blue}  strokeWidth={2.5} dot={false} />
                <Legend formatter={(v: string) => <span style={{ color: '#6B7280', fontWeight: 700, fontSize: 12 }}>{v}</span>} />
              </>
            ) : (
              <Line type="monotone" dataKey="Registrations" stroke={C.blue} strokeWidth={2.5} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ─── JSX ─────────────────────────────────────────────── */

  const periodOptions: { value: PeriodMode; label: string }[] = [
    { value: '30',     label: 'Last 30 Days'  },
    { value: '90',     label: 'Last 90 Days'  },
    { value: '180',    label: 'Last 6 Months' },
    { value: 'custom', label: 'Custom Range'  },
  ];

  const chartTypeOptions: { value: ChartType; label: string }[] = currentPreset.allowedTypes.map(t => ({
    value: t,
    label: t === 'line' ? 'Line Chart' : t === 'bar' ? 'Bar Chart' : 'Pie Chart',
  }));

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="label-cap mb-1">Admin</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics</h1>
        </div>
        <Link href="/payments" className="flex items-center gap-1.5 px-3 py-2 bg-black text-[#00E676] rounded-xl text-xs font-black hover:bg-gray-900 transition-colors shrink-0">
          <IndianRupee className="w-3.5 h-3.5" /> Payments
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <CompactSelect<PresetId>
            label="Metric"
            value={preset}
            onChange={setPreset}
            options={PRESETS.map(p => ({ value: p.id, label: p.label }))}
          />
          <CompactSelect<ChartType>
            label="Chart"
            value={chartType}
            onChange={setChartType}
            options={chartTypeOptions}
          />
          <CompactSelect<PeriodMode>
            label="Period"
            value={periodMode}
            onChange={v => { setPeriodMode(v); if (v !== 'custom') setCustomApplied(false); }}
            options={periodOptions}
          />
        </div>
      </div>

      {/* ── CUSTOM DATE PICKER ── */}
      <AnimatePresence>
        {periodMode === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-end gap-3 flex-wrap">
              <div>
                <p className="label-cap mb-2">From</p>
                <input type="date" value={customFrom} max={customTo || new Date().toISOString().slice(0, 10)} onChange={e => setCustomFrom(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-gray-900 focus:outline-none bg-white" />
              </div>
              <div>
                <p className="label-cap mb-2">To</p>
                <input type="date" value={customTo} min={customFrom} max={new Date().toISOString().slice(0, 10)} onChange={e => setCustomTo(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-gray-900 focus:outline-none bg-white" />
              </div>
              <button
                onClick={() => { if (customFrom && customTo) setCustomApplied(true); }}
                disabled={!customFrom || !customTo}
                className="px-5 py-2.5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 disabled:opacity-40 transition-colors"
              >
                Apply
              </button>
              {customApplied && (
                <p className="text-xs font-semibold text-[#00E676] self-center">{customFrom} → {customTo}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MEMBERSHIP HEALTH ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)
          : summary && [
              { Icon: Users,         color: C.blue,   label: 'TOTAL',         value: summary.membership.totalUsers,   sub: 'registered',   href: '/users' },
              { Icon: CheckCircle,   color: C.green,  label: 'ACTIVE',        value: summary.membership.activeUsers,  sub: `of ${summary.membership.totalUsers}`, href: '/users?tab=active' },
              { Icon: TrendingDown,  color: C.red,    label: 'EXPIRED',       value: summary.membership.expiredUsers, sub: 'lapsed',       href: '/users?tab=expired' },
              { Icon: Clock,         color: C.amber,  label: 'TRIAL',         value: summary.membership.trialUsers,   sub: 'free trial',   href: '/users?tab=active' },
              { Icon: AlertTriangle, color: C.orange, label: 'EXPIRING (7d)', value: summary.membership.expiringSoon, sub: 'need renewal', href: '/users?tab=expiring' },
            ].map(({ Icon, color, label, value, sub, href }) => (
              <Link key={label} href={href} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-300 hover:shadow-sm transition-all block">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <p className="text-[10px] font-black text-gray-400">{label}</p>
                </div>
                <p className="text-3xl font-black" style={{ color }}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </Link>
            ))
        }
      </div>

      {/* ── CHART ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="font-black text-gray-900">{currentPreset.label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{currentPreset.description}</p>
          </div>
          {currentPreset.trendBased && periodMode !== 'custom' && (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{periodMode} days</span>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${preset}-${chartType}-${periodMode}-${customApplied}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-2 pb-5"
          >
            {renderChart()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── THIS MONTH SNAPSHOT ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'NEW MEMBERS',    value: summary.thisMonth.newUsers,             color: C.blue,
              sub: newUserDiff !== 0 ? (newUserDiff > 0 ? `↑ +${newUserDiff} vs last month` : `↓ ${newUserDiff} vs last month`) : 'same as last month',
              subColor: newUserDiff > 0 ? C.green : newUserDiff < 0 ? C.red : '#9CA3AF', href: '/users' },
            { label: 'ACTIVATED SUBS', value: summary.thisMonth.activatedSubs,        color: C.green,  sub: 'this month',     subColor: '#9CA3AF', href: '/users?tab=active' },
            { label: 'EXPIRED SUBS',   value: summary.thisMonth.expiredSubs,          color: C.red,    sub: 'churned',        subColor: '#9CA3AF', href: '/users?tab=expired' },
            { label: 'CHURN RATE',     value: churnRate ? `${churnRate}%` : '—',      color: churnRate && parseFloat(churnRate) > 10 ? C.red : C.teal,
              sub: 'of active base', subColor: '#9CA3AF', href: null },
            { label: 'PENDING REQS',   value: summary.thisMonth.planRequestsPending,  color: C.purple, sub: `${summary.thisMonth.planRequestsDone} done`, subColor: '#9CA3AF', href: '/requests' },
          ].map(({ label, value, color, sub, subColor, href }) => (
            href ? (
              <Link key={label} href={href} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-300 hover:shadow-sm transition-all block">
                <p className="text-[10px] font-black text-gray-400 mb-2">{label}</p>
                <p className="text-3xl font-black" style={{ color }}>{value}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: subColor }}>{sub}</p>
              </Link>
            ) : (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-[10px] font-black text-gray-400 mb-2">{label}</p>
                <p className="text-3xl font-black" style={{ color }}>{value}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: subColor }}>{sub}</p>
              </div>
            )
          ))}
        </div>
      )}

      {/* ── AT-RISK MEMBERS ── */}
      {summary && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-400" />
              <div>
                <h2 className="font-black text-gray-900">At-Risk Members</h2>
                <p className="text-xs text-gray-400 mt-0.5">Activity dropped &gt;50% in last 14 days vs prior 14 days</p>
              </div>
            </div>
            {summary.atRisk.length > 0 && (
              <span className="text-[10px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
                {summary.atRisk.length} member{summary.atRisk.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {summary.atRisk.length === 0 ? (
            <div className="py-10 text-center">
              <Activity className="w-8 h-8 text-[#00E676] mx-auto mb-2" />
              <p className="text-sm font-black text-gray-900">All members are engaged</p>
              <p className="text-xs text-gray-400 mt-1">No significant drops in the last 14 days</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {summary.atRisk.map(u => {
                const drop = Math.round(((u.prevDays - u.recentDays) / u.prevDays) * 100);
                return (
                  <Link key={String(u._id)} href={`/users/${u._id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center text-red-400 text-[10px] font-black shrink-0">
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate group-hover:text-red-500 transition-colors">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.recentDays}d recently vs {u.prevDays}d before</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg shrink-0 ml-2">↓ {drop}%</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PER-USER DRILL-DOWN ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <p className="label-cap mb-0.5">Per-User</p>
          <h2 className="font-black text-gray-900">User Drill-down</h2>
        </div>
        <div className="p-4 space-y-4">
          <CustomSelect value={selectedId} onChange={setSelectedId} placeholder="Select a user…" options={users.map(u => ({ value: u._id, label: u.name }))} />
          <AnimatePresence>
            {selectedUser && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-[#00E676] text-xs font-black">
                      {selectedUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{selectedUser.name}</p>
                      <p className="text-xs text-gray-400">Last 30 days</p>
                    </div>
                  </div>
                  <Link href={`/users/${selectedUser._id}`} className="text-xs font-black text-[#00E676] bg-black px-3 py-1.5 rounded-xl hover:bg-gray-900 transition-colors shrink-0">
                    View Profile →
                  </Link>
                </div>
                {userLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'Workouts',    value: userMetrics?.workoutsCompleted ?? 0, color: C.green  },
                      { label: 'Meals',       value: userMetrics?.totalMealsLogged   ?? 0, color: C.amber  },
                      { label: 'Active Days', value: userMetrics?.activeDays         ?? 0, color: C.blue   },
                      { label: 'Streak',      value: `${userMetrics?.currentStreak   ?? 0}d`, color: C.red },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-gray-400 mb-1">{label.toUpperCase()}</p>
                        <p className="text-3xl font-black" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {userTrends.length > 0 && (
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer>
                      <LineChart data={userTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 'auto']} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="workouts" stroke={C.green}  strokeWidth={2.5} dot={{ r: 3, fill: C.green,   strokeWidth: 0 }} name="Workouts" />
                        <Line type="monotone" dataKey="meals"    stroke={C.orange} strokeWidth={2.5} dot={{ r: 3, fill: C.orange,  strokeWidth: 0 }} name="Meals"    />
                        <Legend formatter={(v: string) => <span style={{ color: '#6B7280', fontWeight: 700, fontSize: 12 }}>{v}</span>} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
