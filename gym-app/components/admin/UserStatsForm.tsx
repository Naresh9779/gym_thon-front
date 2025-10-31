"use client"
import React, { useState } from 'react'
import { CalendarIcon, ScaleIcon, BeakerIcon } from '@heroicons/react/24/outline'

interface Props {
  initial?: { age?: number; weight?: number; bodyFat?: number }
}

export default function UserStatsForm({ initial }: Props) {
  const [age, setAge] = useState(initial?.age ?? 30)
  const [weight, setWeight] = useState(initial?.weight ?? 75)
  const [bodyFat, setBodyFat] = useState(initial?.bodyFat ?? 18)

  const handleSave = () => {
    alert(`Saved: age=${age}, weight=${weight}, bodyFat=${bodyFat}`)
  }

  return (
    <div className="space-y-4 bg-white p-4 rounded-xl shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
        <div className="relative">
          <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            value={age}
            onChange={e => setAge(Number(e.target.value))}
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
        <div className="relative">
          <ScaleIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(Number(e.target.value))}
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
            step={0.1}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Body Fat (%)</label>
        <div className="relative">
          <BeakerIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            value={bodyFat}
            onChange={e => setBodyFat(Number(e.target.value))}
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
            step={0.1}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 focus:ring-4 focus:ring-green-300 transition-all font-semibold shadow-sm hover:shadow">
          Save
        </button>
      </div>
    </div>
  )
}
