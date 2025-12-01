import { Router } from 'express';
import { planSchedulerService } from '../services/planSchedulerService';

const router = Router();

/**
 * Verify request is from authorized cron source
 * For Vercel Cron or external services like cron-job.org
 */
function verifyCronRequest(req: any, res: any, next: any) {
  // Check for secret in query param or header
  const secret = req.query.secret || req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Cron] Development mode - skipping auth');
    return next();
  }

  // In production, require secret
  if (!expectedSecret) {
    console.error('[Cron] CRON_SECRET not configured in environment');
    return res.status(500).json({ 
      ok: false, 
      error: 'Server misconfiguration' 
    });
  }

  if (secret !== expectedSecret) {
    console.error('[Cron] Invalid secret provided');
    return res.status(401).json({ 
      ok: false, 
      error: 'Unauthorized' 
    });
  }

  next();
}

/**
 * POST /api/cron/subscription-update
 * Runs daily at 1 AM - Updates expired subscriptions
 */
router.post('/subscription-update', verifyCronRequest, async (req, res) => {
  try {
    console.log('[Cron] Subscription update triggered');
    await planSchedulerService.triggerSubscriptionUpdate();
    
    res.json({ 
      ok: true, 
      message: 'Subscription update completed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Cron] Subscription update failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/cron/daily-diet
 * Runs daily at 2 AM - Generates diet plans for all users
 */
router.post('/daily-diet', verifyCronRequest, async (req, res) => {
  try {
    console.log('[Cron] Daily diet generation triggered');
    await planSchedulerService.triggerDailyDietGeneration();
    
    res.json({ 
      ok: true, 
      message: 'Daily diet generation completed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Cron] Daily diet generation failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/cron/workout-expiry
 * Runs daily at 3 AM - Checks and handles expired workout plans
 */
router.post('/workout-expiry', verifyCronRequest, async (req, res) => {
  try {
    console.log('[Cron] Workout expiry check triggered');
    await planSchedulerService.triggerWorkoutExpiryCheck();
    
    res.json({ 
      ok: true, 
      message: 'Workout expiry check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Cron] Workout expiry check failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/cron/run-all
 * Runs all scheduled tasks in sequence (for Vercel free plan with 1 cron job limit)
 * Runs daily at 2 AM UTC
 */
router.post('/run-all', verifyCronRequest, async (req, res) => {
  try {
    console.log('[Cron] Running all scheduled tasks...');
    
    const results = {
      subscriptionUpdate: { ok: false, message: '' },
      dailyDiet: { ok: false, message: '' },
      workoutExpiry: { ok: false, message: '' }
    };

    // Task 1: Update expired subscriptions
    try {
      console.log('[Cron] 1/3 - Subscription update starting...');
      await planSchedulerService.triggerSubscriptionUpdate();
      results.subscriptionUpdate = { ok: true, message: 'Completed' };
      console.log('[Cron] 1/3 - Subscription update completed ✓');
    } catch (error: any) {
      console.error('[Cron] Subscription update failed:', error);
      results.subscriptionUpdate = { ok: false, message: error.message };
    }

    // Task 2: Generate daily diet plans
    try {
      console.log('[Cron] 2/3 - Daily diet generation starting...');
      await planSchedulerService.triggerDailyDietGeneration();
      results.dailyDiet = { ok: true, message: 'Completed' };
      console.log('[Cron] 2/3 - Daily diet generation completed ✓');
    } catch (error: any) {
      console.error('[Cron] Daily diet generation failed:', error);
      results.dailyDiet = { ok: false, message: error.message };
    }

    // Task 3: Check workout expiry
    try {
      console.log('[Cron] 3/3 - Workout expiry check starting...');
      await planSchedulerService.triggerWorkoutExpiryCheck();
      results.workoutExpiry = { ok: true, message: 'Completed' };
      console.log('[Cron] 3/3 - Workout expiry check completed ✓');
    } catch (error: any) {
      console.error('[Cron] Workout expiry check failed:', error);
      results.workoutExpiry = { ok: false, message: error.message };
    }

    console.log('[Cron] All scheduled tasks completed');

    res.json({ 
      ok: true, 
      message: 'All scheduled tasks completed',
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error: any) {
    console.error('[Cron] Run-all failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/cron/health
 * Health check for cron endpoints
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Cron endpoints are healthy',
    endpoints: [
      'POST /api/cron/run-all (combined - all tasks)',
      'POST /api/cron/subscription-update',
      'POST /api/cron/daily-diet',
      'POST /api/cron/workout-expiry'
    ]
  });
});

export default router;
