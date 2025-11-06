'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import UserCard from '@/components/admin/UserCard';
import { useAuth } from '@/hooks/useAuth';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const { accessToken } = useAuth();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = accessToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) setUsers(json.data.users || []);
      } catch (e) {
        console.error('Failed to load admin users', e);
      }
    }
    fetchUsers();
  }, [accessToken]);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Users</h2>
          <p className="text-gray-600 mt-0.5">{users.length} total users</p>
        </div>
        <Link 
          href="/users/add"
          className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow"
        >
          + Add New User
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-gray-400 text-5xl mb-3">👥</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1.5">No users yet</h3>
          <p className="text-gray-500 mb-3">Get started by adding your first user</p>
          <Link 
            href="/users/add"
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow"
          >
            Add First User
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {users.map((u) => (
            <UserCard key={u._id} id={u._id} name={u.name} email={u.email} />
          ))}
        </div>
      )}
    </div>
  );
}
