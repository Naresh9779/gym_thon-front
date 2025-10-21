// src/utils/exerciseApi.js

const API_HOST = "exercisedb.p.rapidapi.com";
const API_KEY = "0a3405b70dmsh1fe0338bfc08839p1a5ecajsndd07961137d8"; // 🔑 Replace with your RapidAPI key

// Fetch exercise by name
export async function fetchExerciseByName(name) {
  try {
    const res = await fetch(
      `https://${API_HOST}/exercises/name/${encodeURIComponent(name)}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": API_KEY,
          "X-RapidAPI-Host": API_HOST,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Error fetching exercise: ${res.statusText}`);
    }

    const data = await res.json();
    console.log("ExerciseDB response:", data); // Debugging
    return data;
  } catch (err) {
    console.error("Exercise API error:", err);
    return [];
  }
}
