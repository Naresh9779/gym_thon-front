# FitFlow — App Data Flow

## Architecture Overview

```
gym_thon-front/
├── fitflow-api/     ← Express + TypeScript + Mongoose (backend)
└── gym-app/         ← Next.js 16 App Router (frontend)
```

---

## 1. Authentication Flow

```
User enters email + password
        ↓
POST /api/auth/login
        ↓
authController.ts
  1. Find User by email
  2. bcrypt.compare(password, passwordHash)
  3. Sign accessToken  (15m,  JWT_SECRET)
  4. Sign refreshToken (7d,   JWT_REFRESH_SECRET)
  5. Hash refreshToken → store in Session doc (TTL index = auto-expire)
  6. getActiveSub() → Subscription.findOne({ userId, status: active/trial, endDate > now })
  7. Return { accessToken, refreshToken, user: { ...fields, subscription } }
        ↓
useAuth.ts (frontend)
  1. Store both tokens + user in localStorage
  2. Set 30s interval → checks if accessToken expires in <2min → auto-refresh
  3. On refresh: POST /api/auth/refresh → new accessToken returned
  4. On logout: clear localStorage, delete Session doc
```

**Every protected request:**
```
Request with "Authorization: Bearer <accessToken>"
        ↓
middleware/auth.ts → authenticate()
  1. Verify JWT signature
  2. If expired → 401
  3. Fetch User from DB (ensures user still exists)
  4. Attach req.user = { userId, role, email, name }
        ↓
[some routes] middleware/subscription.ts → requireActiveSubscription()
  If not admin → Subscription.findOne({ userId, active/trial, endDate > now })
  If none → 403 "No active subscription"
```

---

## 2. Data Models & Relationships

```
SubscriptionPlan (template)
  └─ name, price, durationDays, features{}
       ↓ (copied as snapshot at assignment)
Subscription (per-user history)
  ├─ userId → User
  ├─ planId → SubscriptionPlan  (audit ref only)
  ├─ planName, price, features{} ← snapshot, not live
  ├─ status: active | trial | expired | cancelled
  └─ startDate, endDate, durationMonths

User
  ├─ activeSubscriptionId → Subscription
  ├─ profile{ age, weight, height, gender, goals[], activityLevel,
  │           experienceLevel, dietPreferences, restrictions }
  └─ gymStatus: member | left

Payment
  ├─ userId → User
  ├─ planId → SubscriptionPlan
  ├─ subscriptionId → Subscription  (which sub this paid for)
  └─ amount, method, paymentStatus, paidAt

WorkoutPlan
  ├─ userId → User
  ├─ days[{ day, exercises[{ name, sets, reps, rest }] }]
  ├─ checkIn{ weight, energyLevel, injuries, ... }
  └─ status: active | completed | cancelled

DietPlan
  ├─ userId → User
  ├─ days[{ dayName, date, meals[{ name, foods[], macros{} }] }]
  ├─ avgDailyCalories, avgMacros{}
  └─ status: active | completed

ProgressLog       (one doc per user per day)
  ├─ userId → User
  ├─ date (indexed)
  ├─ workout{ completedExercises, totalExercises, durationSec }
  ├─ meals[{ name, calories, macros }]
  ├─ measurements{ weight, bodyFat, waist, ... }
  └─ isLeaveDay

PlanRequest
  ├─ userId → User
  ├─ checkIn{ ... }         ← submitted with request
  ├─ planTypes: [workout, diet]
  └─ status: pending → generated → (dismissed by user)

LeaveRequest
  ├─ userId → User
  ├─ dates[]                ← approved dates extend Subscription.endDate
  └─ status: pending | approved | rejected | cancelled

Session           (TTL: 7d)
  ├─ userId → User
  └─ refreshTokenHash (bcrypt)

AdminLog
  ├─ adminId → User
  ├─ action (enum: CREATE_USER, ASSIGN_SUBSCRIPTION, ...)
  └─ targetUserId, details

MonthlyWorkoutReport / MonthlyDietReport
  ├─ userId → User
  ├─ year, month (compound unique index)
  ├─ dailyPlans[], dailyProgress[]    ← snapshot of that month
  └─ adherenceScore, aggregates
```

