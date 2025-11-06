'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Link from 'next/link';

interface Props {
  params: Promise<{ year: string; month: string }>;
}

interface DietReport {
  _id: string;
  year: number;
  month: number;
  adherenceScore: number;
  avgDailyCalories: number;
  avgMacros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  totalDaysLogged: number;
  generatedAt: string;
}

export default function MonthlyDietReportPage({ params }: Props) {
  const { year, month } = use(params);
  const { accessToken } = useAuth();
  const [report, setReport] = useState<DietReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = accessToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reports/diet/monthly/${year}/${month}`,
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

  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const loggingRate = Math.round((report.totalDaysLogged / daysInMonth) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Diet Report - {monthName}</h1>
        <Link href="/reports" className="text-sm text-green-600 hover:text-green-700">
          ← Back to Reports
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="Days Logged" />
          <CardBody>
            <div className="text-center">
              <p className="text-5xl font-bold text-green-600">{report.totalDaysLogged}</p>
              <p className="text-sm text-gray-500 mt-2">out of {daysInMonth} days</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Adherence Score" />
          <CardBody>
            <div className="text-center">
              <p className="text-5xl font-bold">{report.adherenceScore}%</p>
              <p className="text-sm text-gray-500 mt-2">to target calories</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Avg Daily Calories" />
          <CardBody>
            <div className="text-center">
              <p className="text-5xl font-bold">{report.avgDailyCalories}</p>
              <p className="text-sm text-gray-500 mt-2">kcal per day</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Average Macros" subtitle="Daily macro intake average" />
        <CardBody>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Protein</p>
              <p className="text-3xl font-bold text-blue-600">{report.avgMacros.protein}g</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Carbs</p>
              <p className="text-3xl font-bold text-orange-600">{report.avgMacros.carbs}g</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Fats</p>
              <p className="text-3xl font-bold text-yellow-600">{report.avgMacros.fats}g</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Monthly Summary" />
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Days in Month</span>
              <span className="font-medium">{daysInMonth}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Days Logged</span>
              <span className="font-medium text-green-600">{report.totalDaysLogged}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Logging Rate</span>
              <span className="font-medium">{loggingRate}%</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Adherence Score</span>
              <span className="font-medium">{report.adherenceScore}%</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Avg Daily Calories</span>
              <span className="font-medium">{report.avgDailyCalories} kcal</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Insights" />
        <CardBody>
          <div className="space-y-3 text-sm">
            {loggingRate >= 80 && (
              <p className="text-green-600">🎉 Excellent tracking! You logged {loggingRate}% of days this month.</p>
            )}
            {loggingRate >= 50 && loggingRate < 80 && (
              <p className="text-yellow-600">👍 Good effort! Try to log your meals more consistently next month.</p>
            )}
            {loggingRate < 50 && (
              <p className="text-orange-600">📝 Consistent tracking is key to reaching your goals. Aim for at least 20 days next month!</p>
            )}
            {report.adherenceScore >= 90 && report.adherenceScore <= 110 && (
              <p className="text-green-600">🎯 Great adherence! You're staying close to your target calories.</p>
            )}
            {report.avgMacros.protein > 0 && (
              <p className="text-gray-600">Your average protein intake was {report.avgMacros.protein}g per day.</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
