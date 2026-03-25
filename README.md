# FitFlow — Gym Management Platform

> Full-stack gym management system with AI-generated workout & diet plans, QR attendance tracking, subscription management, and member analytics.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Cron Jobs](#cron-jobs)
- [User Roles](#user-roles)

---

## Overview

FitFlow is a production-ready gym management platform built for single-gym owners. It handles the complete member lifecycle — from onboarding and subscription management to AI-generated fitness plans, leave tracking, QR-based attendance, and payment recording.

**Admin:** Add/manage members, assign subscription plans, record payments, generate AI workout/diet plans, manage holidays and announcements, track attendance via QR codes, view analytics.

**Member:** View today's workout and diet plan, log progress, request leave, scan QR for attendance, view monthly reports.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, TypeScript, Zod validation |
| Database | MongoDB Atlas (Mongoose ODM) |
| AI | OpenRouter (primary), Groq + Gemini (fallback) |
| Auth | JWT — access token 15m + refresh token 7d |
| Deployment | Vercel (frontend + backend as serverless) |
| Scheduling | Vercel Cron Jobs (4 jobs) |

---

## Project Structure

```
gym_thon-front/
├── fitflow-api/                  ← Backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/               ← DB connection, env validation
│   │   ├── middleware/           ← auth, subscription guard, rate limiter
│   │   ├── models/               ← 17 Mongoose models
│   │   ├── routes/               ← 11 route modules
│   │   └── services/             ← AI generation, plan scheduling
│   ├── scripts/seed.js           ← Dev data seeder
│   ├── vercel.json               ← Cron schedule (4 jobs)
│   └── .env.example
│
└── gym-app/                      ← Frontend (Next.js 16)
    ├── app/
    │   ├── (admin)/              ← Admin-only pages (13 pages)
    │   ├── (user)/               ← Member-facing pages (10 pages)
    │   └── auth/                 ← Login / register
    ├── components/
    │   ├── admin/                ← Admin UI components
    │   └── user/                 ← Member UI components
    └── hooks/                    ← useAuth, useUserProgress, useToast
```

---

## Architecture

### System Overview

```
┌────────────────────────────────────────────┐
│            gym-app  (Next.js 16)           │
│                                            │
│   /auth     /(admin)/*     /(user)/*       │
│                                            │
│   useAuth · authFetch · useUserProgress    │
└──────────────────┬─────────────────────────┘
                   │  REST  (Bearer JWT)
┌──────────────────▼─────────────────────────┐
│          fitflow-api  (Express)            │
│                                            │
│   authenticate() → requireAdmin()          │
│   requireActiveSubscription()              │
│                                            │
│   auth · admin · users · workouts · diet   │
│   plans · attendance · leave · cron        │
│                                            │
│   workoutGenerationService                 │
│   dietGenerationService                    │
│   planSchedulerService                     │
└──────────┬──────────────────┬──────────────┘
           │                  │
     MongoDB Atlas      OpenRouter AI
                         Groq / Gemini
```

### Request Lifecycle

```
Browser
  → useAuth.authFetch()        Attaches Bearer, handles 401 → redirect /auth
  → Express Router
  → authenticate()             JWT verify + DB user lookup
  → requireAdmin()             OR  requireActiveSubscription()
  → Route handler              Zod schema validation
  → Mongoose                   Query / mutation
  → MongoDB Atlas
  → JSON response
```

---

## Features

### Member Features

| Feature | Page | Description |
|---------|------|-------------|
| Today's Workout | `/today-workout` | Active workout plan, day-by-day exercises |
| Today's Diet | `/today-diet` | Full meal plan for the day |
| Meal Macros | `/today-meal` | Macro overview (protein/carbs/fats) |
| Progress Log | `/progress` | Log weight, energy, sleep, workout completion |
| Leave Request | Profile leave tab | Request leave for specific dates |
| Monthly Reports | `/reports` | Workout + diet + attendance tabs |
| Attendance | `/my-attendance` | Today's status + 30-day check-in history |
| QR Scan | `/scan?token=...` | Mark in / mark out via gym QR code |
| Profile | `/profile` | Update personal info and fitness stats |

### Admin Features

| Feature | Page | Description |
|---------|------|-------------|
| Dashboard | `/dashboard` | Live KPIs: members, revenue, pending plans |
| Members | `/users` | Paginated, searchable member directory |
| Add Member | `/users/add` | Onboard member: profile + plan + payment + mobile |
| Member Detail | `/users/[id]` | Plans, progress, notes, subscription, attendance |
| Plan Requests | `/requests` | Review + generate AI workout/diet plans |
| Payments | `/payments` | Record, mark-received, void, chart revenue |
| Subscriptions | `/subscriptions` | Create/edit plan tiers and feature flags |
| Attendance | `/attendance` | Live QR display, today's roll, per-user history |
| Leave | `/leave` | Approve / reject member leave requests |
| Analytics | `/analytics` | Revenue trends, member growth, plan distribution |
| Customization | `/customization` | Holidays, announcements, attendance settings |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB Atlas cluster (free tier works)
- OpenRouter API key

### Backend

```bash
cd fitflow-api
cp .env.example .env        # fill in required values
npm install
npm run dev                 # http://localhost:4000
```

### Frontend

```bash
cd gym-app
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000" > .env.local
npm install
npm run dev                 # http://localhost:3000
```

### Seed Dev Data

```bash
cd fitflow-api
node scripts/seed.js
# Creates admin + 5 test members with plans and progress
# All passwords: Test@1234
```

---

## Environment Variables

### Backend — `fitflow-api/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Access token signing key (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token key (min 32 chars) |
| `CORS_ORIGIN` | Yes | Frontend URL for CORS |
| `APP_URL` | Yes | Frontend URL for QR code links |
| `CRON_SECRET` | Yes | Authenticates Vercel cron requests |
| `OPENROUTER_API_KEY` | Yes | AI plan generation |
| `ADMIN_EMAIL` | Yes | Auto-created admin email |
| `ADMIN_PASSWORD` | Yes | Auto-created admin password |
| `NODE_ENV` | Yes | `production` in prod |
| `RAPIDAPI_KEY` | No | Exercise GIF lookups |

### Frontend — `gym-app/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API base URL |

---

## Deployment

Both services deploy independently to Vercel.

### Backend

1. Import `fitflow-api/` → Vercel (Framework: **Other**)
2. Add all env vars listed above
3. `CRON_SECRET` must be set — Vercel sends it as `Authorization: Bearer <secret>`

### Frontend

1. Import `gym-app/` → Vercel (Framework: **Next.js**)
2. Set `NEXT_PUBLIC_API_BASE_URL` to backend Vercel URL

### Post-deploy Checklist

- [ ] `GET /api/health` returns `{ ok: true }`
- [ ] Admin login works
- [ ] Change admin password immediately
- [ ] Create at least one subscription plan
- [ ] Enable attendance and test QR flow end-to-end
- [ ] Verify cron jobs are listed in Vercel dashboard

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Bearer | Logout |
| GET | `/api/auth/me` | Bearer | Current user |

### Admin — Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List (paginated + search) |
| POST | `/api/admin/users` | Create member |
| GET | `/api/admin/users/:id` | Member detail |
| PATCH | `/api/admin/users/:id/subscription` | Extend / modify subscription |
| POST | `/api/admin/users/:id/reset-password` | Reset password |

### Admin — Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/payments` | List all payments |
| POST | `/api/admin/payments` | Record payment + assign plan |
| PATCH | `/api/admin/payments/:id/mark-received` | Mark pending as received |
| PATCH | `/api/admin/payments/:id/cancel` | Void pending payment |
| GET | `/api/admin/payments/stats` | Revenue analytics |

### Attendance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/attendance/qr-token` | Admin | Generate QR token |
| GET | `/api/admin/attendance/today` | Admin | Today's full roll |
| POST | `/api/attendance/mark-in` | Member | Check-in via QR |
| POST | `/api/attendance/mark-out` | Member | Check-out |
| GET | `/api/attendance/history` | Member | 60-day history |

---

## Cron Jobs

All jobs require `Authorization: Bearer <CRON_SECRET>` in production.

| Job | Schedule | Description |
|-----|----------|-------------|
| `subscription-update` | Daily 1 AM | Expires overdue subscriptions |
| `workout-expiry` | Daily 2 AM | Marks old plans complete |
| `gym-left-update` | Daily 3 AM | Auto-marks members left after 14d |
| `attendance-auto-markout` | Every 30 min | Marks out forgotten check-ins |

---

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full platform including all `/api/admin/*` |
| `user` | Member pages, subscription-gated features |

### Subscription Feature Flags

| Flag | Gates |
|------|-------|
| `aiWorkoutPlan` | AI workout plan generation |
| `aiDietPlan` | AI diet plan generation |
| `leaveRequests` | Leave request submission |
| `progressTracking` | Progress logging |

Expired members retain access to: `/profile`, `/reports`, `/scan`, `/my-attendance`.
