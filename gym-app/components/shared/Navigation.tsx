"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { HomeIcon, ClipboardIcon, ChartBarIcon, ChartPieIcon, FireIcon, Squares2X2Icon, Cog6ToothIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const userNav = [
    { name: 'Home', href: '/home', icon: HomeIcon },
    { name: 'Workout', href: '/workout', icon: FireIcon },
    { name: 'Progress', href: '/progress', icon: ChartBarIcon },
    { name: 'Reports', href: '/reports', icon: ChartPieIcon },
    { name: 'Plans', href: '/plans', icon: Squares2X2Icon },
    { name: 'Profile', href: '/profile', icon: Cog6ToothIcon },
  ];

  return (
    <>
  <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6 text-gray-700" />
              </button>
              <Link
                href={(user?.role === 'admin') ? '/dashboard' : '/home'}
                aria-label="Go to home"
                className="flex items-center hover:opacity-90"
              >
                <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-800">FitFlow</span>
              </Link>
            </div>

            <div className="hidden sm:flex items-center space-x-4">
              {userNav.map((n) => {
                const Icon = n.icon;
                return (
                  <Link key={n.name} href={n.href} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <Icon className="w-4 h-4 text-green-600" />
                    {n.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar overlay */}
  <div className={`fixed inset-0 z-50 transition-opacity ${open ? 'visible' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/40 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <aside className={`absolute left-0 top-0 bottom-0 w-72 bg-white shadow-md transform ${open ? 'translate-x-0' : '-translate-x-full'} transition-transform`}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">FitFlow</h3>
                <p className="text-sm text-gray-500">{user?.name || user?.email || 'User'}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 rounded hover:bg-gray-100 flex-shrink-0">
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <nav className="space-y-2">
              {userNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href} 
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100"
                  >
                    <Icon className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-800">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 space-y-2">
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-lg hover:bg-red-100 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
