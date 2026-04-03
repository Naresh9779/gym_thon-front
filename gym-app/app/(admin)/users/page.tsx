'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import UserCard from '@/components/admin/UserCard';
import { useAuth } from '@/hooks/useAuth';
import { Users, UserPlus, Search, AlertTriangle, ChevronDown, Check, X, CreditCard, Tag, DoorOpen } from 'lucide-react';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  gymStatus?: string;
  leftAt?: string;
  subscription?: {
    status?: string;
    endDate?: string;
    planName?: string;
    planId?: string;
  };
}

interface Counts {
  all: number;
  active: number;
  expired: number;
  expiring: number;
  left_gym: number;
  pending_payment: number;
}

type FilterTab = 'all' | 'active' | 'expiring' | 'expired' | 'pending_payment' | 'left_gym';

const FILTER_OPTIONS: { key: FilterTab; label: string }[] = [
  { key: 'all',             label: 'All Members'      },
  { key: 'active',          label: 'Active'           },
  { key: 'expiring',        label: 'Expiring (7d)'    },
  { key: 'expired',         label: 'Expired'          },
  { key: 'pending_payment', label: 'Pending Payment'  },
  { key: 'left_gym',        label: 'Left Gym'         },
];

const PAGE_SIZE = 12;

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const [users, setUsers]               = useState<UserItem[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [counts, setCounts]             = useState<Counts>({ all: 0, active: 0, expired: 0, expiring: 0, left_gym: 0, pending_payment: 0 });
  const [planNames, setPlanNames]       = useState<string[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [tab, setTab]                   = useState<FilterTab>((searchParams.get('tab') as FilterTab) || 'all');
  const [page, setPage]                 = useState(1);
  const [planFilter, setPlanFilter]     = useState<string>('all');
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  const dropdownRef     = useRef<HTMLDivElement>(null);
  const planDropdownRef = useRef<HTMLDivElement>(null);
  const { getAccessToken } = useAuth();

  // Close dropdowns on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!planDropdownOpen) return;
    const h = (e: MouseEvent) => { if (planDropdownRef.current && !planDropdownRef.current.contains(e.target as Node)) setPlanDropdownOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [planDropdownOpen]);

  // Sync tab + plan from URL
  useEffect(() => {
    const t = searchParams.get('tab') as FilterTab | null;
    if (t && FILTER_OPTIONS.some(o => o.key === t)) setTab(t);
    const p = searchParams.get('plan');
    if (p) setPlanFilter(p);
  }, [searchParams]);

  // Load plan names once
  useEffect(() => {
    (async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/plan-names`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (j.ok) setPlanNames(j.data.planNames || []);
      } catch { /* ignore */ }
    })();
  }, [getAccessToken]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch users from server
  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_SIZE),
        tab,
      });
      if (search) params.set('search', search);
      if (planFilter !== 'all') params.set('planName', planFilter);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const j = await res.json();
      if (j.ok) {
        setUsers(j.data.users || []);
        setTotal(j.data.total || 0);
        setTotalPages(j.data.totalPages || 1);
        if (j.data.counts) setCounts(j.data.counts);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [getAccessToken, tab, search, planFilter]);

  useEffect(() => { fetchUsers(page); }, [fetchUsers, page]);

  const setTabAndReset = useCallback((t: FilterTab) => {
    setTab(t); setPage(1); setDropdownOpen(false);
  }, []);

  const setPlanAndReset = (p: string) => {
    setPlanFilter(p); setPage(1); setPlanDropdownOpen(false);
  };

  const currentLabel = FILTER_OPTIONS.find(o => o.key === tab)?.label || 'All Members';

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-3">
        <div>
          <p className="label-cap mb-1">Admin</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Members</h1>
        </div>
        <Link
          href="/users/add"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black text-[#00E676] text-sm font-black hover:bg-gray-900 transition-colors shrink-0 mt-1"
        >
          <UserPlus className="w-4 h-4" /> Add Member
        </Link>
      </motion.div>

      {/* ── PENDING PAYMENT ALERT ── */}
      <AnimatePresence>
        {counts.pending_payment > 0 && tab !== 'pending_payment' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3.5 bg-orange-50 border border-orange-200 rounded-2xl"
          >
            <CreditCard className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-sm font-bold text-orange-700 flex-1">
              {counts.pending_payment} member{counts.pending_payment !== 1 ? 's' : ''} with pending payments
            </p>
            <button
              onClick={() => setTabAndReset('pending_payment')}
              className="text-xs font-black text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              View
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EXPIRY ALERT ── */}
      <AnimatePresence>
        {counts.expiring > 0 && tab !== 'expiring' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm font-bold text-amber-700 flex-1">
              {counts.expiring} membership{counts.expiring !== 1 ? 's' : ''} expiring within 7 days
            </p>
            <button
              onClick={() => setTabAndReset('expiring')}
              className="text-xs font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              View
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SEARCH + FILTER DROPDOWN + ADD ── */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-9 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none text-sm font-medium bg-white transition-all"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter dropdown */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-black transition-all ${
              tab !== 'all' ? 'border-gray-900 bg-black text-[#00E676]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab === 'pending_payment' && <CreditCard className="w-3.5 h-3.5" />}
            {tab === 'left_gym' && <DoorOpen className="w-3.5 h-3.5" />}
            {currentLabel}
            {tab !== 'all' && counts[tab] > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-bold">{counts[tab]}</span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 min-w-[200px] py-1.5 overflow-hidden"
              >
                {FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTabAndReset(opt.key)}
                    className={`w-full px-4 py-2.5 text-left text-sm font-bold flex items-center justify-between gap-3 transition-colors ${
                      tab === opt.key ? 'bg-black text-[#00E676]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {opt.key === 'pending_payment' && <CreditCard className="w-3.5 h-3.5" />}
                      {opt.key === 'left_gym' && <DoorOpen className="w-3.5 h-3.5" />}
                      {opt.label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                      tab === opt.key ? 'bg-white/20 text-[#00E676]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {counts[opt.key]}
                    </span>
                  </button>
                ))}
                {tab !== 'all' && (
                  <div className="border-t border-gray-50 mt-1 pt-1">
                    <button
                      onClick={() => setTabAndReset('all')}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plan filter dropdown */}
        {planNames.length > 0 && (
          <div ref={planDropdownRef} className="relative shrink-0">
            <button
              onClick={() => setPlanDropdownOpen(o => !o)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-black transition-all ${
                planFilter !== 'all' ? 'border-gray-900 bg-black text-[#00E676]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              {planFilter === 'all' ? 'Plan' : planFilter}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${planDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {planDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 min-w-[180px] py-1.5 overflow-hidden"
                >
                  <button
                    onClick={() => setPlanAndReset('all')}
                    className={`w-full px-4 py-2.5 text-left text-sm font-bold flex items-center justify-between gap-3 transition-colors ${
                      planFilter === 'all' ? 'bg-black text-[#00E676]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Plans
                    {planFilter === 'all' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {planNames.map(name => (
                    <button
                      key={name}
                      onClick={() => setPlanAndReset(name)}
                      className={`w-full px-4 py-2.5 text-left text-sm font-bold flex items-center justify-between gap-3 transition-colors ${
                        planFilter === name ? 'bg-black text-[#00E676]' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      {planFilter === name && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* ── PENDING PAYMENT NOTICE ── */}
      {tab === 'pending_payment' && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl">
          <CreditCard className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-xs font-semibold text-orange-700">
            These members have been assigned a plan but payment hasn't been marked as received yet.
          </p>
        </div>
      )}

      {/* ── LIST ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
        >
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="font-black text-gray-900 mb-2">
            {search ? 'No results found' : tab !== 'all' ? `No ${currentLabel.toLowerCase()} members` : 'No users yet'}
          </h3>
          <p className="text-sm text-gray-400 mb-5">
            {search ? `No members match "${search}"` : tab === 'all' ? 'Get started by adding your first member' : ''}
          </p>
          {tab === 'all' && !search && (
            <Link href="/users/add" className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-[#00E676] rounded-xl text-sm font-black hover:bg-gray-900 transition-colors">
              <UserPlus className="w-4 h-4" /> Add First Member
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {users.map(u => (
            <motion.div key={u._id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <UserCard
                id={u._id}
                name={u.name}
                email={u.email}
                subscription={u.subscription}
                isInactive={false}
                hasPendingPayment={tab === 'pending_payment'}
                gymStatus={u.gymStatus}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400 font-medium">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-xl text-xs font-black border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show pages around current
              const start = Math.max(1, Math.min(page - 3, totalPages - 6));
              return start + i;
            }).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-xl text-xs font-black transition-colors ${n === page ? 'bg-black text-[#00E676]' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl text-xs font-black border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
