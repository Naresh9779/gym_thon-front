"use client"
import React from 'react'

interface Props {
  days?: string[]
  selected?: string
  onSelect?: (day: string) => void
}

export default function DayPicker({ days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], selected, onSelect }: Props) {
  return (
    <div className="flex gap-2">
      {days.map((d) => (
        <button key={d} onClick={() => onSelect?.(d)} className={`px-3 py-1 rounded ${selected===d ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>
          {d}
        </button>
      ))}
    </div>
  )
}
