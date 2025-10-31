"use client";

import React from 'react';

interface FoodItem { name: string; portion?: string }

interface Props {
	mealName: string;
	time?: string;
	calories?: number;
	foods?: FoodItem[];
	macros?: { protein?: number; carbs?: number; fats?: number };
	onLog?: () => void;
}

export default function MealCard({ mealName, time, calories, foods = [], macros, onLog }: Props) {
	return (
		<div className="bg-white rounded-lg p-4 shadow">
			<div className="flex justify-between items-start mb-3">
				<div>
					<h4 className="font-semibold text-lg">{mealName}</h4>
					{time && <p className="text-sm text-gray-500">{time}</p>}
				</div>
				{calories !== undefined && (
					<div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">{calories} kcal</div>
				)}
			</div>

			<ul className="mb-3 text-sm text-gray-700 list-disc list-inside">
				{foods.map((f, i) => (
					<li key={i}>{f.name} {f.portion ? `(${f.portion})` : ''}</li>
				))}
			</ul>

			{macros && (
				<div className="text-sm text-gray-500 mb-3">P: {macros.protein ?? 0}g &nbsp; C: {macros.carbs ?? 0}g &nbsp; F: {macros.fats ?? 0}g</div>
			)}

			<div className="flex justify-end">
				<button onClick={onLog} className="px-5 py-2 text-sm text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-1.5">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
					Log Meal
				</button>
			</div>
		</div>
	);
}
