"use client";
import { useEffect, useState } from "react";

export default function DietPlanPage() {
  const [diet, setDiet] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDiet() {
      setIsLoading(true);
      try {
        const res = await fetch(
          "http://localhost:4000/api/user/getDietPlan/68bda3c7249bd0ea8b179219"
        );
        if (!res.ok)
          throw new Error(`HTTP error! status: ${res.status}`);
        const apiData = await res.json();
        const dietObj = apiData.data["Diet Plan"];
        if (!dietObj || typeof dietObj !== "object")
          throw new Error("Malformed data: Diet Plan missing");

        const dietDays = Object.entries(dietObj)
          .filter(([key]) => key.startsWith("Day"))
          .map(([dayLabel, dayData]) => ({
            dayLabel,
            ...dayData.Diet,
          }));

        setDiet({ days: dietDays });
        setSelectedDay(dietDays[0]?.dayLabel || "");
      } catch (err) {
        setError(err.message);
        setDiet(null);
        console.error("Failed to load diet plan:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDiet();
  }, []);

  if (isLoading)
    return <p className="p-6 text-gray-500">Loading diet plan...</p>;
  if (error)
    return <p className="p-6 text-red-600">Error: {error}</p>;
  if (!diet || !diet.days.length)
    return <p>No diet plan found.</p>;

  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snacks"];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-4 text-green-800">Diet Plan</h1>
      <div className="mb-6">
        <label className="font-semibold mr-2">Select Day:</label>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {diet.days.map((day, idx) => (
            <option key={idx} value={day.dayLabel}>
              {day.dayLabel}
            </option>
          ))}
        </select>
      </div>

      {diet.days
        .filter((day) => day.dayLabel === selectedDay)
        .map((day, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-xl mb-6">
            <h2 className="text-2xl font-bold mb-4 text-green-700">{day.dayLabel}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {mealTypes.map((meal) => (
                <div key={meal} className="border rounded-lg p-4 bg-gray-50 shadow flex flex-col">
                  <div className="w-full h-36 bg-gray-200 flex items-center justify-center mb-3 rounded">
                    <span className="text-gray-500 italic text-center">
                      No image available
                    </span>
                  </div>
                  <h3 className="font-bold text-green-900 mb-2">{meal}</h3>
                  {Array.isArray(day[meal]) ? (
                    <ul className="list-disc pl-4">
                      {day[meal].map((item, i) => (
                        <li key={i} className="mb-1">{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="italic text-gray-500">No items listed.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
