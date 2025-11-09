# Automatic Plan Generation System

## Overview

FitFlow includes an **automatic plan generation system** that creates personalized workout and diet plans for users without manual intervention. This ensures users always have active plans and reduces admin workload.

## Features

### 1. Daily Diet Plan Generation 🍽️

**Schedule**: Every day at **2:00 AM** (server time)

**What it does**:
- Checks all active users (non-admin with complete profiles)
- Generates today's diet plan if one doesn't exist
- Uses yesterday's progress log to adapt meals
- Validates nutrition data with Nutritionix API
- Marks plans with `generatedFrom: 'auto-daily'`

**Requirements**:
- User must have complete profile (age, weight, height)
- No existing diet plan for today

**Progress Tracking**:
```typescript
// Example: User logs 80% of calories yesterday
// Today's plan will suggest easier-to-prepare meals
previousDayProgress: {
  caloriesConsumed: 1600,
  mealsLogged: 3,
  adherenceScore: 80
}
```

### 2. Workout Plan Expiry & Auto-Renewal 💪

**Schedule**: Every day at **3:00 AM** (server time)

**What it does**:
- Finds all active workout plans with `endDate < today`
- Marks expired plans as `status: 'completed'`
- Automatically generates new workout cycle for same user
- Uses same duration as previous cycle
- Checks for overlapping plans to avoid conflicts

**Expiry Logic**:
```typescript
// Example: User's 4-week plan ends today
// System automatically generates next 4-week cycle starting today
endDate: 2025-11-05 → status: 'completed'
newPlan: startDate: 2025-11-06, endDate: 2025-12-03
```

**Safety Checks**:
- ✅ No overlapping workout plans allowed
- ✅ User profile must be complete
- ✅ Previous plan must be marked completed

## Technical Implementation

### Service: `planSchedulerService.ts`

Located at: `fitflow-api/src/services/planSchedulerService.ts`

**Methods**:

1. **`start()`** - Initialize cron jobs on server startup
2. **`stop()`** - Gracefully stop all cron jobs (on shutdown)
3. **`triggerDailyDietGeneration()`** - Manual trigger for testing
4. **`triggerWorkoutExpiryCheck()`** - Manual trigger for testing

**Cron Schedule**:
```typescript
// Daily diet: Every day at 2:00 AM
cron.schedule('0 2 * * *', generateDailyDietPlans);

// Workout expiry: Every day at 3:00 AM
cron.schedule('0 3 * * *', checkWorkoutPlanExpiry);
```

### Integration with Server

**File**: `fitflow-api/src/server.ts`

The scheduler automatically starts when the server boots:

```typescript
async function start() {
  await connectDB();
  await ensureAdmin();
  
  // Start automatic plan generation
  planSchedulerService.start();
  
  app.listen(PORT, () => {
    console.log('✓ Automatic plan generation: ENABLED');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  planSchedulerService.stop();
  process.exit(0);
});
```

## Admin Manual Triggers

For testing or immediate plan generation, admins can manually trigger jobs via API:

### Trigger Daily Diet Generation

```bash
POST /api/admin/scheduler/trigger-daily-diet
Authorization: Bearer <admin-token>
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "message": "Daily diet generation triggered. Check server logs for progress."
  }
}
```

**Server Logs**:
```
[PlanScheduler] Manual trigger: Daily diet generation
[PlanScheduler] Starting daily diet generation...
[PlanScheduler] Found 15 users for diet generation
[PlanScheduler] ✓ Generated diet for user1@example.com
[PlanScheduler] ✓ Generated diet for user2@example.com
[PlanScheduler] Daily diet generation complete: { total: 15, generated: 12, skipped: 2, errors: 1 }
```

### Trigger Workout Expiry Check

```bash
POST /api/admin/scheduler/trigger-workout-expiry
Authorization: Bearer <admin-token>
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "message": "Workout expiry check triggered. Check server logs for progress."
  }
}
```

**Server Logs**:
```
[PlanScheduler] Manual trigger: Workout expiry check
[PlanScheduler] Checking for expired workout plans...
[PlanScheduler] Found 3 expired workout plans
[PlanScheduler] ✓ Generated new workout cycle for user1@example.com
[PlanScheduler] ✓ Generated new workout cycle for user2@example.com
[PlanScheduler] Workout expiry check complete: { expired: 3, generated: 2, errors: 1 }
```

## Database Models

### DietPlan Schema

