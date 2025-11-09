'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import ExerciseCard from '@/components/user/ExerciseCard';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlan';
import { useUserProgress } from '@/hooks/useUserProgress';

export default function TodayWorkoutPage() {
  const { plans: workoutPlans, loading: workoutLoading } = useWorkoutPlans();
  const { logWorkout, stats, logs } = useUserProgress();
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [isLogging, setIsLogging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [workoutAlreadyLogged, setWorkoutAlreadyLogged] = useState(false);

  const latestWorkout = workoutPlans?.[0];

  // Get today's workout using plan startDate and index fallback
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];
  let todayWorkout: any = null;
  if (latestWorkout?.startDate && Array.isArray(latestWorkout?.days) && latestWorkout.days.length > 0) {
    const start = new Date(latestWorkout.startDate);
    start.setHours(0,0,0,0);
    const now = new Date();
    now.setHours(0,0,0,0);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      const idx = diffDays % latestWorkout.days.length;
      todayWorkout = latestWorkout.days[idx];
    }
  }

  const exercises = todayWorkout?.exercises || [];
  const isRestDay = !exercises || exercises.length === 0;

  // Check if workout is already logged today
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLog = logs.find(log => {
      const logDate = new Date(log.date).toISOString().slice(0, 10);
      return logDate === today && log.workout && (log.workout.completedExercises || 0) > 0;
    });
    
    if (todayLog) {
      setWorkoutAlreadyLogged(true);
      // Mark exercises as completed based on logged data
      if (todayLog.workout && exercises.length > 0) {
        const completed = todayLog.workout.completedExercises || 0;
        const newSet = new Set<number>();
        for (let i = 0; i < Math.min(completed, exercises.length); i++) {
          newSet.add(i);
        }
        setCompletedExercises(newSet);
      }
    } else {
      setWorkoutAlreadyLogged(false);
    }
  }, [logs, exercises.length]);

  const toggleExercise = (index: number) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedExercises(newCompleted);
  };

  const handleCompleteWorkout = async () => {
    if (isRestDay || exercises.length === 0) return;
    
    setIsLogging(true);
    const success = await logWorkout(
      todayWorkout?.day || todayName,
      completedExercises.size,
      exercises.length
    );
    
    setIsLogging(false);
    if (success) {
      setWorkoutAlreadyLogged(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const completionPercentage = exercises.length > 0 
    ? Math.round((completedExercises.size / exercises.length) * 100)
    : 0;

  if (workoutLoading) {
    return (
      <div className="space-y-6">
        <Card><CardBody><p className="text-center py-8 text-gray-500">Loading today's workout...</p></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Today's Workout</h1>
        <p className="text-gray-600">{todayWorkout?.day || todayName}</p>
      </div>

      {/* Progress Card */}
      {!isRestDay && exercises.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Workout Progress</p>
                <p className="text-2xl font-bold text-gray-800">
                  {completedExercises.size} / {exercises.length} exercises
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{completionPercentage}%</div>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-green-800">Workout logged successfully!</p>
            <p className="text-sm text-green-700">Keep up the great work 💪</p>
          </div>
        </div>
      )}

      {/* Workout Content */}
      {isRestDay ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-7xl mb-4">😴</div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">Rest Day</h3>
              <p className="text-gray-600">No workout scheduled for today. Take time to recover and recharge!</p>
            </div>
          </CardBody>
        </Card>
      ) : exercises.length > 0 ? (
        <>
          <div className="space-y-4">
            {exercises.map((exercise: any, index: number) => {
              const isCompleted = completedExercises.has(index);
              return (
                <div key={index} className="relative">
                  <div 
                    onClick={() => toggleExercise(index)}
                    className={`cursor-pointer transition-all ${isCompleted ? 'opacity-60' : ''}`}
                  >
                    <Card className={`${isCompleted ? 'border-2 border-green-500 bg-green-50' : 'hover:shadow-md'}`}>
                      <CardBody>
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 pt-1">
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              isCompleted 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-300 hover:border-green-400'
                            }`}>
                              {isCompleted && (
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>

                          {/* Exercise Info */}
                          <div className="flex-1">
                            <h3 className={`font-bold text-lg mb-1 ${isCompleted ? 'line-through text-gray-600' : 'text-gray-800'}`}>
                              {exercise.name}
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                                {exercise.sets} sets
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {exercise.reps} reps
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {exercise.rest}s rest
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Complete Workout Button */}
          <div className="sticky bottom-6 flex justify-center">
            <button
              onClick={handleCompleteWorkout}
              disabled={isLogging || completedExercises.size === 0 || workoutAlreadyLogged}
              className={`bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-3 ${
                completedExercises.size === 0 || isLogging || workoutAlreadyLogged
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 hover:from-green-600 hover:to-green-700'
              }`}
            >
              {workoutAlreadyLogged ? (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Workout Already Logged Today
                </>
              ) : isLogging ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete Workout ({completedExercises.size}/{exercises.length})
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-7xl mb-4">💪</div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">No Workout Plan Yet</h3>
              <p className="text-gray-600">Contact your trainer to get a personalized workout plan.</p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