---

## 3. User Journey Flow

```
NEW USER
  Admin → POST /api/admin/users
    ├─ Creates User doc
    ├─ Creates Subscription doc (snapshot from SubscriptionPlan)
    └─ Sets User.activeSubscriptionId

USER LOGS IN
  → accessToken + refreshToken issued
  → user.subscription populated from Subscription collection

HOME PAGE (/home)
  Parallel fetches:
  ├─ GET /api/gym/today          → holiday? + announcements
  ├─ GET /api/plans/status       → needs to request plans? plans ready?
  └─ GET /api/workouts           → active workout plan exists?

  If plans needed → Check-in modal
    User fills: weight, energyLevel, sleep, soreness, injuries
    POST /api/plans/request { checkIn, planTypes }
    → Creates PlanRequest { status: pending }

ADMIN GENERATES PLANS
  Admin → POST /api/admin/generate-workout (or diet)
    ├─ Reads User.profile + PlanRequest.checkIn
    ├─ Calls LLM (OpenRouter / Gemini / Groq)
    ├─ Creates WorkoutPlan / DietPlan
    └─ Updates PlanRequest { status: generated }

USER SEES PLANS
  GET /api/plans/status → { pendingPlansReady: true }
  Banner shown → user dismisses → POST /api/plans/mark-notified

TODAY'S WORKOUT (/today-workout)
  GET /api/workouts/active-day
    1. Fetch active WorkoutPlan
    2. Fetch approved leave dates + gym holidays
    3. Count active days since startDate (skipping leaves/holidays)
    4. dayIndex = activeDays % plan.days.length
    → Returns current day's exercises

USER LOGS WORKOUT
  POST /api/progress/workout { day, completedExercises[], durationSec }
  → Creates/updates ProgressLog for today

TODAY'S DIET (/today-diet)
  GET /api/diet → active DietPlan
  Calculate day of week → show today's meals

USER LOGS MEAL (/today-meal)
  POST /api/progress/meal { mealName, foods[], calories, macros }
  → Appends to ProgressLog.meals[] (deduped by name)

PROFILE (/profile)
  GET /api/gym/subscription
    → { subscription: activeSub | null,
        lastSubscription: lastExpired | null,   ← display when no active sub
        upgradePlans: [] }
  Shows plan name, status, features, expiry date
  Leave button: only shown if user.subscription (active) + features.leaveRequests
```

---

## 4. Leave Request Flow

```
User → POST /api/leave { dates[], reason }
  ├─ Check: Subscription.features.leaveRequests === true
  ├─ Check: dates within [3 days ago, 7 days ahead]
  ├─ Creates LeaveRequest { status: pending }

Admin → PATCH /api/leave/admin/requests/:id/approve
  ├─ Extends Subscription.endDate += dates.length (days)
  └─ LeaveRequest { status: approved, extensionApplied: true }

Admin → PATCH /api/leave/admin/requests/:id/force-came
  ├─ Reverts Subscription.endDate -= 1
  └─ Adds date to LeaveRequest.forcedDates[]

GET /api/workouts/active-day
  ← fetches approved leave dates
  ← fetches GymHolidays
  → skips both when counting active training days
```

---

## 5. Subscription Lifecycle

```
Created (active/trial)
    │
    ├─ Admin can extend: PATCH /subscription { extendByMonths | extendByDays | setEndDate }
    ├─ Leave approval auto-extends endDate
    │
    ▼
Cron: GET /api/cron/subscription-update  (daily 1 AM)
    Subscription where status ∈ [active, trial] + endDate < now → status: expired
    │
    ▼
User hits protected route
    middleware/subscription.ts → 403 "No active subscription"
    Frontend layout → shows <SubscriptionExpired> wall
    (only /profile and /reports bypass the wall)
    │
    ▼
Cron: GET /api/cron/gym-left-update  (daily)
    User with expired sub + 14 days passed → User.gymStatus = left
```

---

## 6. Admin Panel Data Flow

