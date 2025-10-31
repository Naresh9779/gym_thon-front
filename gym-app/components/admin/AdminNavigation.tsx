"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HomeIcon, ChartBarIcon, PlusCircleIcon, UsersIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AdminNavigation() {
  const [open, setOpen] = useState(false);

  const adminNav = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Generate', href: '/generate', icon: PlusCircleIcon },
    { name: 'Users', href: '/users', icon: UsersIcon },
  ];

  return (
    <>
      <header className="bg-white shadow-sm">
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
              <div className="flex items-center">
                <Image src="/logo.svg" alt="FitFlow" width={36} height={36} />
                <span className="ml-2 text-xl font-bold text-gray-800">Admin</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center space-x-4">
              {adminNav.map((n) => {
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
      <div className={`fixed inset-0 z-40 transition-opacity ${open ? 'visible' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/40 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <aside className={`absolute left-0 top-0 bottom-0 w-72 bg-white shadow-md transform ${open ? 'translate-x-0' : '-translate-x-full'} transition-transform`}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Image src="/logo.svg" alt="FitFlow" width={40} height={40} />
              <div>
                <h3 className="text-lg font-bold">FitFlow</h3>
                <p className="text-sm text-gray-500">Admin</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="ml-auto p-1 rounded hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <nav className="space-y-2">
              {adminNav.map((item) => {
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

            <div className="mt-6">
              <button
                onClick={() => setOpen(false)}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
