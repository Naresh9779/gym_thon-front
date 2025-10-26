"use client";
import { useEffect, useState } from "react";

export default function WorkoutPlanPage() {
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPlan() {
      setIsLoading(true);
      try {
        const res = await fetch(
          "http://localhost:4000/api/user/getWorkoutPlan/68bda3c7249bd0ea8b179219"
        );
        if (!res.ok)
          throw new Error(`HTTP error! status: ${res.status}`);
        const apiData = await res.json();
        const planObj = apiData.data["Workout Plan"];
        if (!planObj || typeof planObj !== "object")
          throw new Error("Malformed data: Workout Plan missing");

        const workoutDays = Object.entries(planObj)
          .filter(([key]) => key.startsWith("Day"))
          .map(([dayLabel, dayData]) => ({
            dayLabel,
            ...dayData.Workout,
          }));

        const meta = {
          planDuration: planObj["plan duration"] || "",
          currentCondition: planObj["current condition"] || "",
        };

        setPlan({ days: workoutDays, ...meta });
        setSelectedDay(workoutDays[0]?.dayLabel || "");
      } catch (err) {
        setError(err.message);
        setPlan(null);
        console.error("Failed to load plan:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPlan();
  }, []);

  if (isLoading)
    return <p className="p-6 text-gray-500">Loading workout plan...</p>;
  if (error)
    return <p className="p-6 text-red-600">Error: {error}</p>;
  if (!plan || !plan.days.length)
    return <p>No workout plan found.</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2 text-blue-800">Workout Plan</h1>
      {plan.planDuration && (
        <p className="font-semibold mb-1 text-gray-700">
          Plan duration: {plan.planDuration}
        </p>
      )}
      {plan.currentCondition && (
        <p className="mb-4 text-gray-700">Current condition: {plan.currentCondition}</p>
      )}

      <div className="mb-6">
        <label className="font-semibold mr-2">Select Day:</label>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {plan.days.map((day, idx) => (
            <option key={idx} value={day.dayLabel}>
              {day.dayLabel}
            </option>
          ))}
        </select>
      </div>

      {plan.days
        .filter((day) => day.dayLabel === selectedDay)
        .map((day, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-xl mb-6">
            <h2 className="text-2xl font-bold mb-2 text-blue-700">{day.dayLabel}</h2>
            <p className="mb-2">
              <span className="font-semibold">Target muscle:</span>{" "}
              {day["target muscle"]}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Duration:</span> {day.duration}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Warm-up:</span> {day["Warm-up"]}
            </p>
            <div className="mb-4">
              <span className="font-semibold block mb-2">Main exercises:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {day.Main &&
                  Object.entries(day.Main).map(([exKey, exVal]) => (
                    <div
                      key={exKey}
                      className="border rounded-lg p-4 bg-gray-50 shadow flex flex-col items-center"
                    >
                      <div className="w-40 h-40 bg-gray-200 flex items-center justify-center mb-3 rounded">
                        <span className="text-gray-500 italic text-center">
                          No animation available
                        </span>
                      </div>
                      <p className="font-semibold text-blue-900">{exVal.split(" - ")[0]}</p>
                      <p className="text-gray-700">{exVal.split(" - ")[1]}</p>
                    </div>
                  ))}
              </div>
            </div>
            <p className="mb-2">
              <span className="font-semibold">Cool-down:</span> {day["Cool-down"]}
            </p>
            <p className="mb-2 text-green-700">
              <span className="font-semibold">Progression note:</span>{" "}
              {day["Progression note"]}
            </p>
          </div>
        ))}
    </div>
  );
}
