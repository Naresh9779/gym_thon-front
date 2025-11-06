"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ExerciseCard from '@/components/user/ExerciseCard';
import WorkoutTimer from '@/components/user/WorkoutTimer';

export default function WorkoutPlanPage() {
  const searchParams = useSearchParams();
  const autoStart = searchParams.get('start') === 'true';
  const { plans, loading, error, refresh } = useWorkoutPlans();
  const [showTimer, setShowTimer] = useState(false);

  const latest = plans[0];
  const days: any[] = latest?.days || [];
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [todayIndex, setTodayIndex] = useState<number>(0);
  const lockedToToday = autoStart; // when coming from Home, lock to today's workout

  // Auto-select and start today's workout
  useEffect(() => {
    if (days.length > 0) {
      // Compute based on plan startDate
      if (latest?.startDate) {
        const start = new Date(latest.startDate);
        start.setHours(0,0,0,0);
        const now = new Date();
        now.setHours(0,0,0,0);
        const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000*60*60*24));
        if (diffDays >= 0) {
          const idx = diffDays % days.length;
          setTodayIndex(idx);
          setSelectedIndex(idx);
          if (autoStart && days[idx]?.exercises?.length > 0) {
            setShowTimer(true);
          }
        }
      }
    }
  }, [days, autoStart, latest?.startDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Workout Plan</h1>
          <p className="text-gray-600 mt-1">Your personalized training program</p>
        </div>
        <Button variant="secondary" onClick={()=>refresh()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading plans...
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {!loading && plans.length === 0 && (
        <Card className="p-12 text-center bg-gradient-to-br from-blue-50 to-white">
          <div className="text-blue-400 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Workout Plan Generated Yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your trainer hasn't created a personalized workout plan for you yet. Please contact your trainer to get started with a customized training program.
          </p>
          <Button 
            variant="primary" 
            className="bg-green-500 hover:bg-green-600"
            onClick={() => window.location.href = 'mailto:trainer@fitflow.com?subject=Workout Plan Request'}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Trainer
          </Button>
        </Card>
      )}

      {latest && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{latest.name || 'Workout Cycle'}</h2>
            <span className="text-sm text-gray-500">{days.length} days</span>
          </div>

          {/* Day selector - clickable to view all days */}
          {!lockedToToday && (
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Training Days - Select a Day to View</h3>
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {days.map((d:any, idx:number)=> {
                  const isCurrent = idx === todayIndex;
                  const isCompleted = (idx < todayIndex);
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`px-6 py-3 rounded-lg flex-shrink-0 font-medium transition-all cursor-pointer select-none border ${
                        isSelected
                          ? 'bg-green-500 text-white border-green-600 shadow-lg'
                          : isCurrent
                          ? 'bg-blue-100 text-blue-700 border-blue-300'
                          : isCompleted
                          ? 'bg-gray-200 text-gray-600 border-gray-300'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                      title={isCompleted ? 'Completed' : isCurrent ? 'Today' : 'Upcoming'}
                    >
                      {d.day || `Day ${idx+1}`}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">Click any day to view its exercises. Today is highlighted in blue.</p>
            </Card>
          )}

          {/* Timer only when launched from Home (start=true) and for today's day */}
          {lockedToToday && showTimer && days[selectedIndex] && (days[selectedIndex].exercises?.length > 0) && (
            <WorkoutTimer
              exercises={days[selectedIndex].exercises || []}
              workoutId={latest._id}
              day={days[selectedIndex]?.day || `Day ${selectedIndex + 1}`}
              onComplete={() => {
                setShowTimer(false);
                alert('Workout completed! Great job! 💪');
              }}
              onStop={() => setShowTimer(false)}
            />
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">
                {days[selectedIndex]?.day || `Day ${selectedIndex+1}`} Workout
              </h3>
              {/* Read-only: no Start button unless lockedToToday (timer above) */}
            </div>
            {showTimer && lockedToToday ? (
              // Timer is shown above, hide exercises list
              null
            ) : days[selectedIndex]?.exercises && days[selectedIndex].exercises.length > 0 ? (
              <div className="space-y-4">
                {days[selectedIndex].exercises.map((ex:any, i:number)=> (
                  <ExerciseCard key={i} name={ex.name} sets={ex.sets} reps={ex.reps} rest={ex.rest} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rest Day / No Exercises</h3>
                <p className="text-gray-600">No exercises scheduled for this day</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
