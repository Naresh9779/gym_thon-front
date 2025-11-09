# Subscription & Plan Generation Fixes

## Overview
This document details the implementation of two critical fixes before production deployment:
1. **Plan Generation Fix**: AI now uses ALL user input fields (goals, preferences, restrictions)
2. **Subscription Management**: Complete subscription duration tracking with automatic access restriction

---

## 1. Plan Generation Fix

### Problem
- Workout and diet plans were ignoring user preferences and restrictions
- Only the first goal was being used (e.g., 'muscle_gain' but not 'endurance')
- Dietary preferences (vegetarian, vegan, etc.) not passed to AI
- Dietary restrictions (allergies, intolerances) not included in prompts

### Root Cause
- User model stored `goals: string[]` (array)
- Services used `goal: string` (singular) - only took first value
- Preferences and restrictions fields existed but weren't passed to AI prompts

### Solution

#### Backend Changes

**1. `src/services/workoutGenerationService.ts`**
```typescript
// OLD
interface UserContext {
  goal?: string;  // Single goal
  // preferences/restrictions not passed
}

// NEW
interface UserContext {
  goals?: string[];  // Array of goals
  preferences?: string[];
  restrictions?: string[];
}

// Updated buildWorkoutPrompt()
const primaryGoal = goals[0];
const allGoals = goals.join(', ');
// Prompt now includes:
// - "Primary Goal: muscle_gain"
// - "All Goals: muscle_gain, endurance"
// - "Preferences: home workouts, bodyweight"
// - "Restrictions: no jumping, knee issues"
```

**2. `src/services/dietGenerationService.ts`**
```typescript
// OLD
interface UserContext {
  goal: string;  // Single goal
  // preferences/restrictions not passed
}

// NEW
interface UserContext {
  goals: string[];  // Array of goals
  preferences?: string[];
  restrictions?: string[];
}

// Updated buildDietPrompt()
const primaryGoal = goals[0];  // For TDEE/macro calculations
const allGoals = goals.join(', ');  // For AI meal selection
// Prompt now includes all goals, preferences, restrictions
```

### Impact
- AI now receives complete user profile in every plan generation
- Workouts tailored to all goals (e.g., muscle gain + endurance = compound lifts + cardio)
- Diet plans respect dietary preferences (vegetarian, vegan, keto, etc.)
- Allergies and intolerances automatically excluded from meals

---

## 2. Subscription Management System

### Features
1. **Subscription Duration Tracking**
   - Start date, end date, duration in months
   - Automatic calculation when creating users
   - Admin can set custom durations (1-60 months)

2. **Automatic Access Restriction**
   - Middleware checks subscription on every request
   - Users with expired subscriptions get 403 errors
   - Admin role bypasses all checks

3. **Admin Subscription Management**
   - Extend/reduce by months or days
   - Set specific end date
   - Mark as expired immediately
   - Auto-calculates duration when dates change

### Implementation

#### Backend Changes

**1. User Model (`src/models/User.ts`)**
```typescript
subscription: {
  plan: { 
    type: String, 
    enum: ['free', 'basic', 'premium'], 
    default: 'free' 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'trial', 'expired'],  // Added 'expired'
    default: 'active' 
  },
  startDate: Date,      // NEW: When subscription started
  endDate: Date,        // NEW: When subscription expires
  durationMonths: Number // NEW: Duration in months
}
```

**2. Subscription Middleware (`src/middleware/subscription.ts`)**
```typescript
export async function requireActiveSubscription(req, res, next) {
  const { userId, role } = req.user;

  // Admin bypasses subscription checks
  if (role === 'admin') {
    return next();
  }

  // Find user and check subscription
  const user = await User.findById(userId).select('subscription');
  
  if (!user) {
    return res.status(404).json({ 
      ok: false, 
      error: 'User not found' 
    });
  }

  const { subscription } = user;
  
  // Check if subscription has expired
  if (!subscription.endDate) {
    return res.status(403).json({
      ok: false,
      error: {
        message: 'No active subscription found',
        code: 'NO_SUBSCRIPTION'
      }
    });
  }

  const now = new Date();
  const endDate = new Date(subscription.endDate);

  if (now > endDate || subscription.status === 'expired') {
    return res.status(403).json({
      ok: false,
      error: {
        message: 'Subscription has expired',
        code: 'SUBSCRIPTION_EXPIRED',
        expiredOn: endDate.toISOString()
      }
    });
  }

  next();
}
```

