'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import UserCard from '@/components/admin/UserCard';
import { useAuth } from '@/hooks/useAuth';
import { Users, UserPlus, Search, AlertTriangle, Clock, X } from 'lucide-react';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  subscription?: {
    status?: string;
    endDate?: string;
    plan?: string;
  };
}

type FilterTab = 'all' | 'active' | 'expiring' | 'expired' | 'inactive';

function daysUntilExpiry(endDate?: string): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const { getAccessToken } = useAuth();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = getAccessToken();
        const [usersRes, inactiveRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/inactive?days=7`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const [usersJson, inactiveJson] = await Promise.all([usersRes.json(), inactiveRes.json()]);
        if (usersJson.ok) setUsers(usersJson.data.users || []);
        if (inactiveJson.ok) {
          setInactiveIds(new Set((inactiveJson.data.users || []).map((u: UserItem) => u._id)));
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [getAccessToken]);

  // Derived tab counts
  const counts = useMemo(() => {
    const expiring = users.filter(u => {
      const d = daysUntilExpiry(u.subscription?.endDate);
      return d !== null && d >= 0 && d <= 7 && u.subscription?.status !== 'expired';
    }).length;
    return {
      all: users.length,
      active: users.filter(u => u.subscription?.status === 'active').length,
      expiring,
      expired: users.filter(u => u.subscription?.status === 'expired').length,
      inactive: inactiveIds.size,
    };
  }, [users, inactiveIds]);

  const filtered = useMemo(() => {
    let list = users;

    // Tab filter
    if (tab === 'active') list = list.filter(u => u.subscription?.status === 'active');
    else if (tab === 'expiring') list = list.filter(u => {
      const d = daysUntilExpiry(u.subscription?.endDate);
      return d !== null && d >= 0 && d <= 7 && u.subscription?.status !== 'expired';
    });
    else if (tab === 'expired') list = list.filter(u => u.subscription?.status === 'expired');
    else if (tab === 'inactive') list = list.filter(u => inactiveIds.has(u._id));

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }

    return list;
  }, [users, tab, search, inactiveIds]);

  const tabs: { key: FilterTab; label: string; warn?: boolean }[] = [
    { key: 'all',      label: 'All' },
    { key: 'active',   label: 'Active' },
    { key: 'expiring', label: 'Expiring', warn: counts.expiring > 0 },
    { key: 'expired',  label: 'Expired',  warn: counts.expired > 0 },
    { key: 'inactive', label: 'Inactive', warn: counts.inactive > 0 },
  ];

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Members</h1>
      </motion.div>

      {/* ── EXPIRY ALERT BANNER ── */}
      <AnimatePresence>
        {counts.expiring > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm font-bold text-amber-700 flex-1">
              {counts.expiring} membership{counts.expiring !== 1 ? 's' : ''} expiring within 7 days
            </p>
            <button
              onClick={() => setTab('expiring')}
              className="text-xs font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              View
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SEARCH + ADD ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-9 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:outline-none text-sm font-medium bg-white transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Link
          href="/users/add"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-black text-[#00E676] text-xs font-black hover:bg-gray-900 transition-colors shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add
        </Link>
      </div>

      {/* ── FILTER TABS ── */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shrink-0 ${
              tab === t.key
                ? 'bg-black text-[#00E676]'
                : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-200'
            }`}
          >
            {t.warn && tab !== t.key && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              tab === t.key ? 'bg-white/20 text-[#00E676]' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── INACTIVE NOTICE ── */}
      {tab === 'inactive' && counts.inactive > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs font-semibold text-blue-700">
            These members have not logged any workout or meal in the last 7 days.
          </p>
        </div>
      )}

      {/* ── LIST ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
        >
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="font-black text-gray-900 mb-2">
            {search ? 'No results found' : tab !== 'all' ? `No ${tab} members` : 'No users yet'}
          </h3>
          <p className="text-sm text-gray-400 mb-5">
            {search ? `No members match "${search}"` : tab === 'all' ? 'Get started by adding your first member' : ''}
          </p>
          {tab === 'all' && !search && (
            <Link
              href="/users/add"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-[#00E676] rounded-xl text-sm font-black hover:bg-gray-900 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add First Member
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {filtered.map(u => (
            <motion.div
              key={u._id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            >
              <UserCard
                id={u._id}
                name={u.name}
                email={u.email}
                subscription={u.subscription}
                isInactive={inactiveIds.has(u._id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
