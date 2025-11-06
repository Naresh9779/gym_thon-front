"use client";
import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useUserProgress } from '@/hooks/useUserProgress';

interface Exercise {
  name: string;
  sets: number;
  reps: number | string;
  rest: number;
}

interface WorkoutTimerProps {
  exercises: Exercise[];
  onComplete: () => void;
  onStop: () => void;
  workoutId?: string;
  day?: string;
}

export default function WorkoutTimer({ exercises, onComplete, onStop, workoutId, day }: WorkoutTimerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [resting, setResting] = useState(false);
  const [restSecs, setRestSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const { logWorkout } = useUserProgress();

  const ex = exercises[currentIdx];
  const progress = ((currentIdx / exercises.length) * 100).toFixed(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSecs(t => t + 1);
      if (resting && restSecs > 0) {
        setRestSecs(t => t - 1);
      } else if (resting && restSecs === 0) {
        setResting(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [resting, restSecs]);

  const handleSetDone = () => {
    if (currentSet < ex.sets) {
      setCurrentSet(currentSet + 1);
      setResting(true);
      setRestSecs(ex.rest);
    } else {
      if (currentIdx < exercises.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setCurrentSet(1);
        setResting(true);
        setRestSecs(ex.rest);
      } else {
        // Workout complete - log progress
        handleWorkoutComplete();
        onComplete();
      }
    }
  };

  const handleWorkoutComplete = async () => {
    try {
      // day is the day label (e.g., "Day 1"), completedExercises = total exercises
      await logWorkout(
        day || 'Day 1',
        exercises.length,
        exercises.length,
        totalSecs
      );
    } catch (e) {
      console.error('Failed to log workout progress:', e);
    }
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-2 border-green-300">
      <div className="space-y-4">
        <div className="flex justify-between">
          <div>
            <h3 className="text-2xl font-bold">Workout Active</h3>
            <p className="text-gray-600">Exercise {currentIdx + 1} / {exercises.length}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">{fmt(totalSecs)}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </div>

        <div className="h-2 bg-gray-200 rounded-full">
          <div className="h-full bg-green-500 rounded-full" style={{width: `${progress}%`}} />
        </div>

        <div className="bg-white rounded-lg p-6 shadow border">
          <div className="flex justify-between mb-4">
            <div>
              <h4 className="text-xl font-bold">{ex.name}</h4>
              <p>Set {currentSet} of {ex.sets}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{ex.reps}</div>
              <div className="text-sm">reps</div>
            </div>
          </div>

          {resting ? (
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-orange-500">{restSecs}</div>
              <p className="text-gray-600 my-2">seconds rest</p>
              <Button size="sm" onClick={() => setResting(false)}>Skip</Button>
            </div>
          ) : (
            <Button className="w-full bg-green-500 hover:bg-green-600 py-3 font-bold" onClick={handleSetDone}>
              ✓ Complete Set
            </Button>
          )}
        </div>

        <Button variant="danger" className="w-full" onClick={onStop}>Stop Workout</Button>
      </div>
    </Card>
  );
}
