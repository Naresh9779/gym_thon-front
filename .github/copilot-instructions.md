# FitFlow - AI-Powered Fitness Platform

## Project Overview
This is a Next.js-based frontend for an AI-powered fitness training platform that generates personalized workout and diet plans. The app uses:
- Next.js 13+ with App Router
- TypeScript
- Tailwind CSS for styling
- React state management with hooks

### Key Features
1. User Features:
   - Daily workout tracking with exercise completion
   - Detailed meal plans with macronutrient tracking
   - Progress monitoring and active days tracking
   - Personalized workout and diet plans

2. Trainer Features:
   - Client management dashboard
   - AI plan generation
   - Client progress analytics
   - Plan customization tools

## Key Architecture Patterns

### 1. Directory Structure
```
gym-app/
├── app/                    # Next.js App Router directory
│   ├── (admin)/           # Admin-specific routes (group)
│   │   ├── dashboard/
│   │   ├── analytics/
│   │   └── users/
│   └── (user)/            # User-specific routes (group)
│       ├── diet/
│       ├── workout/
│       └── profile/
├── components/            # Reusable components
│   ├── admin/            # Admin-specific components
│   ├── shared/           # Shared components
│   ├── ui/              # UI components library
│   └── user/            # User-specific components
├── hooks/                # Custom React hooks
└── types/               # TypeScript type definitions
```

### 2. UI Components & Patterns

#### Core UI Components
1. Navigation:
   - Top bar with app logo and navigation icons
   - Side menu with Today, My Plans, Progress, Settings

2. Exercise Cards:
   - Exercise name with sets/reps
   - Rest period indicator
   - Completion checkbox
   - Exercise details and form guidance

3. Meal Plan Cards:
   - Meal time and calorie count
   - Food items with portions
   - Macronutrient breakdown (P/C/F)
   - Log meal functionality

4. Progress Tracking:
   - Daily progress percentage
   - Exercise completion counters
   - Calorie and macro tracking
   - Active days counter

#### Color Scheme
- Primary: Green (#00C853) for actions and success states
- Secondary: Gray scale for UI elements
- Text: Dark gray for primary text, lighter gray for secondary
- Background: White for cards, light gray for page backgrounds

### 3. API Integration
- Backend API endpoint: `http://localhost:4000`
- API routes follow RESTful patterns (e.g., `/api/user/getDietPlan/:id`)
- Exercise animations fetched from RapidAPI ExerciseDB

## Development Workflow

### Setup
```bash
cd gym-app
npm install
npm run dev
```

### Key Files
- `app/layout.tsx`: Root layout with font configuration
- `components/ui/Card.tsx`: Base UI component example
- `hooks/useAuth.ts`: Authentication hook
- `types/*.ts`: TypeScript interfaces

### State Management
- Use React's useState for component-level state
- Custom hooks for shared state logic
- Page-level state management with URL parameters

### Styling
- Use Tailwind CSS classes
- Follow existing component patterns in `components/ui/`
- Dark mode support via Tailwind classes

## Common Patterns

### Page Structure
```typescript
### Common Patterns

#### Page Structure
1. Plan Generation Pages:
```typescript
"use client";
import { useState } from "react";

export default function GeneratePlanPage() {
  const [clientData, setClientData] = useState({
    age: "",
    weight: "",
    bodyFat: "",
    goal: "",
    activityLevel: ""
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Generate Plan</h1>
      {/* Form content */}
    </div>
  );
}
```

2. Dashboard Pages:
```typescript
"use client";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [progress, setProgress] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [calories, setCalories] = useState(0);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Today's Plan</h1>
      <div className="grid gap-6">
        {/* Dashboard cards */}
      </div>
    </div>
  );
}
```

#### Data Display Patterns
1. Exercise Cards:
```tsx
<div className="bg-white rounded-lg p-4 shadow">
  <h3 className="font-bold text-lg">{exercise.name}</h3>
  <p className="text-gray-600">{exercise.sets} × {exercise.reps}</p>
  <p className="text-gray-500">Rest: {exercise.rest}s between sets</p>
</div>
```

2. Meal Cards:
```tsx
<div className="bg-white rounded-lg p-4 shadow">
  <div className="flex justify-between items-center mb-2">
    <h3 className="font-bold">{meal.name}</h3>
    <span className="bg-green-500 text-white px-2 py-1 rounded">
      {meal.calories} kcal
    </span>
  </div>
  <div className="text-sm text-gray-600">
    P: {meal.protein}g C: {meal.carbs}g F: {meal.fats}g
  </div>
</div>
```

### Error Handling
- Loading states with skeleton UI
- Error messages in red (#FF3B30)
- Success messages in green (#00C853)
- Form validation with inline errors

### Testing
- Component tests for UI elements
- Integration tests for plan generation
- E2E tests for user workflows
- API mocking for development
```

### Error Handling
- Use try/catch blocks for API calls
- Display loading states during data fetching
- Show error messages using consistent UI patterns

### Testing
- Component tests: TODO
- Integration tests: TODO
- E2E tests: TODO