**3. Protected Routes**
Applied to:
- `src/routes/workouts.ts` - All workout plan access
- `src/routes/diet.ts` - All diet plan access
- `src/routes/progress.ts` - All progress tracking

```typescript
router.use(authenticate);
router.use(requireActiveSubscription);  // NEW
```

**4. Admin Endpoints (`src/routes/admin.ts`)**

**Create User with Subscription:**
```typescript
POST /api/admin/users
Body: {
  email: string,
  password: string,
  role: 'user' | 'trainer' | 'admin',
  subscriptionDurationMonths: number (default 1, range 1-60),
  profile: {
    name: string,
    age: number,
    gender: 'male' | 'female' | 'other',
    weight: number,
    height: number,
    bodyFat?: number,
    activityLevel: string,
    goals: string[],
    preferences?: string[],
    restrictions?: string[]
  }
}

// Auto-calculates:
subscription.startDate = new Date();
subscription.endDate = new Date(startDate + months);
subscription.durationMonths = months;
subscription.status = 'active';
```

**Update Subscription:**
```typescript
PATCH /api/admin/users/:userId/subscription
Body: {
  extendByMonths?: number,   // -120 to 120
  extendByDays?: number,     // -3650 to 3650
  setEndDate?: string,       // 'YYYY-MM-DD'
  status?: 'active' | 'inactive' | 'trial' | 'expired'
}

Examples:
// Extend by 3 months
{ extendByMonths: 3 }

// Reduce by 1 month (refund)
{ extendByMonths: -1 }

// Set specific end date
{ setEndDate: '2025-12-31' }

// Expire immediately
{ status: 'expired' }
```

#### Frontend Changes

**1. User Creation Form (`app/(admin)/users/add/page.tsx`)**

