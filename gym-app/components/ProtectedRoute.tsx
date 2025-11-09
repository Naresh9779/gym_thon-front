"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
      return;
    }

    // Check subscription for user-facing pages (not admin pages)
    if (!loading && user && user.role !== 'admin') {
      const subscriptionRestrictedPages = [
        '/workout',
        '/home',
        '/today-workout',
        '/today-diet',
        '/today-meal',
        '/plans',
        '/progress'
      ];

      const isRestricted = subscriptionRestrictedPages.some(page => pathname?.startsWith(page));
      
      if (isRestricted && user.subscription) {
        const now = new Date();
        const endDate = user.subscription.endDate ? new Date(user.subscription.endDate) : null;
        
        // Check if subscription is expired
        if (!endDate || now > endDate || user.subscription.status === 'expired') {
          // Redirect to profile page with expired message
          router.push('/profile?subscription=expired');
          return;
        }
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-green-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