```typescript
{
  userId: ObjectId,
  name: String,
  date: Date,
  dailyCalories: Number,
  macros: { protein, carbs, fats },
  meals: [{ name, time, foods, totalCalories, macros }],
  generatedFrom: 'manual' | 'ai' | 'auto-daily', // ← Auto-generated marked here
  previousDayProgressId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### WorkoutPlan Schema

```typescript
{
  userId: ObjectId,
  name: String,
  duration: Number, // weeks
  startDate: Date,
  endDate: Date,
  status: 'active' | 'completed' | 'cancelled', // ← Auto-marked as completed
  days: [{ day, exercises: [{ name, sets, reps, rest, notes }] }],
  generatedFrom: ObjectId, // references MonthlyWorkoutReport (optional)
  createdAt: Date,
  updatedAt: Date
}
```

## Production Considerations

### 1. Timezone Handling

The cron jobs run at **2 AM and 3 AM server time**. For production:

- Deploy backend to a server in your target timezone
- Or adjust cron schedule based on server's UTC offset
- Consider user's timezone when generating plans (stored in `user.profile.timezone`)

**Example**: Server in UTC, users in EST (-5 hours)
```typescript
// 2 AM UTC = 9 PM EST (previous day)
// Consider adjusting to: '0 7 * * *' (7 AM UTC = 2 AM EST)
```

### 2. API Rate Limits

**OpenRouter** (AI generation):
- Daily diet: ~15 users × 1 request = 15 requests/day
- Workout expiry: ~3 expired plans × 1 request = 3 requests/day
- **Total**: ~20 AI requests/day (well within free tier)

**Nutritionix** (food validation):
- Each diet plan: ~5 meals × 3 foods = 15 requests
- Daily total: 15 users × 15 = 225 requests/day
- **Total**: ~230 API requests/day (check rate limits)

### 3. Error Handling

The scheduler includes robust error handling:

- **User-level errors**: Logged but don't stop batch processing
- **Service errors**: Caught and reported in summary
- **Network failures**: Retry logic in API clients (OpenRouter, Nutritionix)

**Monitoring**:
```bash
# Check logs for generation summary
grep "PlanScheduler" /var/log/app.log

# Example output
[PlanScheduler] Daily diet generation complete: { total: 15, generated: 12, skipped: 2, errors: 1 }
[PlanScheduler] Workout expiry check complete: { expired: 3, generated: 2, errors: 1 }
```

### 4. Database Performance

**Indexes** (already configured):
```typescript
// DietPlan
{ userId: 1, date: 1 } // unique compound index

// WorkoutPlan
{ userId: 1 } // single field index
{ status: 1 } // for filtering active/completed plans

// ProgressLog
{ userId: 1, date: 1 } // for fetching previous day's progress
```

**Query Optimization**:
- Uses `.lean()` for read-only operations (faster)
- Limits results where appropriate
- Selects only necessary fields

## Testing

### Local Testing

1. **Manual trigger** (recommended):
```bash
# Login as admin
curl -X POST http://localhost:4000/api/admin/scheduler/trigger-daily-diet \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check logs
tail -f logs/app.log
```

2. **Adjust cron schedule** for faster testing:
```typescript
// In planSchedulerService.ts (temporary)
cron.schedule('*/1 * * * *', generateDailyDietPlans); // Every minute
```

3. **Direct service call**:
```typescript
// In a test script
import { planSchedulerService } from './services/planSchedulerService';
await planSchedulerService.triggerDailyDietGeneration();
```

### Production Testing

1. Deploy to staging environment first
2. Use manual triggers to verify functionality
3. Check server logs for errors
4. Monitor database for generated plans
5. Verify user notifications (if implemented)

## Monitoring & Alerts

**Recommended monitoring**:

1. **Daily generation success rate**:
   - Track: `generated / total` ratio
   - Alert if < 80% success rate

2. **API failures**:
   - Track: OpenRouter/Nutritionix errors
   - Alert on consecutive failures

3. **Database growth**:
   - Monitor: DietPlan, WorkoutPlan collection sizes
   - Implement cleanup for old plans (optional)

4. **Server logs**:
   - Retain logs for 30 days minimum
   - Archive for compliance if needed

## Future Enhancements

**Potential improvements**:

1. **User Preferences**:
   - Allow users to opt-in/opt-out of auto-generation
   - Set preferred generation time

2. **Smart Scheduling**:
   - Generate plans based on user's local timezone
   - Send notification when plan is ready

3. **Adaptive AI**:
   - Track long-term adherence trends
   - Adjust difficulty based on progress

4. **Batch Optimization**:
   - Group users by similar profiles
   - Use AI batching for cost efficiency

5. **Rollback Support**:
   - Keep backup of previous plan
   - Allow user to revert if needed

---

## Quick Reference

| Feature | Schedule | Action | Marker |
|---------|----------|--------|--------|
| Daily Diet | 2 AM daily | Generate today's diet | `generatedFrom: 'auto-daily'` |
| Workout Expiry | 3 AM daily | Mark expired, generate new | `status: 'completed'` → new plan |
| Manual Trigger | On-demand | Admin API call | Same markers |

**Admin Endpoints**:
- `POST /api/admin/scheduler/trigger-daily-diet`
- `POST /api/admin/scheduler/trigger-workout-expiry`

**Server Logs Location**:
- Development: Console output
- Production: Check your hosting platform's log viewer (Render, Railway, etc.)

---

## Troubleshooting

### Diet plans not generating

**Check**:
1. User has complete profile (age, weight, height)
2. No existing plan for today
3. Server cron job is running (check logs for "PlanScheduler")
4. OpenRouter API key is valid
5. Nutritionix API key is valid

### Workout plans not renewing

**Check**:
1. Current plan has `status: 'active'`
2. `endDate` is in the past
3. No overlapping plans exist
4. User profile is complete

### Cron jobs not running

**Check**:
1. Server timezone settings
2. Process stays alive (not restarting)
3. No unhandled promise rejections
4. Check `ps aux | grep node` for running processes

---

**🚀 Automatic plan generation is now active!** Users will receive fresh plans daily without admin intervention.
