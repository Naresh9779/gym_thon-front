"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/utils';
import {
  HomeIcon,
  ChartBarIcon,
  ChartPieIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  ChartPieIcon as ChartPieIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/');
  };

  const userNav = [
    { name: 'Home',     href: '/home',     icon: HomeIcon,       iconSolid: HomeIconSolid },
    { name: 'Plans',    href: '/plans',    icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
    { name: 'Progress', href: '/progress', icon: ChartBarIcon,   iconSolid: ChartBarIconSolid },
    { name: 'Reports',  href: '/reports',  icon: ChartPieIcon,   iconSolid: ChartPieIconSolid },
    { name: 'Profile',  href: '/profile',  icon: Cog6ToothIcon,  iconSolid: Cog6ToothIconSolid },
  ];

  const initials = getInitials(user?.name);

  const subscriptionBadgeColor =
    user?.subscription?.status === 'active'
      ? 'bg-green-100 text-green-700'
      : user?.subscription?.status === 'trial'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-600';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bars3Icon className="w-6 h-6 text-gray-700" />
              </button>
              <Link
                href={user?.role === 'admin' ? '/dashboard' : '/home'}
                className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">FitFlow</span>
              </Link>
            </div>

            {/* Center: Desktop nav */}
            <nav className="hidden sm:flex items-center space-x-1">
              {userNav.map((n) => {
                const isActive = pathname === n.href || pathname.startsWith(n.href + '/');
                const Icon = isActive ? n.iconSolid : n.icon;
                return (
                  <Link
                    key={n.name}
                    href={n.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
                    {n.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right: User avatar */}
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                {user?.name || 'User'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar overlay */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'visible' : 'invisible pointer-events-none'}`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />

        {/* Drawer */}
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-bold text-gray-900">FitFlow</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${subscriptionBadgeColor}`}>
                {user?.subscription?.status?.toUpperCase() || 'FREE'}
              </span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {userNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = isActive ? item.iconSolid : item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
                  <span className="text-sm">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 transition-all font-medium text-sm"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
