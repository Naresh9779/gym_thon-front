# FitFlow - Deployment Checklist

## ✅ Pre-Deployment Completed

### Backend Changes
- [x] Public signup disabled (returns 403)
- [x] Admin auto-creation on startup
- [x] Database reset script created and executed
- [x] Automatic daily diet generation (2 AM)
- [x] Automatic workout plan renewal (3 AM)
- [x] Admin manual trigger endpoints
- [x] Graceful shutdown handling
- [x] TypeScript build successful

### Frontend Changes
- [x] Auth page: login-only (no signup)
- [x] /diet page removed
- [x] Navigation updated
- [x] Build successful (21 routes)

### Database
- [x] Cleaned (only admin@fitflow.com remains)
- [x] Default password: ChangeMe123!

---

## 🚀 Deployment Steps

### Step 1: Commit and Push to GitHub

```bash
cd /workspaces/gym_thon-front

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Production ready: Disable signup, add auto plan generation, clean database

- Backend: Disable public signup endpoint (returns 403)
- Backend: Auto-create admin on server startup
- Backend: Daily diet generation cron (2 AM)
- Backend: Workout plan expiry check cron (3 AM)
- Backend: Admin manual trigger endpoints
- Backend: Database reset script
- Frontend: Remove signup UI, login-only auth page
- Frontend: Remove /diet page
- Database: Clean all test data, preserve admin
- Docs: Production deployment guide
- Docs: Automatic plan generation documentation"

# Push to GitHub
git push origin main
```

### Step 2: Deploy Backend to Render

