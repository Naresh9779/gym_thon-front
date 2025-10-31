import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data?: { date: string; value: number }[]
}

export default function ProgressChart({ data = [] }: Props) {
  const sample = data.length ? data : [
    { date: 'Mon', value: 2 },
    { date: 'Tue', value: 4 },
    { date: 'Wed', value: 6 },
    { date: 'Thu', value: 5 },
    { date: 'Fri', value: 7 }
  ]

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <h4 className="font-medium mb-2">Progress</h4>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={sample}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
