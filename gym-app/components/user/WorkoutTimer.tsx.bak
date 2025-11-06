"use client"
import React, { useEffect, useState } from 'react'

interface Props {
  initialSeconds?: number
}

export default function WorkoutTimer({ initialSeconds = 60 }: Props) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [running])

  return (
    <div className="bg-white rounded-lg p-3 shadow inline-flex items-center gap-3">
      <div className="text-xl font-mono">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(true)} className="px-3 py-1 bg-green-600 text-white rounded">Start</button>
        <button onClick={() => setRunning(false)} className="px-3 py-1 border rounded">Pause</button>
        <button onClick={() => { setSeconds(initialSeconds); setRunning(false) }} className="px-3 py-1 border rounded">Reset</button>
      </div>
    </div>
  )
}
