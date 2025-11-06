# FitFlow Quick Reference Guide

## 🚀 Quick Start

### Start Development Servers
```bash
# Terminal 1 - Backend
cd fitflow-api
npm run dev
# Runs on http://localhost:4000

# Terminal 2 - Frontend
cd gym-app
npm run dev
# Runs on http://localhost:3000
```

### Build for Production
```bash
# Backend
cd fitflow-api
npm run build
npm start

# Frontend
cd gym-app
npm run build
npm start
```

---

## 📋 What's New (Latest Updates)

### ✅ Progress Tracking System
- **Backend:** Full progress logging API with workout/meal tracking
- **Frontend:** Real-time stats dashboard showing workouts, meals, streak, active days
- **Components:** WorkoutTimer and MealCard now log to backend
- **Hook:** `useUserProgress()` provides logging functions and stats

### ✅ Monthly Reports
- **Workout Reports:** Shows completed workouts, adherence %, avg duration
- **Diet Reports:** Shows days logged, adherence %, avg calories/macros
- **Insights:** Color-coded badges and contextual feedback
- **Caching:** Auto-generated once per month, stored in database

### ✅ Admin Features
- **User Management:** View and edit user profiles and stats
- **Plan Editing:** Dedicated pages for editing workout/diet plans (no JSON)
- **Navigation:** Separate admin interface, role-based access control

### ✅ Fixes
- **Database:** Resolved DietPlan duplicate key error
- **UI:** Fixed admin logo, removed body fat field
- **Routing:** Proper admin/user separation with redirects

---

## 🎯 Key User Flows

### For Regular Users

#### Complete a Workout
1. Login → `/home`
2. Click "Start Today's Workout"
3. Complete exercises using timer
4. View progress at `/progress`

#### Log a Meal
1. Navigate to `/diet` or `/today`
2. Click "Log Meal" on any meal card
3. View in progress stats at `/progress`

#### View Progress
1. Navigate to `/progress`
2. See current streak, workouts completed, meals logged, active days
3. Click "View Monthly Reports"
4. Choose month to see detailed breakdown

#### Check Monthly Reports
1. Navigate to `/reports`
2. Click month to view
3. See workout report (adherence, avg duration, insights)
4. See diet report (adherence, avg calories, macros, insights)

### For Admin/Trainers

#### View User Details
1. Login as admin → `/dashboard`
2. Click "Users" → `/users`
3. Click on a user
4. View profile, current plans, stats

#### Edit User Profile
1. Navigate to user detail page
2. Click "Edit Stats"
3. Modify age, weight, height, goals
4. Save changes

#### Edit Workout Plan
1. From user detail page, click "Edit" on workout plan
2. Modify name, start date, duration, status
3. Save changes

#### Edit Diet Plan
1. From user detail page, click "Edit" on diet plan
2. Modify name, date, calories, macros
3. Save changes

#### Generate Plans
1. Navigate to `/generate`
2. Choose "Workout" or "Diet"
3. Fill in user details and preferences
4. Submit to generate AI plan

---

## 🔧 API Quick Reference

### Authentication
```typescript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/logout
```

### Progress (Protected)
```typescript
GET  /api/progress              // Get logs
POST /api/progress/workout      // Log workout
POST /api/progress/meal         // Log meal
GET  /api/progress/stats        // Get aggregated stats
```

### Reports (Protected)
```typescript
GET  /api/reports/workout/monthly/:year/:month
GET  /api/reports/diet/monthly/:year/:month
POST /api/reports/generate      // Force regenerate
```

### Admin (Protected, Admin Only)
```typescript
GET   /api/admin/users
GET   /api/admin/users/:userId/profile
PATCH /api/admin/users/:userId/profile
GET   /api/admin/users/:userId/workouts
GET   /api/admin/users/:userId/diet
GET   /api/admin/workouts/:planId
PATCH /api/admin/workouts/:planId
GET   /api/admin/diet/:planId
PATCH /api/admin/diet/:planId
POST  /api/admin/generate-workout
POST  /api/admin/generate-diet-daily
```

---

## 🪝 Frontend Hooks

### useAuth()
```typescript
const { user, loading, login, logout, isAuthenticated } = useAuth();
```

