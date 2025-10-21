"use client";
import { useState } from "react";
import { fetchExerciseByName } from "@/lib/excerciseApi";

export default function ExerciseSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!query) return;
    const data = await fetchExerciseByName(query);
    setResults(data);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Exercise Animation Test</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Search exercise..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 flex-1"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4">
          {results.map((exercise) => (
            <div
              key={exercise.id}
              className="p-4 border rounded shadow-md flex flex-col items-center"
            >
              <h2 className="text-lg font-semibold capitalize">
                {exercise.name}
              </h2>
              <p className="text-sm text-gray-600">
                Body part: {exercise.bodyPart}
              </p>
              {exercise.gifUrl ? (
                <img
                  src={exercise.gifUrl}
                  alt={exercise.name}
                  className="mt-2 w-64 h-64 object-contain"
                />
              ) : (
                <p>No animation available</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Search to see exercises</p>
      )}
    </div>
  );
}
