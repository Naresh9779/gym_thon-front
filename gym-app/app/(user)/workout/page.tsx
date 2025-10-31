'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import ExerciseCard from '@/components/user/ExerciseCard';

interface WorkoutDay {
  day: string;
  exercises?: {
    name: string;
    sets: string;
    reps: string;
    rest: number;
    notes?: string;
  }[];
  isRestDay?: boolean;
}

export default function WorkoutPlanPage() {
  const [plan] = useState<{
    name: string;
    duration: string;
    description: string;
    days: WorkoutDay[];
  }>({
    name: "Muscle Building Program",
    duration: "4-week progressive strength training",
    description: "Program focused on hypertrophy",
    days: [
      {
        day: "Monday",
        exercises: [
          {
            name: "Barbell Bench Press",
            sets: "4",
            reps: "8-10",
            rest: 90,
            notes: "Focus on controlled tempo"
          },
          {
            name: "Incline Dumbbell Press",
            sets: "3",
            reps: "10-12",
            rest: 60
          },
          {
            name: "Cable Flyes",
            sets: "3",
            reps: "12-15",
            rest: 45
          },
          {
            name: "Tricep Dips",
            sets: "3",
            reps: "10-12",
            rest: 60
          }
        ]
      },
      {
        day: "Tuesday",
        exercises: [
          {
            name: "Squats",
            sets: "4",
            reps: "8-10",
            rest: 120,
            notes: "Focus on form"
          },
          {
            name: "Romanian Deadlifts",
            sets: "3",
            reps: "10-12",
            rest: 90
          },
          {
            name: "Leg Press",
            sets: "3",
            reps: "12-15",
            rest: 60
          },
          {
            name: "Calf Raises",
            sets: "4",
            reps: "15-20",
            rest: 45
          }
        ]
      },
      {
        day: "Wednesday",
        isRestDay: true
      }
      // Add more days as needed
    ]
  });

  const [selectedDay, setSelectedDay] = useState(plan.days[0].day);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader 
          title={plan.name}
          subtitle={plan.description}
        />
        <CardBody>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {plan.duration}
            </span>
          </div>
        </CardBody>
      </Card>

      <div className="flex space-x-4 overflow-x-auto pb-2">
        {plan.days.map((day) => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day)}
            className={`px-4 py-2 rounded-lg flex-shrink-0 ${
              selectedDay === day.day
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {day.day}
          </button>
        ))}
      </div>


      <div className="space-y-4">
        {plan.days
          .find((day) => day.day === selectedDay)
          ?.exercises?.map((exercise, index) => (
            <ExerciseCard
              key={index}
              name={exercise.name}
              sets={exercise.sets}
              reps={exercise.reps}
              rest={exercise.rest}
            />
          ))}
        {plan.days.find((day) => day.day === selectedDay)?.isRestDay && (
          <Card>
            <CardBody>
              <p className="text-center text-gray-500">
                Rest day - no exercises scheduled
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
