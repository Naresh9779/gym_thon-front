'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import ExerciseCard from '@/components/user/ExerciseCard';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  completed: boolean;
}

export default function WorkoutDayPage() {
  const params = useParams();
  const day = params.day as string;
  const dayName = day.charAt(0).toUpperCase() + day.slice(1);
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [exercises, setExercises] = useState<Exercise[]>([
    {
      name: 'Barbell Bench Press',
      sets: 4,
      reps: '8-10',
      rest: 90,
      completed: false
    },
    {
      name: 'Incline Dumbbell Press',
      sets: 3,
      reps: '10-12',
      rest: 60,
      completed: false
    },
    {
      name: 'Cable Flyes',
      sets: 3,
      reps: '12-15',
      rest: 60,
      completed: false
    },
    {
      name: 'Tricep Dips',
      sets: 3,
      reps: '8-10',
      rest: 60,
      completed: false
    },
    {
      name: 'Overhead Tricep Extension',
      sets: 3,
      reps: '10-12',
      rest: 45,
      completed: false
    }
  ]);

  const toggleExercise = (index: number) => {
    setExercises(exercises.map((ex, i) => 
      i === index ? { ...ex, completed: !ex.completed } : ex
    ));
  };

  const completedCount = exercises.filter(ex => ex.completed).length;
  const progressPercentage = Math.round((completedCount / exercises.length) * 100);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setElapsedTime((time) => time + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">{dayName} Workout</h1>
        <p className="text-gray-600 mt-2">Chest & Triceps</p>
      </div>

      {/* Timer Card */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Workout Duration</p>
              <p className="text-3xl font-bold font-mono text-green-600">{formatTime(elapsedTime)}</p>
            </div>
            <button 
              onClick={() => setIsActive(!isActive)}
              className={`p-3 rounded-full ${isActive ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}
            >
              {isActive ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Progress Card */}
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Today's Progress</span>
            <span className="text-sm text-gray-600">{completedCount}/{exercises.length} exercises</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardBody>
      </Card>

      {/* Exercise List */}
      <div className="space-y-4">
        {exercises.map((exercise, index) => (
          <ExerciseCard
            key={index}
            name={exercise.name}
            sets={String(exercise.sets)}
            reps={exercise.reps}
            rest={exercise.rest}
            completed={exercise.completed}
            onToggle={() => toggleExercise(index)}
          />
        ))}
      </div>

      {/* Complete Workout Button */}
      {completedCount === exercises.length && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <button className="bg-green-500 text-white px-8 py-4 rounded-full shadow-lg hover:bg-green-600 transition-colors font-semibold">
            Complete Workout ✓
          </button>
        </div>
      )}
    </div>
  );
}
