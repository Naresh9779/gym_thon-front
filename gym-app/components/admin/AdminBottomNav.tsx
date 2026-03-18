"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, ClipboardList, Users, Settings2 } from "lucide-react";

const tabs = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { href: "/analytics",     icon: BarChart3,       label: "Analytics" },
  { href: "/requests",      icon: ClipboardList,   label: "Requests"  },
  { href: "/users",         icon: Users,           label: "Users"     },
  { href: "/customization", icon: Settings2,       label: "Custom"    },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 sm:hidden safe-area-pb">
      <div className="flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                active ? "text-[#00E676]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
