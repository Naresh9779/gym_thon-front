# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment (Complete these BEFORE deploying)

### 1. Security Review
- [ ] All sensitive data removed from code (no hardcoded secrets)
- [ ] `.env` files NOT committed to git
- [ ] `.env.example` files created and documented
- [ ] Strong admin password set (min 16 characters, mixed)
- [ ] JWT secrets generated (min 32 characters random)
- [ ] MongoDB Atlas IP whitelist configured (0.0.0.0/0 for cloud platforms)

### 2. Code Quality
- [ ] Backend builds successfully: `cd fitflow-api && npm run build`
- [ ] Frontend builds successfully: `cd gym-app && npm run build`
- [ ] No TypeScript errors
- [ ] No console.errors in production code (use proper logging)
- [ ] All TODO comments reviewed and resolved

### 3. Configuration
- [ ] CORS_ORIGIN points to production frontend URL
- [ ] NODE_ENV set to "production"
- [ ] Rate limiting configured (currently: 2 req/2min for plan generation)
- [ ] MongoDB connection string uses production database
- [ ] All API keys valid and have sufficient credits

## 🔧 Backend Deployment (Render.com)

### Step 1: Push to GitHub
```bash
cd /workspaces/gym_thon-front
git add -A
git commit -m "chore: production ready - all features tested"
git push origin main
```

