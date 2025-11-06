"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useUserProgress } from '@/hooks/useUserProgress';

interface FoodItem { name: string; portion?: string }

interface Props {
	mealName: string;
	time?: string;
	calories?: number;
	foods?: FoodItem[];
	macros?: { protein?: number; carbs?: number; fats?: number };
	onLog?: () => void;
	mealId?: string;
}
export default function MealCard({ mealName, time, calories, foods = [], macros, onLog, mealId }: Props) {
	const { logMeal, logs } = useUserProgress();
	const [isLogging, setIsLogging] = useState(false);
	const [isLogged, setIsLogged] = useState(false);

	// Determine if this meal is already logged today
	useEffect(() => {
		const todayStr = new Date().toISOString().slice(0, 10);
		const already = logs.some((log) => {
			const logDate = new Date(log.date).toISOString().slice(0, 10);
			if (logDate !== todayStr) return false;
			return (log.meals || []).some(m => (m.mealName || '').trim().toLowerCase() === mealName.trim().toLowerCase());
		});
		setIsLogged(already);
	}, [logs, mealName]);

	const handleLog = async () => {
		if (isLogging || isLogged) return;
		setIsLogging(true);
		try {
			// Log meal with name, calories, and macros (map to p/c/f format)
			const result = await logMeal(
				mealName,
				calories,
				macros ? {
					p: macros.protein,
					c: macros.carbs,
					f: macros.fats
				} : undefined
			);
			if (result && (result as any).success) {
				setIsLogged(true);
				if ((result as any).alreadyLogged) {
					alert(`${mealName} already logged for today.`);
				} else {
					alert(`${mealName} logged successfully!`);
				}
			}
		} catch (e) {
			console.error('Failed to log meal:', e);
			alert('Failed to log meal');
		} finally {
			setIsLogging(false);
		}
		
		if (onLog) {
			onLog();
		}
	};

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
				<button onClick={handleLog} disabled={isLogged || isLogging} className={`px-5 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 ${isLogged ? 'text-gray-500 border border-gray-300 bg-gray-100 cursor-not-allowed' : 'text-green-600 border border-green-600 hover:bg-green-50'}`}>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
					{isLogged ? 'Logged' : (isLogging ? 'Logging…' : 'Log Meal')}
				</button>
			</div>
		</div>
	);
}
