# 🚀 Quick Deployment Guide - Security & Subscription Update

## ✅ What We Just Deployed

### Security Features
- ✅ Automatic subscription status updates (daily at 1 AM)
- ✅ Enhanced password validation (8+ chars, uppercase, lowercase, number)
- ✅ Admin action logging framework
- ✅ Token expiry monitoring with auto-logout (1 min before expiry)
- ✅ Protected route guards with subscription checks
- ✅ Subscription validation on plan generation

### Bug Fixes
- ✅ Descriptive API error messages
- ✅ Subscription auto-activates when extended
- ✅ Admin cannot generate plans for expired users
- ✅ Expired users redirected to profile page

### New Features
- ✅ Today's workout/diet pages with progress tracking
- ✅ Individual meal detail pages
- ✅ Enhanced analytics dashboard
- ✅ Complete subscription management UI

---

## 🎯 Deployment Checklist

### Step 1: Backend (Render) ⏱️ 5-10 minutes

1. **Go to Render Dashboard**:
   - Visit https://dashboard.render.com
   - Find your `fitflow-api` service

2. **Trigger Manual Deploy**:
   - Click on your service
   - Click **Manual Deploy** → **Deploy latest commit**
   - Wait for build to complete (~3-5 minutes)

3. **Verify Deployment**:
   ```bash
   # Test health endpoint
   curl https://your-backend-url.onrender.com/health
   
   # Expected response:
   # {"status":"ok","timestamp":"..."}
   ```

4. **Check Logs**:
   - Click **Logs** tab in Render
   - Look for:
     - ✅ "Admin user exists: admin@fitflow.com"
     - ✅ "MongoDB connected successfully"
     - ✅ "Server running on port 4000"
     - ✅ "Cron jobs started" (3 jobs)

### Step 2: Frontend (Vercel) ⏱️ 3-5 minutes

1. **Go to Vercel Dashboard**:
   - Visit https://vercel.com/dashboard
   - Find your `gym-app` project

2. **Trigger Deployment**:
   - Vercel auto-deploys on git push (should be building now)
   - OR click **Deployments** → **Redeploy**
   - Wait for build (~2-3 minutes)

3. **Verify Build**:
   - Check build logs for "✓ Compiled successfully"
   - Should show 21 routes compiled
   - No TypeScript errors

### Step 3: Post-Deployment Verification ⏱️ 10 minutes

#### Test 1: Login & Security
- [ ] Visit your frontend URL
- [ ] Login with admin credentials
- [ ] Verify no signup option visible
- [ ] Check token expiry monitoring (console shows check every 30s)

#### Test 2: Subscription Features
- [ ] Go to Users list
- [ ] View user detail page
- [ ] Test "Extend Subscription" button
- [ ] Verify status auto-changes to "active"
- [ ] Try to generate plan for expired user (should fail with 403)

#### Test 3: Error Messages
- [ ] Logout
- [ ] Try login with wrong password
- [ ] Verify error message is descriptive (not "API Error: 403")

#### Test 4: Protected Routes
- [ ] Create/login as expired user
- [ ] Try to access `/home`, `/workout`, `/today-workout`
- [ ] Verify redirect to `/profile?subscription=expired`
- [ ] Check subscription expired message appears

#### Test 5: Auto-Logout
- [ ] Login as any user
- [ ] Wait 14 minutes (or check console for expiry timer)
- [ ] Should auto-logout at 14:00 mark (1 min before 15 min expiry)

#### Test 6: Plan Generation
- [ ] Login as admin
- [ ] Create new user with active subscription
- [ ] Generate workout plan → verify success
- [ ] Generate diet plan → verify success
- [ ] Expire user's subscription
- [ ] Try to generate plan → verify 403 error

#### Test 7: Cron Jobs (Check Tomorrow)
- [ ] Wait until 1:00 AM server time
- [ ] Check backend logs for "Auto-expired X subscriptions"
- [ ] Check users with past endDate have status='expired'