### Step 2: Create Render Web Service
1. Go to [render.com](https://render.com) and sign in
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repository: `Naresh9779/gym_thon-front`
4. **Configure**:
   - **Name**: `fitflow-api` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `fitflow-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

### Step 3: Add Environment Variables
Copy from `fitflow-api/.env.example` and add these in Render dashboard:

```
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE?retryWrites=true&w=majority
JWT_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
CORS_ORIGIN=https://your-frontend.vercel.app
ADMIN_EMAIL=admin@fitflow.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_NAME=Administrator
OPENROUTER_API_KEY=sk-or-v1-your_key
RAPIDAPI_KEY=your_key
NODE_ENV=production
PORT=4000
```

**Important**: Replace ALL placeholder values with real credentials!

### Step 4: Deploy
- Click **"Create Web Service"**
- Wait 5-10 minutes for build and deployment
- Note your backend URL: `https://fitflow-api.onrender.com` (example)

### Step 5: Verify Backend
```bash
# Health check
curl https://your-backend-url.onrender.com/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-10T..."}
```

## 🎨 Frontend Deployment (Vercel)

### Step 1: Create Vercel Project
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New" → "Project"**
3. Import repository: `Naresh9779/gym_thon-front`
4. **Configure**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `gym-app`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

### Step 2: Add Environment Variable
In Vercel project settings → Environment Variables:

```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.onrender.com
```

**CRITICAL**: Use the actual Render URL from Step 4 above (no trailing slash!)

### Step 3: Deploy
- Click **"Deploy"**
- Wait 3-5 minutes for build
- Note your frontend URL: `https://fitflow.vercel.app` (example)

### Step 4: Update Backend CORS
1. Go back to Render dashboard
2. Select `fitflow-api` service
3. Go to **Environment** tab
4. Update `CORS_ORIGIN` with your Vercel URL:
   ```
   CORS_ORIGIN=https://fitflow.vercel.app
   ```
5. Save → Service auto-redeploys in ~2 minutes

## ✅ Post-Deployment Verification

### 1. Backend Health
```bash
# Test health endpoint
curl https://your-backend.onrender.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Frontend Access
1. Open: `https://your-frontend.vercel.app`
2. Should see landing/auth page
3. No console errors in browser DevTools

### 3. Admin Login Test
1. Navigate to `/auth`
2. Login with credentials from ADMIN_EMAIL/ADMIN_PASSWORD
3. Should redirect to `/dashboard`
4. Verify all navigation links work

### 4. Core Features Test
- [ ] **Dashboard**: Metrics display correctly
- [ ] **Users**: Can view user list
- [ ] **Create User**: Can add new user with subscription
- [ ] **Generate Workout**: Can generate workout plan
  - Select 4 days/week → verify plan has exactly 4 days
  - Check exercises have proper sets/reps/rest
- [ ] **Generate Diet**: Can generate diet plan
  - Verify meals show with foods and macros
  - Check daily calories match targets
- [ ] **Edit Plans**: Can edit workout/diet plans manually
  - Add/remove exercises and meals
  - Changes save successfully
- [ ] **Progress Tracking**: User can log meals and workouts
- [ ] **Analytics**: Reports generate for users

### 5. Rate Limiting Test
Try generating multiple workout plans quickly:
- First 2 should succeed
- 3rd within 2 minutes should fail with rate limit error
- Toasts should show error message (not browser alerts!)

### 6. Automatic Plan Generation
Check Render logs for scheduled jobs:
```
[PlanScheduler] Scheduled jobs started
[PlanScheduler] Daily diet generation: 0 2 * * * (2 AM)
[PlanScheduler] Workout expiry check: 0 3 * * * (3 AM)
```

## 🔒 Security Post-Deployment

### 1. Change Admin Password
1. Login as admin
2. Go to Profile
3. Update to strong unique password
4. Logout and test new password

### 2. Verify Signup Blocked
```bash
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# Expected: {"ok":false,"error":{"message":"Signup disabled - admin only"}}
```

### 3. Test CORS Protection
- Try accessing API from random domain → should fail
- Access from your Vercel domain → should work

## 📊 Monitoring

### Backend Logs (Render)
- Dashboard → Your Service → **Logs** tab
- Look for:
  - ✓ MongoDB connected
  - ✓ Admin exists: admin@fitflow.com
  - ✓ Scheduled jobs started
  - ✓ Server listening on port

### Frontend Logs (Vercel)
- Dashboard → Your Project → **Deployments** → Latest → **Function Logs**
- Check for build errors or runtime issues

### Error Monitoring
Watch for:
- 429 errors (rate limiting - normal)
- 401 errors (auth issues - investigate)
- 500 errors (server errors - fix ASAP)
- MongoDB connection failures
- OpenRouter API errors (check credits/limits)

## 🆘 Troubleshooting

### Backend won't start
**Check**:
- All environment variables set in Render
- MongoDB URI valid (test connection from MongoDB Atlas)
- Build logs for errors
- Node version >=18

### Frontend can't connect to backend
**Check**:
- NEXT_PUBLIC_API_BASE_URL is correct (no trailing slash)
- Backend CORS_ORIGIN includes frontend URL
- Backend is running (health check passes)
- Network tab in DevTools for CORS errors

### Workout plans not respecting days/week
**Check**:
- Frontend sending `daysPerWeek` in request body
- Backend receiving and passing to service
- OpenRouter API key valid and has credits
- Check Render logs for generation details

### Rate limit errors
**Normal** - working as designed:
- 2 plan generations per 2 minutes per user
- 5 AI operations per 10 minutes per user
- User sees toast notification (not browser alert)

### Automatic generation not running
**Check**:
- Render instance doesn't sleep (Free tier sleeps after 15min inactivity)
- Upgrade to paid tier for 24/7 uptime
- Or: Manually trigger via admin API as needed
- Check server timezone (cron runs at 2 AM/3 AM server time)

## 🎉 Production Ready!

**Your URLs**:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-api.onrender.com`

**Admin Access**:
- Email: Set in ADMIN_EMAIL
- Password: Set in ADMIN_PASSWORD (CHANGE IMMEDIATELY!)

**Features Live**:
- ✅ Secure JWT authentication
- ✅ Admin-only user creation
- ✅ AI workout generation (respects days/week selection)
- ✅ AI diet generation
- ✅ Manual plan editing (full CRUD)
- ✅ Progress tracking
- ✅ Analytics and reports
- ✅ Rate limiting and security
- ✅ Toast notifications (no browser alerts)
- ✅ Automatic daily diet generation (2 AM)
- ✅ Automatic workout renewal (3 AM)

**Next Steps**:
1. Test all features thoroughly
2. Add users and generate plans
3. Monitor logs for first 24 hours
4. Gather user feedback
5. Iterate and improve

---

**Need Help?**
- Backend logs: Render dashboard → Logs tab
- Frontend logs: Vercel dashboard → Function Logs
- MongoDB: Atlas dashboard → Monitoring
- API errors: Check OpenRouter/RapidAPI dashboards for usage/limits
