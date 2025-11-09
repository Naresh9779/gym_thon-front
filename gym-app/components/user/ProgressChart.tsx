import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data?: { date: string; workouts?: number; meals?: number; value?: number }[]
}

export default function ProgressChart({ data = [] }: Props) {
  const [view, setView] = useState<'combined' | 'workouts' | 'meals'>('combined')
  
  const sample = data.length ? data : [
    { date: 'Mon', workouts: 1, meals: 3, value: 5 },
    { date: 'Tue', workouts: 1, meals: 2, value: 4 },
    { date: 'Wed', workouts: 0, meals: 3, value: 3 },
    { date: 'Thu', workouts: 1, meals: 3, value: 5 },
    { date: 'Fri', workouts: 1, meals: 4, value: 6 }
  ]

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Progress Trends</h4>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setView('combined')}
            className={`px-2 py-1 rounded ${view === 'combined' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Combined
          </button>
          <button
            onClick={() => setView('workouts')}
            className={`px-2 py-1 rounded ${view === 'workouts' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Workouts
          </button>
          <button
            onClick={() => setView('meals')}
            className={`px-2 py-1 rounded ${view === 'meals' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Meals
          </button>
        </div>
      </div>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={sample}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {view === 'combined' && (
              <>
                <Legend />
                <Line type="monotone" dataKey="workouts" stroke="#3B82F6" strokeWidth={2} name="Workouts" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="meals" stroke="#A855F7" strokeWidth={2} name="Meals" dot={{ r: 3 }} />
              </>
            )}
            {view === 'workouts' && (
              <Line type="monotone" dataKey="workouts" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
            )}
            {view === 'meals' && (
              <Line type="monotone" dataKey="meals" stroke="#A855F7" strokeWidth={2} dot={{ r: 4 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
