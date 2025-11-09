# FitFlow Production Deployment Guide

## ✅ Pre-Production Changes Completed

### Security Enhancements
- ✅ **Signup Disabled**: Public registration blocked at backend (returns 403)
- ✅ **Admin Auto-Creation**: Admin user automatically created on server startup
- ✅ **Database Cleaned**: All test data removed, only admin user remains
- ✅ **Auth UI Updated**: Login-only page (signup form removed)
- ✅ **/diet Page Removed**: Cleaned up unused route
- ✅ **Build Verified**: All 21 routes compile successfully

### Automatic Plan Generation 🔄
- ✅ **Daily Diet Generation**: Auto-generates diet plans at 2 AM daily for all active users
- ✅ **Workout Plan Renewal**: Auto-checks expired plans at 3 AM and generates new cycles
- ✅ **Progress-Based Adaptation**: Uses previous day's progress to adjust meal plans
- ✅ **Admin Manual Triggers**: Test/trigger generation via API endpoints

> 📖 **See [AUTOMATIC_PLAN_GENERATION.md](./AUTOMATIC_PLAN_GENERATION.md) for detailed documentation**

### Default Admin Credentials
```
Email: admin@fitflow.com
Password: ChangeMe123!
```
**⚠️ IMPORTANT**: Change these credentials immediately after first login in production!

---

## 🚀 Deployment Steps

### 1. Push to GitHub Repository

```bash
cd /workspaces/gym_thon-front
git add .
git commit -m "Production ready: Disable signup, add admin auto-creation, clean database"
git push origin main
```

### 2. Deploy Backend (Render or Railway)

#### Option A: Deploy to Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: fitflow-api
   - **Root Directory**: `fitflow-api`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or higher for production)

5. Add Environment Variables:
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

6. Deploy and note your backend URL (e.g., `https://fitflow-api.onrender.com`)

#### Option B: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Configure:
   - **Root Directory**: `fitflow-api`
   - Add the same environment variables as above
5. Deploy and note your backend URL

### 3. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `gym-app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Add Environment Variable:
```env
NEXT_PUBLIC_API_BASE_URL=https://fitflow-api.onrender.com
```
(Replace with your actual backend URL from step 2)

6. Click **Deploy**
7. Note your frontend URL (e.g., `https://fitflow.vercel.app`)

### 4. Update Backend CORS

After deploying frontend:

1. Go back to your backend deployment (Render/Railway)
2. Update the `CORS_ORIGIN` environment variable:
```env
CORS_ORIGIN=https://fitflow.vercel.app
```
(Replace with your actual Vercel URL)

3. Save and redeploy backend

### 5. Verify Deployment

1. **Visit Frontend URL**: Open your Vercel URL
2. **Test Login**: 
   - Email: `admin@fitflow.com`
   - Password: `ChangeMe123!`
3. **Verify Features**:
   - ✅ Login works
   - ✅ No signup option visible
   - ✅ Admin dashboard accessible
   - ✅ Can generate workout/diet plans
   - ✅ User creation works (admin only)

### 6. Security Checklist

- [ ] Change default admin password immediately
- [ ] Verify signup returns 403 error
- [ ] Confirm CORS only allows your frontend domain
- [ ] Test that non-admin users cannot access admin routes
- [ ] Enable MongoDB Atlas IP whitelist (if needed)
- [ ] Set up domain SSL (automatically handled by Vercel/Render)

---

## 📊 Backend Auto-Creation

The admin user is automatically created when the backend starts if no admin exists:

```typescript
// In src/server.ts
async function ensureAdmin() {
  const adminEmail = ENV.ADMIN_EMAIL || 'admin@fitflow.com';
  const existingAdmin = await User.findOne({ email: adminEmail });
  
  if (!existingAdmin) {
    // Creates admin with hashed password from ENV variables
    console.log('✅ Admin user created:', adminEmail);
  } else {
    console.log('✅ Admin user exists:', adminEmail);
  }
}
```

**This runs automatically on every deployment**, ensuring admin access is always available.

---

## 🗄️ Database Management

### Reset Database (if needed)

To clear all non-admin data in production:

```bash
cd fitflow-api
# Set MONGODB_URI to your production database
export MONGODB_URI="your-production-mongodb-uri"
node scripts/reset_db.js
```

**⚠️ WARNING**: This deletes all data except admin users. Use with caution in production!

---

## 🔧 Environment Variables Reference

### Backend (fitflow-api)
| Variable | Description | Required |
|----------|-------------|----------|
| MONGODB_URI | MongoDB connection string | ✅ Yes |
| JWT_SECRET | JWT signing key (min 32 chars) | ✅ Yes |
| JWT_REFRESH_SECRET | Refresh token key (min 32 chars) | ✅ Yes |
| CORS_ORIGIN | Frontend URL for CORS | ✅ Yes |
| ADMIN_EMAIL | Auto-created admin email | ⚠️ Default: admin@fitflow.com |
| ADMIN_PASSWORD | Auto-created admin password | ⚠️ Default: ChangeMe123! |
| ADMIN_NAME | Auto-created admin name | ⚠️ Default: Administrator |
| OPENROUTER_API_KEY | AI plan generation key | ✅ Yes |
| RAPIDAPI_KEY | Exercise animation API | ✅ Yes |
| NODE_ENV | Environment mode | ⚠️ Default: development |
| PORT | Server port | ⚠️ Default: 4000 |

### Frontend (gym-app)
| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_API_BASE_URL | Backend API URL | ✅ Yes |

---

## 📝 Post-Deployment Tasks

1. **Change Admin Password**:
   - Login as admin
   - Go to Profile/Settings
   - Update password immediately

2. **Create Initial Users**:
   - Admin can create user accounts via `/users/add`
   - Each user gets unique login credentials

3. **Test Plan Generation**:
   - Generate sample workout plan
   - Generate sample diet plan
   - Verify AI generation works

4. **Monitor Logs**:
   - Check backend logs for errors
   - Verify admin creation message appears
   - Monitor API response times

---

## 🆘 Troubleshooting

### "Signup disabled" error
✅ **Expected behavior** - Public signup is intentionally blocked

### Admin auto-creation not working
- Check backend logs for "Admin user created" or "Admin user exists"
- Verify ADMIN_EMAIL, ADMIN_PASSWORD in environment variables
- Ensure MONGODB_URI is correct

### CORS errors
- Verify CORS_ORIGIN matches exact frontend URL (no trailing slash)
- Check browser console for exact error message
- Redeploy backend after changing CORS_ORIGIN

### Database connection failed
- Verify MONGODB_URI format and credentials
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for cloud platforms)
- Test connection string locally first

---

## 🎯 Production URLs

**Frontend**: `https://[your-app].vercel.app`  
**Backend**: `https://[your-app].onrender.com` or `https://[your-app].railway.app`  
**Database**: MongoDB Atlas (cloud-hosted)

**Admin Login**: `admin@fitflow.com` / `ChangeMe123!` (change immediately!)

---

## ✨ Features Available in Production

- ✅ Secure authentication (JWT-based)
- ✅ Admin-only user creation
- ✅ AI-powered workout generation
- ✅ AI-powered diet generation
- ✅ Progress tracking with active days
- ✅ Monthly workout/diet reports
- ✅ Exercise animations via RapidAPI
- ✅ Real-time meal and workout logging
- ✅ Role-based access control (admin/user)

---

**🚀 Ready to deploy!** Follow the steps above to get FitFlow live in production.
