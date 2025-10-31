"use client";

import Link from 'next/link';
import { BoltIcon, FireIcon } from '@heroicons/react/24/outline';

export default function GenerateIndexPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Generate Plans</h2>
          <p className="text-gray-600 mt-0.5">Choose what you want to create</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/generate/workout" className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 p-5 text-white shadow hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <BoltIcon className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-semibold">Workout Plan</h3>
              <p className="text-white/90 text-sm">Create a personalized training program</p>
            </div>
          </div>
        </Link>

        <Link href="/generate/diet" className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-600 to-red-600 p-5 text-white shadow hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <FireIcon className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-semibold">Diet Plan</h3>
              <p className="text-white/90 text-sm">Create a personalized nutrition plan</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
