"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface Props {
  id?: string | number;
  name: string;
  email?: string;
  subscription?: { status?: string; endDate?: string; plan?: string };
  isInactive?: boolean;
}

export default function UserCard({ id, name, email, subscription, isInactive }: Props) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const statusColor =
    subscription?.status === 'active' ? 'bg-[#00E676]/10 text-[#00E676]' :
    subscription?.status === 'expired' ? 'bg-red-100 text-red-500' :
    'bg-gray-100 text-gray-400';

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -2 }}
      className={`bg-white rounded-2xl border p-4 hover:shadow-sm transition-all ${isInactive ? 'border-blue-100' : 'border-gray-100 hover:border-gray-200'}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-[#00E676] text-sm font-black flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 truncate">{name}</p>
          {email && <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>}
          {subscription?.status && (
            <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-1 ${statusColor}`}>
              {subscription.status}
            </span>
          )}
        </div>
        {id && (
          <Link
            href={`/users/${id}`}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-50 hover:bg-black flex items-center justify-center text-gray-400 hover:text-[#00E676] transition-all"
            aria-label={`View ${name}`}
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
