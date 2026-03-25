"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  IndianRupee, Clock, TrendingUp, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Search, XCircle, Check, CheckCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

/* ─── Types ── */

interface Stats {
  summary: { allTimeRevenue: number; revenueThisMonth: number; pendingAmount: number; pendingCount: number };
  revenueByMonth: { month: string; revenue: number; count: number }[];
  planDistribution: { name: string; received: number; pending: number; total: number; transactions: number; color: string }[];
  methodBreakdown: { method: string; count: number; total: number }[];
}

interface Payment {
  _id: string;
  userId: string | { _id: string; name: string; email: string };
  planId?: string | { _id: string; name: string; color: string };
  amount: number;
  method: string;
  paymentStatus: 'received' | 'pending';
  paidAt: string;
  note?: string;
  planSnapshot?: { name: string; price: number };
}

const METHOD_COLORS: Record<string, string> = {
  cash: '#00E676',
  upi: '#2979FF',
  card: '#8B5CF6',
  other: '#F59E0B',
};

const fmtCurrency = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/* ─── Dropdown ── */

function FilterDropdown<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const current = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-gray-300 transition-colors"
      >
        {label}: <span className="text-gray-900">{current?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[140px] py-1 overflow-hidden">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm font-bold transition-colors ${
                o.value === value ? 'bg-black text-[#00E676]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ── */

export default function PaymentsPage() {
  const { getAccessToken } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [markingReceived, setMarkingReceived] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'pending'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'upi' | 'card' | 'other'>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const LIMIT = 15;

  // Load stats once
  useEffect(() => {
    (async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`${base}/api/admin/payments/stats`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.ok) setStats(json.data);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [getAccessToken, base]);

  // Load payment list
  const loadPayments = useCallback(async (p: number) => {
    setListLoading(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statusFilter !== 'all') params.set('paymentStatus', statusFilter);
      if (methodFilter !== 'all') params.set('method', methodFilter);
      const res = await fetch(`${base}/api/admin/payments?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.ok) { setPayments(json.data.payments || []); setTotal(json.data.total || 0); }
    } catch { /* ignore */ } finally {
      setListLoading(false);
    }
  }, [getAccessToken, base, statusFilter, methodFilter]);

  useEffect(() => { setPage(1); }, [statusFilter, methodFilter]);
  useEffect(() => { loadPayments(page); }, [loadPayments, page]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const markReceived = async (paymentId: string) => {
    setMarkingReceived(paymentId);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/payments/${paymentId}/mark-received`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        setPayments(prev => prev.map(p => p._id === paymentId ? { ...p, paymentStatus: 'received' } : p));
        const statsRes = await fetch(`${base}/api/admin/payments/stats`, { headers: { Authorization: `Bearer ${token}` } });
        const statsJson = await statsRes.json();
        if (statsJson.ok) setStats(statsJson.data);
      }
    } catch { /* ignore */ } finally {
      setMarkingReceived(null);
    }
  };

  const cancelPayment = async (paymentId: string) => {
    setConfirmCancelId(null);
    setCancelling(paymentId);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/payments/${paymentId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        setPayments(prev => prev.filter(p => p._id !== paymentId));
        setTotal(t => t - 1);
        // Refresh stats summary
        const statsRes = await fetch(`${base}/api/admin/payments/stats`, { headers: { Authorization: `Bearer ${token}` } });
        const statsJson = await statsRes.json();
        if (statsJson.ok) setStats(statsJson.data);
      }
    } catch { /* ignore */ } finally {
      setCancelling(null);
    }
  };

  const filteredPayments = search
    ? payments.filter(p => {
        const name = typeof p.userId === 'object' && p.userId !== null ? p.userId.name : '';
        const email = typeof p.userId === 'object' && p.userId !== null ? (p.userId as any).email : '';
        const plan = typeof p.planId === 'object' && p.planId !== null ? (p.planId as any).name : (p.planSnapshot?.name || '');
        return [name, email, plan].some(s => s.toLowerCase().includes(search.toLowerCase()));
      })
    : payments;

  const totalPages = Math.ceil(total / LIMIT);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const s = stats?.summary;

  return (
    <div className="space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Payments</h1>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {[
          { label: 'All-Time Revenue', value: fmtCurrency(s?.allTimeRevenue ?? 0), sub: 'Total collected',                     icon: IndianRupee, color: 'text-[#00E676]', bg: 'bg-black',    onClick: null },
          { label: 'Revenue (MTD)',    value: fmtCurrency(s?.revenueThisMonth ?? 0), sub: 'This month',                         icon: TrendingUp,  color: 'text-blue-600',  bg: 'bg-blue-50',  onClick: () => { setStatusFilter('received'); setPage(1); } },
          { label: 'Pending Amount',   value: fmtCurrency(s?.pendingAmount ?? 0), sub: `${s?.pendingCount ?? 0} outstanding`,   icon: Clock,       color: 'text-amber-600', bg: 'bg-amber-50', onClick: () => { setStatusFilter('pending'); setPage(1); } },
          { label: 'Collected MTD',    value: String(stats?.revenueByMonth?.at(-1)?.count ?? 0), sub: 'Payments received',      icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', onClick: () => { setStatusFilter('received'); setPage(1); } },
        ].map((c, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            onClick={c.onClick ?? undefined}
            className={`bg-white rounded-2xl border border-gray-100 p-4 ${c.onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all' : ''}`}
          >
            <div className={`w-8 h-8 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className="text-2xl font-black text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-4"
        >
          <h3 className="font-black text-gray-900 mb-4">Revenue Trend (12 months)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats?.revenueByMonth || []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                formatter={(v: any) => [fmtCurrency(v), 'Revenue']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }}
              />
              <Bar dataKey="revenue" fill="#00E676" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Payment Method Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-100 p-4"
        >
          <h3 className="font-black text-gray-900 mb-4">By Method</h3>
          {stats?.methodBreakdown && stats.methodBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={stats.methodBreakdown}
                    dataKey="total"
                    nameKey="method"
                    cx="50%" cy="50%"
                    innerRadius={30} outerRadius={55}
                    paddingAngle={3}
                  >
                    {stats.methodBreakdown.map((m, i) => (
                      <Cell key={i} fill={METHOD_COLORS[m.method] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [fmtCurrency(v), 'Total']}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {stats.methodBreakdown.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: METHOD_COLORS[m.method] || '#6B7280' }} />
                      <span className="text-xs font-bold text-gray-600 capitalize">{m.method}</span>
                    </div>
                    <span className="text-xs font-black text-gray-900">{fmtCurrency(m.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No payment data yet</p>
          )}
        </motion.div>
      </div>

      {/* Revenue by Plan — stacked received vs pending */}
      {stats?.planDistribution && stats.planDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-black text-gray-900">Revenue by Plan</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#00E676]" /><span className="text-[10px] font-bold text-gray-500">Received</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-[10px] font-bold text-gray-500">Pending</span></div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">Total billed per plan (all-time)</p>
          <ResponsiveContainer width="100%" height={Math.max(100, stats.planDistribution.length * 56)}>
            <BarChart data={stats.planDistribution} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 800, fill: '#111827' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                formatter={(v: any, name: string) => [fmtCurrency(v as number), name === 'received' ? '✓ Received' : '⏳ Pending']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }}
              />
              <Bar dataKey="received" name="received" stackId="a" fill="#00E676" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" name="pending" stackId="a" fill="#F59E0B" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-50">
            {stats.planDistribution.map((p, i) => (
              <Link key={i} href={`/users?tab=active&plan=${encodeURIComponent(p.name)}`} className="flex items-center gap-2 min-w-0 hover:opacity-70 transition-opacity">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{fmtCurrency(p.received)} rcvd · {fmtCurrency(p.pending)} pending · {p.transactions} txn</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Payment List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        {/* List header + filters */}
        <div className="p-4 border-b border-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900">All Payments</h3>
            <span className="text-xs font-bold text-gray-400">{total} records</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search member or plan…"
                className="bg-transparent text-sm font-bold text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'received', label: 'Received' },
                { value: 'pending', label: 'Pending' },
              ]}
              onChange={v => setStatusFilter(v as any)}
            />
            <FilterDropdown
              label="Method"
              value={methodFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'cash', label: 'Cash' },
                { value: 'upi', label: 'UPI' },
                { value: 'card', label: 'Card' },
                { value: 'other', label: 'Other' },
              ]}
              onChange={v => setMethodFilter(v as any)}
            />
          </div>
        </div>

        {/* Table */}
        {listLoading ? (
          <div className="p-4 space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        ) : filteredPayments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No payments found</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredPayments.map(p => {
              const userName = typeof p.userId === 'object' && p.userId !== null ? p.userId.name : '—';
              const userId = typeof p.userId === 'object' && p.userId !== null ? p.userId._id : p.userId;
              const planName = typeof p.planId === 'object' && p.planId !== null ? (p.planId as any).name : (p.planSnapshot?.name || '—');
              const planColor = typeof p.planId === 'object' && p.planId !== null ? (p.planId as any).color : undefined;
              return (
                <Link
                  key={p._id}
                  href={`/users/${userId}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-[#00E676] text-[10px] font-black shrink-0">
                      {userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {planName !== '—' && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: planColor ? `${planColor}20` : '#f3f4f6', color: planColor || '#6B7280' }}
                          >
                            {planName}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-gray-400 capitalize">{p.method}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">{fmtDate(p.paidAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-gray-900">{fmtCurrency(p.amount)}</span>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                      p.paymentStatus === 'received'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      {p.paymentStatus === 'received' ? '✓ Paid' : '⏳ Pending'}
                    </span>
                    {p.paymentStatus === 'pending' && confirmCancelId !== p._id && (
                      <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                        <button
                          onClick={e => { e.preventDefault(); markReceived(p._id); }}
                          disabled={markingReceived === p._id}
                          title="Mark as received"
                          className="p-1 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => { e.preventDefault(); setConfirmCancelId(p._id); }}
                          disabled={cancelling === p._id}
                          title="Cancel pending payment"
                          className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {confirmCancelId === p._id && (
                      <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                        <span className="text-[10px] font-bold text-gray-500">Void?</span>
                        <button
                          onClick={e => { e.preventDefault(); cancelPayment(p._id); }}
                          disabled={cancelling === p._id}
                          className="w-6 h-6 rounded-lg bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.preventDefault(); setConfirmCancelId(null); }}
                          className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs font-bold text-gray-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>

    </div>
  );
}
