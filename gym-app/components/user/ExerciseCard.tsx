"use client";

import React from 'react';

interface Props {
	name: string;
	sets?: string;
	reps?: string;
	rest?: string | number;
	completed?: boolean;
	onToggle?: () => void;
}

export default function ExerciseCard({ name, sets, reps, rest, completed, onToggle }: Props) {
	return (
		<div className={`bg-white rounded-lg p-4 shadow ${completed ? 'ring-2 ring-green-100' : ''}`}>
			<div className="flex items-start justify-between">
				<div>
					<h4 className={`font-semibold ${completed ? 'line-through text-gray-400' : ''}`}>{name}</h4>
					<p className="text-sm text-gray-500 mt-1">{sets} × {reps}</p>
					{rest && <p className="text-sm text-gray-500">Rest: {rest}s between sets</p>}
				</div>
				<div className="flex flex-col items-end gap-2">
					<div className="bg-gray-100 px-3 py-1 rounded-full text-sm">{sets} × {reps}</div>
					{onToggle && (
						<button onClick={onToggle} className={`p-1.5 rounded-md transition-colors ${completed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`} aria-label="toggle complete">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