### useWorkoutPlans()
```typescript
const { plans, loading, error, refresh } = useWorkoutPlans();
```

### useDietPlan()
```typescript
const { plan, loading, error, refresh } = useDietPlan();
```

### useUserProgress() ⭐ NEW
```typescript
const {
  stats,           // { workoutsCompleted, totalMealsLogged, activeDays, currentStreak }
  logs,            // Array of recent progress logs
  loading,
  error,
  logWorkout,      // (day, completedExercises, totalExercises, durationSec?)
  logMeal,         // (mealName, calories?, macros?)
  refresh
} = useUserProgress();

// Example usage
await logWorkout('Day 1', 8, 10, 3600);
await logMeal('Breakfast', 450, { p: 30, c: 50, f: 15 });
```

---

## 📁 Project Structure

```
fitflow-api/                    # Backend
├── src/
│   ├── routes/                # API endpoints
│   │   ├── auth.ts           # Authentication
│   │   ├── admin.ts          # Admin operations
│   │   ├── progress.ts       # Progress logging ⭐
│   │   ├── reports.ts        # Monthly reports ⭐
│   │   ├── workouts.ts       # Workout plans
│   │   └── diet.ts           # Diet plans
│   ├── models/               # Database schemas
│   │   ├── User.ts
│   │   ├── WorkoutPlan.ts
│   │   ├── DietPlan.ts
│   │   ├── ProgressLog.ts    # ⭐ NEW
│   │   ├── MonthlyWorkoutReport.ts  # ⭐ NEW
│   │   └── MonthlyDietReport.ts     # ⭐ NEW
│   ├── controllers/          # Business logic
│   ├── middleware/           # Auth, error handling
│   └── services/            # External APIs

gym-app/                        # Frontend
├── app/
│   ├── (admin)/              # Admin routes
│   │   ├── dashboard/
│   │   ├── users/
│   │   │   └── [id]/         # User detail & edit ⭐
│   │   ├── workouts/
│   │   │   └── [planId]/edit/  # Workout editor ⭐
│   │   └── diet/
│   │       └── [planId]/edit/  # Diet editor ⭐
│   ├── (user)/               # User routes
│   │   ├── home/
│   │   ├── today/
│   │   ├── workout/
│   │   ├── diet/
│   │   ├── progress/         # Progress dashboard ⭐
│   │   ├── reports/          # Monthly reports ⭐
│   │   │   ├── workout/[year]/[month]/
│   │   │   └── diet/[year]/[month]/
│   │   └── plans/
├── components/
│   ├── admin/
│   ├── user/
│   │   ├── WorkoutTimer.tsx  # Updated ⭐
│   │   └── MealCard.tsx      # Updated ⭐
│   └── ui/
└── hooks/
    ├── useAuth.ts
    ├── useWorkoutPlan.ts
    ├── useDietPlan.ts
    └── useUserProgress.ts    # ⭐ NEW
```

---

## 🐛 Troubleshooting

### Backend Issues

**Port 4000 already in use:**
```bash
# Find and kill process
lsof -i :4000
kill -9 <PID>
```

**MongoDB connection failed:**
```bash
# Check MONGODB_URI in .env
# Ensure MongoDB is running
```

**DietPlan duplicate key error:**
- Fixed! Index cleanup runs automatically on startup
- If persists, manually drop index: `db.dietplans.dropIndex("user_1_date_1")`

### Frontend Issues

**Port 3000 already in use:**
```bash
# Next.js will auto-use 3001
# Or kill existing process
lsof -i :3000
kill -9 <PID>
```

**Build errors:**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Lock file error:**
```bash
rm -f .next/dev/lock
npm run dev
```

### Common Issues

**401 Unauthorized:**
- Check access token in localStorage
- Token may be expired, refresh at `/api/auth/refresh`
- Or logout and login again

**403 Forbidden:**
- Check user role matches route requirements
- Admin routes require `role: "admin"`
- User routes require `role: "user"`

**404 Not Found:**
- Verify API endpoint exists
- Check `NEXT_PUBLIC_API_BASE_URL` in frontend .env.local
- Ensure backend is running on correct port

---

## 📊 Database Collections

