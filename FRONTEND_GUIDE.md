# FitFlow Frontend Guide

## 🚀 What We Built

A modern, fully functional fitness training platform with AI-powered features.

## 📱 Pages & Features

### Landing Page (`/`)
- **Modern hero section** with animated gradients
- **Two user types**: Trainer and User selection
- **Feature highlights** with icons
- Clean, professional design

### Auth Page (`/auth`)
- **Dual-mode**: Login and Register
- **Role selection**: User or Trainer toggle
- **Smart routing**: Redirects based on role after login
- Integrated with backend JWT authentication

### User Dashboard (`/user/home`)
- **Welcome header** with personalized greeting
- **Quick stats** cards (Streak, Workouts, Calories, Weight)
- **Today's workout** preview with action button
- **Today's meals** preview with navigation
- **Quick action cards** to Progress, Plans, and Profile

### Diet Plans Page (`/user/diet`)
- **AI generation controls**: Generate for specific date or today
- **Plan listing**: Grid of all user's diet plans
- **Delete functionality**: Remove unwanted plans
- **Latest plan details**: Full meal breakdown with macros
- **Loading states** and empty states
- Real-time integration with backend API

### Workout Plans Page (`/user/workout`)
- **Cycle generation**: Specify start date and duration (weeks)
- **Plan listing**: All workout cycles with metadata
- **Day selector**: Interactive tabs to view each day
- **Exercise cards**: Detailed exercise information
- **Rest day handling**: Special UI for recovery days
- Real-time integration with backend API

### Profile Page (`/user/profile`)
- **Editable profile**: Toggle edit mode to update info
- **Personal stats**: Age, weight, height with inline editing
- **Fitness goals**: Display primary goal and activity level
- **Subscription info**: Current plan details
- **Logout functionality**: Secure session termination

## 🎨 Design System

### Colors
- **Primary**: Green (#10B981 / green-500) - Actions, success states
- **Secondary**: Gray scales - UI elements, text
- **Accent colors**: Blue (progress), Orange (profile), Purple (plans)
- **Backgrounds**: Gradient from green-50 to white

### Components
- **Button**: 4 variants (primary, secondary, ghost, danger), 3 sizes
- **Card**: Flexible container with optional className
- **Input**: Form input with label and error support
- **MealCard**: Complex meal display with foods and macros
- **ExerciseCard**: Exercise details with sets/reps/rest

### Typography
- **Headings**: Bold, large (text-3xl to text-5xl)
- **Body**: Medium weight, gray-600 for secondary text
- **Labels**: Small, uppercase for stat labels

## 🔗 Navigation Flow

```
Landing (/)
  ├─ Auth (/auth?role=user)
  │   └─ User Home (/user/home)
  │       ├─ Diet Plans (/user/diet)
  │       ├─ Workout Plans (/user/workout)
  │       ├─ Progress (/user/progress)
  │       ├─ My Plans (/user/plans)
  │       └─ Profile (/user/profile)
  │
  └─ Auth (/auth?role=trainer)
      └─ Admin Dashboard (/admin/dashboard)
          ├─ Analytics (/admin/analytics)
          ├─ Generate Plans (/admin/generate)
          └─ Users (/admin/users)
```

## 🔌 Backend Integration

### API Endpoints Used
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/me` - Get current user
- `GET /api/diet` - List diet plans
- `POST /api/diet/generate` - Generate plan for date
- `POST /api/diet/generate-daily` - Generate today's plan
- `DELETE /api/diet/:id` - Remove diet plan
- `GET /api/workouts` - List workout cycles
- `POST /api/workouts/generate-cycle` - Generate workout cycle
- `DELETE /api/workouts/:id` - Remove workout plan

### Authentication
- JWT tokens stored in localStorage
- `accessToken` for API requests (15min expiry)
- `refreshToken` for session renewal (7d expiry)
- Auto-refresh mechanism in useAuth hook

## 🛠️ Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State**: React hooks (useState, useEffect, useCallback)
- **API**: Fetch API with custom wrappers
- **Icons**: Heroicons (SVG inline)

## 📦 Key Hooks

### `useAuth()`
```typescript
const { user, loading, error, login, register, logout, accessToken } = useAuth();
```
Manages authentication state and provides auth actions.

### `useDietPlan()`
```typescript
const { plans, loading, error, refresh, generateForDate, generateToday, removePlan, getPlan } = useDietPlan();
```
Handles diet plan CRUD operations.

### `useWorkoutPlans()`
```typescript
const { plans, loading, error, refresh, generateCycle, removePlan } = useWorkoutPlans();
```
Manages workout cycle operations.

## 🎯 User Experience Features

1. **Loading States**: Spinners and skeleton UI during API calls
2. **Empty States**: Helpful messages when no data exists
3. **Error Handling**: User-friendly error messages with icons
4. **Responsive Design**: Works on mobile, tablet, and desktop
5. **Smooth Transitions**: Hover effects and animations
6. **Accessibility**: Semantic HTML and ARIA labels
7. **Keyboard Navigation**: Tab-friendly interface

## 🚀 Quick Start

```bash
# Install dependencies
cd gym-app
npm install

# Set environment variables
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000" > .env.local

# Start development server
npm run dev

# Visit http://localhost:3000
```

## 🔧 Backend Must Be Running

Ensure the FitFlow API is running:
```bash
cd ../fitflow-api
npm run dev
# Should run on http://localhost:4000
```

## 📝 Next Steps for Enhancement

1. **Add form validation** with Zod schemas
2. **Implement progress tracking** page with charts
3. **Add profile image upload** with storage
4. **Create admin dashboard** for trainers
5. **Add real-time notifications** with WebSockets
6. **Implement email verification** flow
7. **Add social auth** (Google, Facebook)
8. **Create mobile app** with React Native

## 🎨 Design Philosophy

- **Simplicity First**: Clean, uncluttered interfaces
- **User-Centric**: Actions are obvious and accessible
- **Feedback-Rich**: Every action has visual feedback
- **Mobile-First**: Responsive from smallest screens up
- **Performance**: Fast loads with code splitting
- **Consistency**: Reusable components, predictable patterns

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS.
