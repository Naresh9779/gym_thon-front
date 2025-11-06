# FitFlow API - Complete Backend

Express + TypeScript + MongoDB backend with AI-powered diet and workout generation.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Server runs at **http://localhost:4000**

### Test Suites
```bash
./test-auth.sh                # Auth system (8 tests)
./test-diet-generation.sh     # Diet generation (8 tests)
./test-workout-generation.sh  # Workout generation (6 tests)
```

---

## 🔐 Authentication

JWT-based auth with bcrypt password hashing.

**Endpoints:**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

**Features:** Access token (15min), Refresh token (7 days), Session management

---

## 🍽️ Diet Plans (AI-Powered)

Generate personalized meal plans using OpenRouter AI.

**Endpoints:**
- `GET /api/diet` - Get all diet plans
- `GET /api/diet/:id` - Get specific plan
- `POST /api/diet/generate` - Generate for date
- `POST /api/diet/generate-daily` - Generate today
- `DELETE /api/diet/:id` - Delete plan

**Features:** TDEE calculation, macro distribution, nutrition validation, preferences/restrictions

---

## 💪 Workout Plans (AI-Powered)

Generate workout cycles with progressive overload.

**Endpoints:**
- `GET /api/workouts` - Get all workout plans
- `GET /api/workouts/:id` - Get specific plan
- `POST /api/workouts/generate-cycle` - Generate cycle
- `DELETE /api/workouts/:id` - Delete plan

**Features:** 1-16 week cycles, sets/reps/rest, exercise notes, overlap prevention

---

## 👤 User Profile

**Endpoints:**
- `GET /api/users/profile` - Get profile
- `PATCH /api/users/profile` - Update profile

**Fields:** age, weight, height, gender, activityLevel, goals, preferences, restrictions

---

## 📁 Project Structure

```
src/
├── config/          # DB + env
├── controllers/     # Business logic
├── middleware/      # Auth + errors
├── models/          # Mongoose schemas
├── routes/          # API routes
├── services/        # AI clients + generation
└── utils/           # Helpers
```

---

## 🔧 Environment Variables

```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
OPENROUTER_API_KEY=sk-or-v1-...
RAPIDAPI_KEY=...
PORT=4000
```

---

## 🧪 Testing

All test suites pass:
- ✅ Auth (registration, login, tokens, logout)
- ✅ Diet generation (AI, CRUD, validation)
- ✅ Workout generation (AI, CRUD, cycles)

---

## 🎯 Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express 4.19
- **Language:** TypeScript 5.6
- **Database:** MongoDB (Mongoose 8.6)
- **AI:** OpenRouter (qwen/qwen3-coder:free)
- **Auth:** JWT + bcrypt
- **Validation:** Zod

---

## 🏆 Status

**✅ Production Ready**

- Authentication complete
- AI diet generation working
- AI workout generation working
- Frontend hooks integrated
- All tests passing
- Server stable

---

**Built for FitFlow**