### Core Collections
- `users` - User accounts and profiles
- `workoutplans` - Workout plan definitions
- `dietplans` - Diet plan definitions
- `sessions` - JWT refresh tokens

### Progress Collections ⭐
- `progresslogs` - Individual workout/meal entries
- `monthlyworkoutreports` - Cached workout reports
- `monthlydietreports` - Cached diet reports

---

## 🎨 UI Components

### Shared Components
- `Card`, `Button`, `Input`, `Select`, `Modal`
- `Badge`, `Tabs`, `Avatar`, `Skeleton`

### User Components
- `ExerciseCard` - Display exercise details
- `MealCard` - Display meal with log button ⭐
- `WorkoutTimer` - Timer for workout tracking ⭐
- `ProgressChart` - Progress visualization
- `DayPicker` - Select workout day

### Admin Components
- `AdminNavigation` - Admin sidebar and header
- `UserCard` - User summary card
- `UserStatsForm` - Edit user stats ⭐
- `PlanGenerator` - AI plan generation form
- `AnalyticsCard` - Dashboard analytics

---

## 🔐 Authentication Flow

1. User submits login credentials
2. Backend validates and returns access + refresh tokens
3. Frontend stores tokens in localStorage
4. Access token sent in Authorization header for all requests
5. On 401 error, frontend attempts token refresh
6. On refresh success, retry original request
7. On refresh failure, redirect to login

---

## 📈 Progress System Flow

### Workout Logging
```
User completes workout
  ↓
WorkoutTimer.handleWorkoutComplete()
  ↓
useUserProgress.logWorkout(day, completed, total, duration)
  ↓
POST /api/progress/workout
  ↓
ProgressLog created in database
  ↓
Stats auto-update on /progress page
```

### Monthly Report Generation
```
User visits /reports/workout/2024/1
  ↓
Frontend: GET /api/reports/workout/monthly/2024/1
  ↓
Backend checks MonthlyWorkoutReport cache
  ↓
If not cached:
  - Aggregate ProgressLog for that month
  - Calculate adherence, averages
  - Save to MonthlyWorkoutReport
  ↓
Return report to frontend
  ↓
Display with insights and badges
```

---

## 📝 Code Examples

### Log Workout (Frontend)
```typescript
import { useUserProgress } from '@/hooks/useUserProgress';

function MyComponent() {
  const { logWorkout } = useUserProgress();
  
  const handleComplete = async () => {
    await logWorkout('Day 1', 8, 10, 3600);
    alert('Workout logged!');
  };
  
  return <button onClick={handleComplete}>Complete Workout</button>;
}
```

### Log Meal (Frontend)
```typescript
import { useUserProgress } from '@/hooks/useUserProgress';

function MealComponent() {
  const { logMeal } = useUserProgress();
  
  const handleLog = async () => {
    await logMeal('Breakfast', 450, { p: 30, c: 50, f: 15 });
    alert('Meal logged!');
  };
  
  return <button onClick={handleLog}>Log Meal</button>;
}
```

### Get Monthly Report (Frontend)
```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reports/workout/monthly/2024/1`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
const report = await response.json();
console.log(report.adherenceScore); // 85
```

---

## 🚦 Status Indicators

**Backend Status:** ✅ Running (port 4000)
**Frontend Status:** ✅ Running (port 3000/3001)
**Database Status:** ✅ Connected
**Build Status:** ✅ Both pass

**Latest Features:**
- ✅ Progress tracking fully integrated
- ✅ Monthly reports implemented
- ✅ Admin user management complete
- ✅ Role-based navigation working
- ✅ Database indexes fixed

---

## 📞 Support

**Documentation Files:**
- `PROGRESS_SYSTEM.md` - Technical docs for progress system
- `IMPLEMENTATION_SUMMARY.md` - Complete feature overview
- `ARCHITECTURE_ASSESSMENT.md` - Frontend architecture
- `AUTH_SYSTEM.md` - Authentication details

**For Issues:**
1. Check relevant documentation file
2. Review error logs in terminal
3. Check browser console for frontend errors
4. Verify environment variables are set
5. Confirm both servers are running

---

**Last Updated:** 2024-01-04
**Version:** 1.0.0
**Status:** Production Ready ✅
