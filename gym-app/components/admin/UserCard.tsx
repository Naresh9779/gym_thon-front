"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, ArrowRight } from 'lucide-react';

interface Props {
  id?: string | number;
  name: string;
  email?: string;
}

export default function UserCard({ id, name, email }: Props) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          {email && (
            <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3" /> {email}
            </p>
          )}
        </div>
        <Link
          href={`/users/${id}`}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 hover:bg-indigo-50 flex items-center justify-center text-gray-400 hover:text-indigo-500 transition-colors"
          aria-label={`View ${name}`}
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}