1. **Go to [render.com](https://render.com)**
2. **Sign in** with GitHub
3. **Click "New" → "Web Service"**
4. **Connect repository**: `gym_thon-front`
5. **Configure**:
   - Name: `fitflow-api`
   - Root Directory: `fitflow-api`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance Type: `Free` (or paid for production)

6. **Add Environment Variables**:

```env
MONGODB_URI=mongodb+srv://thapanaresh8412_db_user:7ICWa95tey5Fxvn3@cluster0.ptxfoed.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET=fitflow_jwt_secret_key_min_32_characters_long_2025

JWT_REFRESH_SECRET=fitflow_refresh_secret_key_min_32_chars_long_2025

CORS_ORIGIN=https://your-vercel-app.vercel.app

ADMIN_EMAIL=admin@fitflow.com

ADMIN_PASSWORD=ChangeMe123!

ADMIN_NAME=Administrator

OPENROUTER_API_KEY=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

RAPIDAPI_KEY=0a3405b70dmsh1fe0338bfc08839p1a5ecajsndd07961137d8

NODE_ENV=production

PORT=4000
```

7. **Click "Create Web Service"**
8. **Wait for deployment** (5-10 minutes)
9. **Note your backend URL**: `https://fitflow-api.onrender.com` (example)

### Step 3: Deploy Frontend to Vercel

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign in** with GitHub
3. **Click "Add New" → "Project"**
4. **Import repository**: `gym_thon-front`
5. **Configure**:
   - Framework Preset: `Next.js`
   - Root Directory: `gym-app`
   - Build Command: `npm run build`
   - Output Directory: `.next`

6. **Add Environment Variable**:

```env
NEXT_PUBLIC_API_BASE_URL=https://fitflow-api.onrender.com
```
*(Replace with actual backend URL from Step 2)*

7. **Click "Deploy"**
8. **Wait for deployment** (3-5 minutes)
9. **Note your frontend URL**: `https://fitflow.vercel.app` (example)

### Step 4: Update Backend CORS

1. **Go back to Render dashboard**
2. **Select** `fitflow-api` service
3. **Go to** Environment tab
4. **Update** `CORS_ORIGIN`:

```env
CORS_ORIGIN=https://fitflow.vercel.app
```
*(Replace with actual Vercel URL from Step 3)*

5. **Save Changes** → Service will auto-redeploy

### Step 5: Verify Deployment

#### Backend Health Check

```bash
curl https://fitflow-api.onrender.com/health
# Expected: { "status": "ok", "timestamp": "..." }
```

#### Frontend Access

1. Open browser: `https://fitflow.vercel.app`
2. Should see landing page

#### Login Test

1. Click "Get Started" or navigate to `/auth`
2. Login with:
   - Email: `admin@fitflow.com`
   - Password: `ChangeMe123!`
3. Should redirect to `/dashboard`

#### Admin Dashboard

Verify these features work:
- [ ] View metrics (users, plans)
- [ ] Create new user
- [ ] Generate workout plan for user
- [ ] Generate diet plan for user
- [ ] View user progress

#### Test Automatic Generation

Trigger manual generation to verify scheduler works:

```bash
# Get admin token first (after login, check browser localStorage or Network tab)
TOKEN="your-jwt-token"

# Trigger daily diet generation
curl -X POST https://fitflow-api.onrender.com/api/admin/scheduler/trigger-daily-diet \
  -H "Authorization: Bearer $TOKEN"

# Response: { "ok": true, "data": { "message": "Daily diet generation triggered..." } }

# Check logs in Render dashboard for progress
```

---

## 🔒 Post-Deployment Security

### 1. Change Admin Password

1. Login as admin
2. Go to Profile/Settings
3. Update password immediately
4. Use strong password (min 12 chars, mixed case, numbers, symbols)

### 2. Verify Signup is Blocked

```bash
# Try to signup (should fail with 403)
curl -X POST https://fitflow-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# Expected: { "ok": false, "error": { "message": "Signup disabled - admin only" } }
```

### 3. Test CORS

```bash
# Should work from your Vercel domain
# Should fail from other domains (check browser console)
```

---

## 📊 Monitoring

### Backend Logs (Render)

1. Go to Render dashboard
2. Select `fitflow-api`
3. Click "Logs" tab
4. Look for:
   - `✓ Admin exists: admin@fitflow.com`
   - `[PlanScheduler] Scheduled jobs started`
   - `🚀 FitFlow API listening on http://0.0.0.0:4000`

### Automatic Generation Logs

Daily at 2 AM and 3 AM (server time), check logs for:

```
[PlanScheduler] Daily diet generation triggered
[PlanScheduler] Starting daily diet generation...
[PlanScheduler] Found X users for diet generation
[PlanScheduler] ✓ Generated diet for user@example.com
[PlanScheduler] Daily diet generation complete: { total: X, generated: Y, skipped: Z, errors: 0 }
```

### Frontend Logs (Vercel)

1. Go to Vercel dashboard
2. Select your project
3. Click "Deployments" → latest deployment
4. Click "View Function Logs" (if using API routes)

---

## 🆘 Troubleshooting

### Backend won't start

**Check**:
- Environment variables are set correctly
- MongoDB URI is valid
- PORT is set to 4000
- Build logs for TypeScript errors

### Frontend can't connect to backend

**Check**:
- `NEXT_PUBLIC_API_BASE_URL` is correct
- Backend CORS_ORIGIN includes frontend URL
- Backend is running (health check passes)
- No trailing slashes in URLs

### Admin auto-creation failed

**Check logs for**:
```
Admin created: admin@fitflow.com
```

If not present:
- Check MONGODB_URI connection
- Verify ADMIN_EMAIL, ADMIN_PASSWORD in environment
- Check for database connection errors

### Automatic generation not working

**Check**:
- Server timezone (cron runs at 2 AM and 3 AM server time)
- Server stays running (doesn't restart daily)
- Check logs for cron trigger messages
- Manually trigger via admin API to test

### Database connection issues

**Check**:
- MongoDB Atlas IP whitelist: add `0.0.0.0/0` for Render
- Database user credentials are correct
- Cluster is not paused

---

## 📱 User Onboarding

### For Admin

1. Login with default credentials
2. Change password immediately
3. Update profile with real information
4. Test creating a user
5. Test generating plans

### For New Users

Admin creates users via:
- Dashboard → Users → Add User
- Or: API `POST /api/admin/users`

Users receive:
- Email address (username)
- Temporary password
- Should change password on first login

---

## 🔄 Future Updates

### Deploy New Changes

```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push origin main

# Render: Auto-deploys from main branch
# Vercel: Auto-deploys from main branch
```

### Rollback

**Render**:
1. Go to Deployments tab
2. Find previous working deployment
3. Click "Redeploy"

**Vercel**:
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

---

## ✅ Deployment Complete!

**Your URLs**:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.onrender.com`

**Admin Login**:
- Email: `admin@fitflow.com`
- Password: `ChangeMe123!` (change immediately!)

**Features Active**:
- ✅ Secure authentication (JWT)
- ✅ Admin-only user creation
- ✅ AI workout generation
- ✅ AI diet generation
- ✅ Daily automatic diet plans (2 AM)
- ✅ Automatic workout renewal (3 AM)
- ✅ Progress tracking
- ✅ Monthly reports

**Documentation**:
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Full deployment guide
- [AUTOMATIC_PLAN_GENERATION.md](./AUTOMATIC_PLAN_GENERATION.md) - Automatic generation docs
- [README.md](./README.md) - Project overview

🎉 **Congratulations! FitFlow is live in production!**
