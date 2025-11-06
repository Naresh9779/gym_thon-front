'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Link from 'next/link';

interface Props {
  params: Promise<{ year: string; month: string }>;
}

interface WorkoutReport {
  _id: string;
  year: number;
  month: number;
  completedWorkouts: number;
  totalWorkouts: number;
  adherenceScore: number;
  avgDuration: number;
  generatedAt: string;
}

export default function MonthlyWorkoutReportPage({ params }: Props) {
  const { year, month } = use(params);
  const { accessToken } = useAuth();
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = accessToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reports/workout/monthly/${year}/${month}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        
        if (json.ok) {
          setReport(json.data.report);
        } else {
          setError(json.error?.message || 'Failed to load report');
        }
      } catch (e) {
        setError('Failed to fetch report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [year, month, accessToken]);

  const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  if (loading) return <div className="p-6">Loading report...</div>;
  if (error || !report) return <div className="p-6 text-red-600">{error || 'Report not found'}</div>;

  const completionRate = report.totalWorkouts > 0 
    ? Math.round((report.completedWorkouts / report.totalWorkouts) * 100) 
    : 0;

  const avgMinutes = Math.round(report.avgDuration / 60);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Workout Report - {monthName}</h1>
        <Link href="/reports" className="text-sm text-green-600 hover:text-green-700">
          ← Back to Reports
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="Completed Workouts" />
          <CardBody>
            <div className="text-center">
              <p className="text-5xl font-bold text-green-600">{report.completedWorkouts}</p>
              <p className="text-sm text-gray-500 mt-2">out of {report.totalWorkouts} planned</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Adherence Score" />
          <CardBody>
            <div className="text-center">
              <p className="text-5xl font-bold">{report.adherenceScore}%</p>
              <p className="text-sm text-gray-500 mt-2">completion rate</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Avg Duration" />
          <CardBody>
            <div className="text-center">
              <p className="text-5xl font-bold">{avgMinutes}</p>
              <p className="text-sm text-gray-500 mt-2">minutes per workout</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Monthly Summary" />
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Total Workouts</span>
              <span className="font-medium">{report.totalWorkouts}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Completed</span>
              <span className="font-medium text-green-600">{report.completedWorkouts}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Missed</span>
              <span className="font-medium text-red-600">{report.totalWorkouts - report.completedWorkouts}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Avg Duration</span>
              <span className="font-medium">{avgMinutes} min</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Insights" />
        <CardBody>
          <div className="space-y-3 text-sm">
            {report.adherenceScore >= 80 && (
              <p className="text-green-600">🎉 Excellent! You completed {report.adherenceScore}% of your planned workouts this month.</p>
            )}
            {report.adherenceScore >= 60 && report.adherenceScore < 80 && (
              <p className="text-yellow-600">👍 Good job! You completed {report.adherenceScore}% of your workouts. Try to stay more consistent next month.</p>
            )}
            {report.adherenceScore < 60 && (
              <p className="text-orange-600">💪 Keep pushing! Aim for at least 60% adherence next month for better results.</p>
            )}
            {avgMinutes > 0 && (
              <p className="text-gray-600">Your average workout lasted {avgMinutes} minutes.</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
