"use client"
import React, { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

export default function PlanGenerator() {
  const [name, setName] = useState('')
  const [type, setType] = useState('workout')

  const handleCreate = () => {
    // UI-only: in future hook up to API
    alert(`Create ${type} plan: ${name}`)
    setName('')
  }

  return (
    <Card>
      <CardHeader title="Generate Plan" subtitle="Create quick plans for clients" />
      <CardBody>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Plan name"
            className="w-full border rounded px-3 py-2"
          />

          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="workout">Workout</option>
            <option value="diet">Diet</option>
          </select>

          <div className="flex justify-end">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
