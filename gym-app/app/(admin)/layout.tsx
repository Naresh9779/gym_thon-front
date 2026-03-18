"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    } else if (!loading && user && user.role !== 'admin') {
      router.push('/home');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#00E676] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Loading</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <AdminNavigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {children}
      </main>
      <AdminBottomNav />
    </div>
  );
}
