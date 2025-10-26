"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateDietPlanFormPreview() {
  const [form, setForm] = useState({
    gender: "",
    age: "",
    height: "",
    weight: "",
    bodyFat: "",
    goal: "",
    budget: "",
    nonVegetarian: "",
    mealPreference: "",
  });

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "http://localhost:4000/api/admin/dietPlan/68bda3c7249bd0ea8b179219",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const planId = "68bda3c7249bd0ea8b179219";

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      router.push(`/diet-plan/${planId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-extrabold mb-6 text-green-800">
        Generate Diet Plan
      </h1>

      <p className="text-gray-500 mb-6">
        Height should be entered in centimeters and budget will be calculated per week.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {[
          { name: "gender", label: "Gender", placeholder: "Male" },
          { name: "age", label: "Age (years)", placeholder: "22" },
          { name: "height", label: "Height (cm)", placeholder: "170" },
          { name: "weight", label: "Weight (kg)", placeholder: "63" },
          { name: "bodyFat", label: "Body Fat Description", placeholder: "Fat around chest and stomach" },
          { name: "goal", label: "Goal", placeholder: "Lean body muscle" },
          { name: "budget", label: "Budget (₹ per week)", placeholder: "1500" },
          { name: "nonVegetarian", label: "Non-Vegetarian (yes/no)", placeholder: "no" },
          { name: "mealPreference", label: "Meal Preference", placeholder: "High protein Indian affordable meals" },
        ].map((field) => (
          <div key={field.name}>
            <label className="font-semibold block text-gray-700 mb-1">
              {field.label}
            </label>
            <input
              type="text"
              name={field.name}
              value={form[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              className="border rounded-md px-3 py-2 w-full bg-gray-50 text-gray-600 focus:outline-none focus:ring-0 cursor-text hover:bg-gray-100"
            />
          </div>
        ))}

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 text-white py-2 rounded-lg mt-4"
        >
          {loading ? "Generating..." : "Generate Diet Plan"}
        </button>
      </form>
    </div>
  );
}
