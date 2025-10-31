 'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import ProgressChart from '@/components/user/ProgressChart';

export default function ProgressPage() {
  const [completed, setCompleted] = useState(3);
  const total = 6;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Progress</h1>

      <Card>
        <CardHeader title="Today's Progress" subtitle="Exercise completion and active days" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{Math.round((completed / total) * 100)}%</p>
              <p className="text-sm text-gray-500">Daily Progress</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">{completed}</p>
              <p className="text-sm text-gray-500">Exercises Completed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">5</p>
              <p className="text-sm text-gray-500">Active Days</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent Activity" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>Completed: Barbell Bench Press</li>
                <li>Logged meal: Breakfast (+689 kcal)</li>
                <li>Completed: Incline Dumbbell Press</li>
              </ul>
            </div>
            <div>
              <ProgressChart />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
