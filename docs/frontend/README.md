# FitFlow - Frontend Documentation

## Overview
Next.js 13+ frontend for AI-powered fitness training platform with personalized workout and diet plans.

## Tech Stack
- **Framework:** Next.js 13+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Hooks + Zustand (for toasts)
- **API Communication:** Fetch API with custom wrapper

## Project Structure
```
gym-app/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Admin routes (group)
│   │   ├── dashboard/
│   │   ├── analytics/
│   │   ├── users/
│   │   ├── generate/      # Plan generation
│   │   └── workouts/      # Plan management
│   └── (user)/            # User routes (group)
│       ├── home/
│       ├── profile/
│       ├── workout/
│       ├── plans/
│       ├── progress/
│       ├── today-workout/
│       ├── today-diet/
│       └── today-meal/
├── components/
│   ├── admin/             # Admin components
│   ├── user/              # User components
│   ├── shared/            # Shared components
│   └── ui/               # UI library components
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts        # Authentication
│   ├── useToast.ts       # Toast notifications
│   ├── useWorkoutPlan.ts
│   ├── useDietPlan.ts
│   └── useUserProgress.ts
├── lib/
│   ├── api.ts            # API wrapper with auth
│   ├── constants.ts
│   └── utils.ts
└── types/                # TypeScript types
    ├── api.ts
    ├── user.ts
    ├── workout.ts
    └── diet.ts
```

## Key Features

### 1. Toast Notification System
Beautiful animated notifications instead of browser alerts.

**Files:**
- `hooks/useToast.ts` - State management
- `components/ui/ToastContainer.tsx` - UI component

**Usage:**
```tsx
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const toast = useToast();
  
  toast.success('Plan generated successfully!');
  toast.error('Failed to save changes');
  toast.warning('Please select a user first');
  toast.info('Processing your request...');
}
```

### 2. Protected Routes
Role-based access control with subscription validation.

**File:** `components/ProtectedRoute.tsx`

**Features:**
- Authentication check
- Role-based access (admin/user)
- Subscription validation
- Token expiry monitoring
- Auto-logout before token expires

### 3. API Integration
Centralized API calls with authentication.

**File:** `lib/api.ts`

**Features:**
- Automatic token injection
- Error handling with toast notifications
- Type-safe responses
- Refresh token handling

### 4. Custom Hooks

#### useAuth
Authentication and user management.
```tsx
const { user, login, logout, isAuthenticated, accessToken } = useAuth();
```

#### useToast
Toast notification management.
```tsx
const toast = useToast();
toast.success('Message');
```

#### useWorkoutPlan
Workout plan data and operations.
```tsx
const { plans, loading, refetch } = useWorkoutPlan();
```

#### useDietPlan
Diet plan data and operations.
```tsx
const { plans, loading, refetch } = useDietPlan();
```

#### useUserProgress
Progress tracking and meal logging.
```tsx
const { stats, logs, logMeal, logExercise } = useUserProgress();
```

## UI Components

### Color Scheme
- **Primary:** Green (#00C853) - Actions, success
- **Error:** Red (#FF3B30) - Errors, destructive actions
- **Text Primary:** Dark gray (#1A1A1A)
- **Text Secondary:** Gray (#757575)
- **Background:** Light gray (#F5F5F5)

### Component Library
All components follow consistent patterns:
- `Card` - Container with shadow
- `Button` - Action buttons
- `Input` - Form inputs
- `Select` - Dropdown selects
- `ToastContainer` - Notifications

## Pages Overview

### Admin Pages

#### `/dashboard`
- User overview
- Activity metrics
- Quick actions

#### `/analytics`
- User progress analytics
- Subscription metrics
- Plan generation stats

#### `/users`
- User list
- User search
- Create new user

#### `/users/[id]`
- User details
- Stats management
- Subscription management
- Plan history

#### `/generate/workout`
- Generate AI workout plans
- Select user
- Configure plan parameters
- Loading states with retry logic

#### `/generate/diet`
- Generate AI diet plans
- Select user
- Configure diet parameters
- Loading states with retry logic

### User Pages

#### `/home`
- Today's overview
- Quick access to workout/diet
- Progress summary

#### `/profile`
- User information
- Subscription status
- Edit profile

#### `/workout`
- Current workout plan
- Exercise list by day
- Exercise completion tracking

#### `/today-workout`
- Today's workout session
- Exercise completion
- Progress tracking

#### `/today-diet`
- Today's diet plan
- Meal overview
- Calorie tracking

#### `/today-meal`
- Individual meal details
- Food items
- Meal logging

#### `/plans`
- All workout and diet plans
- Plan history
- Meal logging from plans

#### `/progress`
- Progress charts
- Active days tracking
- Workout/meal completion
- Historical data

## Environment Variables

Frontend only needs:
```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com
```

## Build & Deploy

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
1. Connect GitHub repository
2. Set environment variable: `NEXT_PUBLIC_API_BASE_URL`
3. Deploy

## Security Features

### Frontend Security
- Token expiry monitoring (checks every 30 seconds)
- Auto-logout 1 minute before token expires
- Protected route guards
- Subscription validation
- XSS prevention (React auto-escaping)
- No sensitive data in localStorage (only tokens)

### Best Practices
- ✅ Use `useAuth` hook for authentication
- ✅ Use `useToast` for notifications
- ✅ Wrap pages in `ProtectedRoute` for auth
- ✅ Handle loading states
- ✅ Show error messages clearly
- ✅ Validate forms before submission

## Troubleshooting

### Build Errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Type Errors
Check `types/` directory for interface definitions.

### API Connection Issues
Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly.

## Future Enhancements
- [ ] Offline support with service workers
- [ ] Push notifications
- [ ] Image upload for meals
- [ ] Social sharing features
- [ ] Dark mode toggle
- [ ] Multi-language support