Added subscription duration field:
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <h3 className="text-lg font-semibold mb-4">Subscription Settings</h3>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Subscription Duration (Months) *
    </label>
    <input
      type="number"
      min="1"
      max="60"
      value={formData.subscriptionDurationMonths}
      onChange={(e) => handleInputChange('subscriptionDurationMonths', e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
      required
    />
    <p className="text-xs text-gray-500 mt-1">
      Subscription will be active for {formData.subscriptionDurationMonths} month(s) from creation
    </p>
  </div>
</div>
```

**2. User Detail Page (`app/(admin)/users/[id]/page.tsx`)**

**Enhanced Subscription Card:**
```tsx
<Card>
  <CardBody>
    <h3 className="text-lg font-semibold mb-4">Subscription</h3>
    <div className="space-y-2 text-sm">
      <div>
        <span className="text-gray-600">Plan:</span>{' '}
        <span className="font-medium capitalize">{userData.subscription.plan}</span>
      </div>
      <div>
        <span className="text-gray-600">Status:</span>{' '}
        <span className={`font-medium ${
          userData.subscription.status === 'active' ? 'text-green-600' : 
          userData.subscription.status === 'expired' ? 'text-red-600' : 
          'text-gray-600'
        }`}>
          {userData.subscription.status}
        </span>
      </div>
      {userData.subscription.startDate && (
        <div>
          <span className="text-gray-600">Start Date:</span>{' '}
          <span className="font-medium">
            {new Date(userData.subscription.startDate).toLocaleDateString()}
          </span>
        </div>
      )}
      {userData.subscription.endDate && (
        <div>
          <span className="text-gray-600">End Date:</span>{' '}
          <span className="font-medium">
            {new Date(userData.subscription.endDate).toLocaleDateString()}
          </span>
        </div>
      )}
      {userData.subscription.durationMonths && (
        <div>
          <span className="text-gray-600">Duration:</span>{' '}
          <span className="font-medium">
            {userData.subscription.durationMonths} months
          </span>
        </div>
      )}
      <div>
        <span className="text-gray-600">Role:</span>{' '}
        <span className="font-medium capitalize">{userData.role}</span>
      </div>
    </div>
    <div className="mt-4">
      <button
        onClick={() => setShowSubscriptionModal(true)}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Manage Subscription
      </button>
    </div>
  </CardBody>
</Card>
```

**Subscription Management Modal:**
```tsx
{showSubscriptionModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="text-xl font-bold mb-4">Manage Subscription</h3>
      
      {/* Action Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Action
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="radio" name="action" value="extend" />
            Extend/Reduce Subscription
          </label>
          <label className="flex items-center">
            <input type="radio" name="action" value="setDate" />
            Set End Date
          </label>
          <label className="flex items-center">
            <input type="radio" name="action" value="expire" />
            Mark as Expired
          </label>
        </div>
      </div>

      {/* Value Input (conditional based on action) */}
      {/* Months input for extend */}
      {/* Date picker for setDate */}
      {/* Warning text for expire */}

      <div className="flex gap-3">
        <button onClick={handleCancel}>Cancel</button>
        <button onClick={handleSubscriptionUpdate}>
          Update Subscription
        </button>
      </div>
    </div>
  </div>
)}
```

**Update Handler:**
```typescript
const handleSubscriptionUpdate = async () => {
  try {
    let payload: any = {};

    switch (subscriptionAction) {
      case 'extend':
        payload.extendByMonths = Number(subscriptionValue);
        break;
      case 'setDate':
        payload.setEndDate = subscriptionValue;
        break;
      case 'expire':
        payload.status = 'expired';
        break;
    }

    const response = await fetch(
      `http://localhost:4000/api/admin/users/${id}/subscription`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      alert('Subscription updated successfully');
      setShowSubscriptionModal(false);
      // Refresh user data
      fetchUserData();
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
    alert('Failed to update subscription');
  }
};
```

---

## 3. Error Handling

### Subscription Expired Error
When a user with an expired subscription tries to access plans:

**Response:**
```json
{
  "ok": false,
  "error": {
    "message": "Subscription has expired",
    "code": "SUBSCRIPTION_EXPIRED",
    "expiredOn": "2024-12-15T00:00:00.000Z"
  }
}
```

**Frontend Handling:**
- Display friendly error message
- Suggest contacting admin
- Redirect to profile page with notification

---

## 4. Testing Checklist

### Plan Generation Tests
- [ ] Create user with multiple goals (e.g., muscle_gain, endurance)
- [ ] Add preferences (e.g., home workouts, bodyweight)
- [ ] Add restrictions (e.g., no jumping, knee issues)
- [ ] Generate workout plan
- [ ] Verify AI prompt includes all goals, preferences, restrictions
- [ ] Check generated exercises respect preferences
- [ ] Create user with dietary preferences (vegetarian, vegan)
- [ ] Add dietary restrictions (dairy allergy, gluten intolerance)
- [ ] Generate diet plan
- [ ] Verify meals match preferences and avoid restrictions

### Subscription Tests
- [ ] Create user with 1 month subscription
- [ ] Verify startDate and endDate are set correctly
- [ ] Use admin endpoint to set endDate to yesterday
- [ ] Try to access /api/workouts as that user
- [ ] Verify 403 error with SUBSCRIPTION_EXPIRED code
- [ ] Test extend by 3 months
- [ ] Test reduce by 1 month
- [ ] Test set end date to specific date
- [ ] Test mark as expired
- [ ] Verify admin can access plans regardless of subscription
- [ ] Test subscription modal UI (all three actions)

---

## 5. Build Status

### Backend
```bash
cd fitflow-api && npm run build
✓ Compiled successfully
```

### Frontend
```bash
cd gym-app && npm run build
✓ Compiled successfully in 16.7s
✓ Finished TypeScript in 10.4s
✓ Collecting page data in 536.9ms
✓ Generating static pages (21/21) in 830.8ms
✓ Finalizing page optimization in 8.5ms

Routes: 21 total (all compiled successfully)
```

---

## 6. Database Migration

### Existing Users
Users created before these changes will have:
- `subscription.expiresAt` (old field)
- Missing: `startDate`, `endDate`, `durationMonths`

**Migration Options:**

1. **Automatic (Middleware handles gracefully)**
   - Middleware checks for `endDate`
   - If missing, returns NO_SUBSCRIPTION error
   - Admin must manually update subscription

2. **Manual Script** (Recommended)
```javascript
// Run in MongoDB or create migration script
db.users.find({ role: 'user' }).forEach(user => {
  if (!user.subscription.endDate) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    db.users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          'subscription.startDate': startDate,
          'subscription.endDate': endDate,
          'subscription.durationMonths': 1
        },
        $unset: { 'subscription.expiresAt': '' }
      }
    );
  }
});
```

---

## 7. Deployment Checklist

### Pre-Deployment
- [x] Fix plan generation (goals array)
- [x] Add subscription tracking (model)
- [x] Create subscription middleware
- [x] Apply middleware to routes
- [x] Add admin endpoints
- [x] Update frontend forms
- [x] Add subscription management UI
- [x] Build backend (no errors)
- [x] Build frontend (no errors)

### Testing
- [ ] Test plan generation with all fields
- [ ] Test subscription expiry
- [ ] Test subscription management UI
- [ ] Test middleware protection

### Production Deployment
- [ ] Commit changes to GitHub
- [ ] Deploy backend to Render
- [ ] Verify health check passes
- [ ] Migrate existing user subscriptions
- [ ] Deploy frontend to Vercel
- [ ] Update CORS_ORIGIN if needed
- [ ] Verify all pages load
- [ ] Test end-to-end workflows

---

## 8. API Documentation Updates

### New Endpoints

**Create User with Subscription**
```
POST /api/admin/users
Authorization: Bearer {admin-token}