```
Dashboard (/dashboard)
  GET /api/analytics/overview
  ├─ totalUsers            (User.countDocuments role:user)
  ├─ activeMembers         (Subscription.countDocuments active/trial)
  ├─ newThisMonth          (User.countDocuments createdAt in range)
  ├─ expiringSoon          (Subscription endDate within 7 days)
  ├─ retentionRate         (active ∩ joined >30d ago / total joined >30d ago)
  ├─ revenue MTD/lastMonth (Payment aggregation)
  └─ planDistribution      (Subscription.aggregate by planName)

Users Page (/users)
  GET /api/admin/users?search=&status=&plan=&page=&limit=
  ├─ Two-step query: Subscription.distinct('userId', filters) → User.find({ _id: $in })
  └─ Each card: name, email, subscription.status, subscription.planName

User Detail (/users/:id)
  Parallel:
  ├─ GET /api/admin/users/:id               → user + current subscription
  ├─ GET /api/admin/users/:id/subscriptions → full subscription history
  ├─ GET /api/admin/users/:id/payments      → all payments
  └─ GET /api/workouts?userId=:id           → plans

  Actions:
  ├─ Assign subscription → PATCH /api/admin/users/:id/subscription
  ├─ Record payment      → POST  /api/admin/users/:id/payments
  ├─ Generate workout    → POST  /api/admin/generate-workout
  ├─ Generate diet       → POST  /api/admin/generate-diet
  └─ Mark gym left       → PATCH /api/admin/users/:id/gym-status

Requests (/requests)
  GET /api/admin/plan-requests  (pending PlanRequests)
  → Admin reviews check-in data → triggers generation
```

---

## 7. Reports Flow

```
GET /api/reports/workout/monthly/:year/:month
  1. Check if MonthlyWorkoutReport exists for userId+year+month
  2. If not: auto-generate from ProgressLog + WorkoutPlan data for that month
  3. Return { dailyPlans[], dailyProgress[], adherenceScore, totalWorkouts, ... }

Cron: GET /api/cron/workout-expiry
  WorkoutPlan where endDate < now + status active → status: completed
```

---

## 8. Frontend State Management

```
useAuth.ts  (global)
  localStorage: accessToken, refreshToken, authUser
  30s interval: token expiry check + auto-refresh
  user object: { id, name, email, role, subscription, profile, ... }

Page-level state  (no global store — React useState + useEffect per page)
  Each page fetches its own data on mount via fetch + Bearer token

Route protection:
  (user)/layout.tsx
    !user                 → redirect /auth
    user.role === admin   → redirect /dashboard
    !user.subscription    → show <SubscriptionExpired> wall
    (except /profile and /reports)

  (admin)/layout.tsx
    !user || role !== admin → redirect /auth
```

---

## 9. API Endpoint Summary

| Module      | Count | Key Endpoints |
|-------------|-------|---------------|
| Auth        | 4     | login, refresh, /me, logout |
| Users       | 2     | GET/PATCH profile |
| Workouts    | 6     | list, get, generate, active-day, delete |
| Diet        | 3     | list, get, delete |
| Plans       | 4     | status, request, mark-notified, my-requests |
| Progress    | 8     | log-workout, log-meal, stats, measurements, trends |
| Leave       | 7     | user: list/create/delete · admin: list/approve/reject/force-came |
| Gym         | 2     | today (holiday+announcements), subscription |
| Admin       | 50+   | users CRUD, payments, plan generation, analytics, logs |
| Analytics   | 2     | overview, per-user |
| Reports     | 2     | monthly diet, monthly workout |
| Cron        | 4     | subscription-update, workout-expiry, gym-left-update, health |
| **Total**   | **95+** | |

---

## 10. Key Design Principles

- **Snapshot pattern** — Features/price copied to `Subscription` at assignment. Editing a `SubscriptionPlan` template never retroactively changes existing subscribers.
- **Two-step queries** — No `$lookup`. `Subscription.distinct('userId', filter)` → `User.find({ _id: $in ids })` avoids joins.
- **Leave = subscription extension** — Approved leave days add to `endDate`, keeping the subscription valid longer. Workout day index skips those dates.
- **Null subscription = expired** — `getActiveSub()` returns `null` for expired users. Frontend checks `!user.subscription` as the expired signal.
- **Cron-driven state transitions** — Subscriptions expire, workouts complete, and gym-left status is set via daily cron jobs (not inline at request time).
