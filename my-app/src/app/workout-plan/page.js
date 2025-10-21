"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkoutPlanPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    gender: "",
    age: "",
    height: "",
    weight: "",
    bodyFat: "",
    goal: "",
    experience: "",
    workoutType: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/admin/workoutPlan/68bda3c7249bd0ea8b179219", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.message || "Failed to generate plan");
        return;
      }

      const planId ="68bda3c7249bd0ea8b179219"

      if (!planId) {
        alert("Plan created but no ID returned, check console");
        console.log("Plan response:", json);
        return;
      }

router.push(`/workout-plan/${planId}`);
    } catch (err) {
      console.error("Error:", err);
      alert("Network error – is your backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Generate Workout Plan</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full border p-2 rounded">
          <option value="">Select gender</option>
          <option>Male</option>
          <option>Female</option>
        </select>
        <input name="age" type="number" value={formData.age} onChange={handleChange} placeholder="Age" required className="w-full border p-2 rounded" />
        <input name="height" type="number" value={formData.height} onChange={handleChange} placeholder="Height (cm)" required className="w-full border p-2 rounded" />
        <input name="weight" type="number" value={formData.weight} onChange={handleChange} placeholder="Weight (kg)" required className="w-full border p-2 rounded" />
        <input name="bodyFat" value={formData.bodyFat} onChange={handleChange} placeholder="Body fat (fit/average/overweight)" required className="w-full border p-2 rounded" />
        <input name="goal" value={formData.goal} onChange={handleChange} placeholder="Goal (Gain weight / Lose fat / Maintain)" required className="w-full border p-2 rounded" />
        <input name="experience" value={formData.experience} onChange={handleChange} placeholder="Experience (beginner/intermediate/advanced)" required className="w-full border p-2 rounded" />
        <input name="workoutType" value={formData.workoutType} onChange={handleChange} placeholder="Workout Type (basic gym...)" required className="w-full border p-2 rounded" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded" disabled={loading}>
          {loading ? "Generating..." : "Generate Plan"}
        </button>
      </form>
    </div>
  );
}
