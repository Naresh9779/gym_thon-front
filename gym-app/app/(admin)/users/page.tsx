'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import UserCard from '@/components/admin/UserCard';
import { useAuth } from '@/hooks/useAuth';
import { Users, UserPlus } from 'lucide-react';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = getAccessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) setUsers(json.data.users || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [getAccessToken]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">{loading ? '...' : `${users.length} registered`}</p>
          </div>
        </div>
        <Link
          href="/users/add"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </Link>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No users yet</h3>
          <p className="text-gray-500 mb-5">Get started by adding your first user</p>
          <Link
            href="/users/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add First User
          </Link>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {users.map((u) => (
            <motion.div
              key={u._id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            >
              <UserCard id={u._id} name={u.name} email={u.email} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