Body:
{
  "email": "user@example.com",
  "password": "securepass123",
  "role": "user",
  "subscriptionDurationMonths": 3,
  "profile": {
    "name": "John Doe",
    "age": 30,
    "gender": "male",
    "weight": 80,
    "height": 180,
    "bodyFat": 15,
    "activityLevel": "moderate",
    "goals": ["muscle_gain", "endurance"],
    "preferences": ["home_workouts", "bodyweight"],
    "restrictions": ["no_jumping", "knee_issues"]
  }
}

Response:
{
  "ok": true,
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "user",
    "subscription": {
      "plan": "free",
      "status": "active",
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-04-15T00:00:00.000Z",
      "durationMonths": 3
    },
    "profile": { ... }
  }
}
```

**Update Subscription**
```
PATCH /api/admin/users/:userId/subscription
Authorization: Bearer {admin-token}

Examples:

// Extend by 3 months
{
  "extendByMonths": 3
}

// Reduce by 1 month
{
  "extendByMonths": -1
}

// Set specific end date
{
  "setEndDate": "2025-12-31"
}

// Expire immediately
{
  "status": "expired"
}

Response:
{
  "ok": true,
  "user": {
    "subscription": {
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-07-15T00:00:00.000Z",  // Updated
      "durationMonths": 6  // Auto-calculated
    }
  }
}
```

---

## 9. Benefits

### Plan Generation
- **Better AI Results**: Plans now include ALL user requirements
- **Personalization**: Every goal, preference, restriction considered
- **User Satisfaction**: Plans actually match what users asked for
- **Examples**:
  - Vegetarian user → No meat in diet plan
  - "No jumping" restriction → Only low-impact exercises
  - Multiple goals → Balanced approach (strength + cardio)

### Subscription Management
- **Automatic Protection**: Users can't access expired plans
- **Flexible Admin Control**: Extend, reduce, expire, set dates
- **Clear Tracking**: Exact start/end dates visible
- **Business Logic**: 
  - Trial periods (set 7-day end date)
  - Refunds (reduce duration)
  - Extensions (loyalty rewards)
  - Manual control (customer support)

---

## 10. Next Steps

1. **Local Testing** (30 minutes)
   - Test plan generation with complex profiles
   - Test subscription expiry flow
   - Test admin subscription management

2. **Production Deployment** (30 minutes)
   - Commit and push to GitHub
   - Deploy backend to Render
   - Migrate existing subscriptions
   - Deploy frontend to Vercel
   - Update environment variables

3. **Post-Deployment Verification** (15 minutes)
   - Create test user in production
   - Generate workout and diet plans
   - Verify all fields used correctly
   - Test subscription expiry
   - Monitor error logs

---

## Files Modified

### Backend (8 files)
1. `src/models/User.ts` - Added subscription fields
2. `src/middleware/subscription.ts` - Created middleware
3. `src/routes/workouts.ts` - Applied middleware
4. `src/routes/diet.ts` - Applied middleware
5. `src/routes/progress.ts` - Applied middleware
6. `src/routes/admin.ts` - Added subscription endpoints
7. `src/services/workoutGenerationService.ts` - Fixed goals handling
8. `src/services/dietGenerationService.ts` - Fixed goals handling

### Frontend (2 files)
1. `app/(admin)/users/add/page.tsx` - Added subscription duration field
2. `app/(admin)/users/[id]/page.tsx` - Added subscription management UI

### Documentation (1 file)
1. `SUBSCRIPTION_PLAN_FIXES.md` - This file
