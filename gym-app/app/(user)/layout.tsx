"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navigation from '@/components/shared/Navigation';
import BottomNav from '@/components/shared/BottomNav';
import SubscriptionExpired from '@/components/user/SubscriptionExpired';
import { useAuth } from '@/hooks/useAuth';

// These pages remain accessible even with an expired/missing subscription
const ALLOWED_WHEN_EXPIRED = ['/profile', '/reports', '/scan', '/my-attendance'];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    } else if (!loading && user && user.role === 'admin') {
      router.push('/dashboard');
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

  if (!user || user.role === 'admin') return null;

  // Expired = no active subscription OR status explicitly 'expired'
  const isExpired = !user.subscription || user.subscription.status === 'expired';
  const isAllowedRoute = ALLOWED_WHEN_EXPIRED.some(p => pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 py-5 pb-24 sm:pb-8">
        {isExpired && !isAllowedRoute ? (
          <SubscriptionExpired endDate={user.subscription?.endDate} />
        ) : (
          children
        )}
      </main>
      <BottomNav />
    </div>
  );
}
