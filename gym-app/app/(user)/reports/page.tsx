'use client';

import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Link from 'next/link';
import { CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Generate last 6 months
  const months = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      name: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Monthly Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Workout Reports" subtitle="View your monthly workout stats" />
          <CardBody>
            <div className="space-y-2">
              {months.map(m => (
                <Link
                  key={`workout-${m.year}-${m.month}`}
                  href={`/reports/workout/${m.year}/${m.month}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  <ChartBarIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">{m.name}</span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Diet Reports" subtitle="View your monthly nutrition stats" />
          <CardBody>
            <div className="space-y-2">
              {months.map(m => (
                <Link
                  key={`diet-${m.year}-${m.month}`}
                  href={`/reports/diet/${m.year}/${m.month}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  <CalendarIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">{m.name}</span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
