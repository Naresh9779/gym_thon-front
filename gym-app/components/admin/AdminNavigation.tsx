"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { Zap, LayoutDashboard, BarChart3, ClipboardList, Users, X, Menu, Shield, CalendarOff, Settings2 } from "lucide-react";

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default function AdminNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const adminNav = [
    { name: "Dashboard",      href: "/dashboard",      icon: LayoutDashboard },
    { name: "Analytics",      href: "/analytics",      icon: BarChart3 },
    { name: "Requests",       href: "/requests",       icon: ClipboardList },
    { name: "Leave",          href: "/leave",          icon: CalendarOff },
    { name: "Users",          href: "/users",          icon: Users },
    { name: "Customization",  href: "/customization",  icon: Settings2 },
  ];

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/");
  };

  const rawInitials = getInitials(user?.name);
  const initials = rawInitials === '?' ? 'A' : rawInitials;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Left: hamburger + logo (logo hidden on mobile) */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
              <Link href="/dashboard" className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-[#00E676]" />
                </div>
                <span className="text-base font-black text-gray-900">FitFlow</span>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">ADMIN</span>
              </Link>
            </div>

            {/* Center: nav links on desktop */}
            <nav className="hidden sm:flex items-center gap-1">
              {adminNav.map((n) => {
                const Icon = n.icon;
                const isActive = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.name}
                    href={n.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                      isActive ? "bg-black text-[#00E676]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {n.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right: avatar */}
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-[#00E676] text-xs font-black">
                {initials}
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-700 max-w-[80px] truncate">{user?.name || "Admin"}</span>
                <span className="flex items-center gap-0.5 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md font-bold">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              </div>
            </button>

          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${open ? "visible" : "invisible pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#00E676]" />
                </div>
                <span className="font-black text-gray-900">FitFlow</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* User badge */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-[#00E676] font-black text-sm flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 text-sm truncate">{user?.name || "Admin"}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#00E676] bg-black px-2 py-1 rounded-lg font-black flex-shrink-0">
                <Shield className="w-3 h-3" /> Admin
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive ? "bg-black text-[#00E676] font-black" : "text-gray-700 hover:bg-gray-100 font-bold"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{item.name}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00E676]" />}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
            >
              <LogoutIcon /> Sign Out
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