---

## 🔐 Security Checklist

- [ ] **Change Default Admin Password** (if not done already)
  - Go to Profile → Change Password
  - Use strong password (8+ chars, uppercase, lowercase, number)

- [ ] **Verify CORS Settings**
  - Backend CORS_ORIGIN matches frontend URL exactly
  - No trailing slash in URL

- [ ] **Check Environment Variables**
  - All secrets are set in production
  - JWT_SECRET and JWT_REFRESH_SECRET are different from development
  - OPENROUTER_API_KEY and RAPIDAPI_KEY are valid

- [ ] **Test Role-Based Access**
  - User cannot access admin routes
  - Expired user cannot access workout/diet pages

---

## 🔍 Monitoring

### Backend Logs (Render)
Watch for these messages:
```
✅ "MongoDB connected successfully"
✅ "Admin user exists: admin@fitflow.com"
✅ "Server running on port 4000"
✅ "Starting cron jobs..."
✅ "Cron: Daily diet generation at 2:00 AM"
✅ "Cron: Workout plan expiry check at 3:00 AM"
✅ "Cron: Subscription status update at 1:00 AM"
```

### Frontend Logs (Browser Console)
Watch for these messages:
```
✅ "[Auth] User authenticated"
✅ "[Auth] Checking token expiry..."
✅ "[Auth] Token expires in X seconds"
```

### Errors to Watch For
- ❌ "CORS policy" errors → Check CORS_ORIGIN
- ❌ "401 Unauthorized" → Token expired, should auto-logout
- ❌ "MongoDB connection failed" → Check MONGODB_URI
- ❌ "503 Service Unavailable" → Backend starting up (wait 1-2 min)

---

## 🆘 Troubleshooting

### Backend Won't Start
1. Check Render logs for errors
2. Verify all environment variables are set
3. Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0)
4. Verify build command: `npm install && npm run build`
5. Verify start command: `npm start`

### Frontend Build Fails
1. Check Vercel build logs
2. Verify NEXT_PUBLIC_API_BASE_URL is set
3. Check for TypeScript errors in logs
4. Verify build command: `npm run build`

### CORS Errors
1. Verify CORS_ORIGIN in backend matches frontend URL exactly
2. No trailing slash: ✅ `https://app.vercel.app` ❌ `https://app.vercel.app/`
3. Redeploy backend after changing CORS_ORIGIN

### Subscription Not Auto-Expiring
1. Wait until 1:00 AM server time (UTC)
2. Check backend logs for cron job execution
3. Manually trigger: The cron job runs automatically
4. Verify user's endDate is in the past

### Token Not Auto-Expiring
1. Check browser console for "[Auth] Checking token expiry..."
2. Verify message appears every 30 seconds
3. Check for logout at 14:00 mark (1 min before 15 min expiry)
4. Clear browser cache and try again

---

## 📊 Expected Production URLs

**Frontend**: `https://[your-app].vercel.app`  
**Backend**: `https://[your-app].onrender.com`

**Test Endpoints**:
```bash
# Health check
curl https://your-backend.onrender.com/health

# Login test (should fail with wrong password)
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fitflow.com","password":"wrong"}'

# Should return descriptive error message
```

---

## 🎉 Deployment Complete!

Once all checks pass:
1. ✅ Both frontend and backend deployed
2. ✅ Security features working
3. ✅ Subscription management functional
4. ✅ Error messages descriptive
5. ✅ Token expiry monitoring active
6. ✅ Protected routes enforcing subscription

**Next Steps**:
- Monitor logs for 24 hours
- Test with real users
- Check cron jobs execute at scheduled times
- Keep eye on MongoDB Atlas usage

**Need Help?**
- Check Render logs: https://dashboard.render.com
- Check Vercel logs: https://vercel.com/dashboard
- Review SECURITY_IMPLEMENTATION.md for complete guide
