"use client";
import { useEffect, useState } from "react";
import { fetchExerciseByName } from "@/lib/excerciseApi";

export default function WorkoutPlanPage() {
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Day 1");

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch("http://localhost:4000/api/user/getWorkoutPlan/68bda3c7249bd0ea8b179219");
        const data = await res.json();

        // Fetch extra exercise details for each exercise
        const enrichedDays = await Promise.all(
          data.plan.map(async (day) => {
            const enrichedExercises = await Promise.all(
              day.exercises.map(async (ex) => {
                const apiExercise = await fetchExerciseByName(ex.name);
                return { ...ex, apiData: apiExercise };
              })
            );
            return { ...day, exercises: enrichedExercises };
          })
        );

        setPlan({ ...data, plan: enrichedDays });
      } catch (err) {
        console.error("Failed to load plan:", err);
      }
    }

    loadPlan();
  }, []);

  if (!plan) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Workout Plan</h1>

      {/* Dropdown to select Day */}
      <div className="mb-4">
        <label className="font-semibold mr-2">Select Day:</label>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {plan.plan.map((day, idx) => (
            <option key={idx} value={`Day ${idx + 1}`}>
              Day {idx + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Display selected day */}
      {plan.plan
        .filter((_, idx) => `Day ${idx + 1}` === selectedDay)
        .map((day, idx) => (
          <div key={idx}>
            <h2 className="text-xl font-bold mb-2">{selectedDay}</h2>
            {day.exercises.map((ex, i) => (
              <div
                key={i}
                className="border rounded-lg p-4 mb-4 shadow-sm bg-white"
              >
                <h3 className="font-bold">Exercise {i + 1}</h3>
                <p className="text-gray-700">Sets/Reps: {ex.sets}</p>
                <p className="text-sm text-gray-500">
                  Body part: {ex.apiData?.bodyPart || "N/A"}
                </p>

                {ex.apiData?.gifUrl ? (
                  <img
                    src={ex.apiData.gifUrl}
                    alt={ex.apiData.name}
                    className="w-48 h-48 mt-2"
                  />
                ) : (
                  <p className="italic text-gray-500 mt-2">
                    No animation available
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
