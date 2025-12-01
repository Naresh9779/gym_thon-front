import cron from 'node-cron';
import User from '../models/User';
import DietPlan from '../models/DietPlan';
import WorkoutPlan from '../models/WorkoutPlan';
import ProgressLog from '../models/ProgressLog';
import { dietGenerationService } from './dietGenerationService';
import { workoutGenerationService } from './workoutGenerationService';

/**
 * Plan Scheduler Service
 * Automatically generates diet and workout plans based on schedules
 */
class PlanSchedulerService {
  private dailyDietCronJob: cron.ScheduledTask | null = null;
  private workoutExpiryCronJob: cron.ScheduledTask | null = null;
  private subscriptionStatusCronJob: cron.ScheduledTask | null = null;
  
  // Track last execution times
  private lastExecutionTimes = {
    subscriptionUpdate: null as Date | null,
    dailyDiet: null as Date | null,
    workoutExpiry: null as Date | null,
  };

  // Track execution counts
  private executionCounts = {
    subscriptionUpdate: 0,
    dailyDiet: 0,
    workoutExpiry: 0,
  };

  /**
   * Auto-expire subscriptions based on endDate
   * Runs every day at 1 AM (server time)
   */
  private async updateExpiredSubscriptions() {
    this.lastExecutionTimes.subscriptionUpdate = new Date();
    this.executionCounts.subscriptionUpdate++;
    
    try {
      console.log('[PlanScheduler] Checking for expired subscriptions...');

      const now = new Date();

      // Find users with active subscriptions that have passed their endDate
      const result = await User.updateMany(
        {
          'subscription.status': { $in: ['active', 'trial'] },
          'subscription.endDate': { $lt: now },
        },
        {
          $set: { 'subscription.status': 'expired' },
        }
      );

      console.log(`[PlanScheduler] ✓ Auto-expired ${result.modifiedCount} subscriptions`);

    } catch (error) {
      console.error('[PlanScheduler] Subscription status update failed:', error);
    }
  }

  /**
   * Generate daily diet plan for all active users
   * Runs every day at 2 AM (server time)
   */
  private async generateDailyDietPlans() {
    this.lastExecutionTimes.dailyDiet = new Date();
    this.executionCounts.dailyDiet++;
    
    try {
      console.log('[PlanScheduler] Starting daily diet generation...');
      
      // Get all active users (non-admin users with complete profiles)
      const users = await User.find({
        role: { $ne: 'admin' },
        'profile.age': { $exists: true },
        'profile.weight': { $exists: true },
        'profile.height': { $exists: true },
      }).select('_id email name').lean();

      console.log(`[PlanScheduler] Found ${users.length} users for diet generation`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let generated = 0;
      let skipped = 0;
      let errors = 0;

      for (const user of users) {
        try {
          // Check if diet plan already exists for today
          const existingPlan = await DietPlan.findOne({
            userId: user._id,
            date: today,
          });

          if (existingPlan) {
            skipped++;
            continue;
          }

          // Get yesterday's progress log (if exists)
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          const yesterdayLog = await ProgressLog.findOne({
            userId: user._id,
            date: {
              $gte: yesterday,
              $lt: today,
            },
          }).sort({ date: -1 }).select('_id').lean();

          // Generate diet plan
          const generatedPlan = await dietGenerationService.generateDietPlan(
            user._id.toString(),
            today,
            yesterdayLog?._id.toString()
          );

          // Save to database
          await dietGenerationService.saveDietPlan(
            user._id.toString(),
            today,
            generatedPlan,
            'auto-daily',
            yesterdayLog?._id.toString()
          );

          generated++;
          console.log(`[PlanScheduler] ✓ Generated diet for ${user.email}`);

        } catch (error: any) {
          errors++;
          console.error(`[PlanScheduler] ✗ Failed for ${user.email}:`, error.message);
        }
      }

      console.log(`[PlanScheduler] Daily diet generation complete:`, {
        total: users.length,
        generated,
        skipped,
        errors,
      });

    } catch (error) {
      console.error('[PlanScheduler] Daily diet generation failed:', error);
    }
  }

  /**
   * Check for expired workout plans and generate new cycles
   * Runs every day at 3 AM (server time)
   */
  private async checkWorkoutPlanExpiry() {
    this.lastExecutionTimes.workoutExpiry = new Date();
    this.executionCounts.workoutExpiry++;
    
    try {
      console.log('[PlanScheduler] Checking for expired workout plans...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all active plans that have expired
      const expiredPlans = await WorkoutPlan.find({
        status: 'active',
        endDate: { $lt: today },
      }).populate('userId', 'email name profile').lean();

      console.log(`[PlanScheduler] Found ${expiredPlans.length} expired workout plans`);

      let generated = 0;
      let errors = 0;

      for (const expiredPlan of expiredPlans) {
        try {
          // Mark current plan as completed
          await WorkoutPlan.findByIdAndUpdate(expiredPlan._id, {
            status: 'completed',
          });

          // Check if user has complete profile
          const user = expiredPlan.userId as any;
          if (!user || !user.profile?.age || !user.profile?.weight || !user.profile?.height) {
            console.log(`[PlanScheduler] Skipping ${user?.email}: incomplete profile`);
            continue;
          }

          // Generate new workout cycle starting today
          const newCycleDuration = expiredPlan.duration || 4; // Keep same duration
          const newStartDate = new Date(today);

          // Check if new plan would overlap with existing plans
          const newEndDate = new Date(newStartDate);
          newEndDate.setDate(newEndDate.getDate() + newCycleDuration * 7 - 1);

          const overlap = await WorkoutPlan.findOne({
            userId: user._id,
            status: 'active',
            $or: [
              { startDate: { $lte: newEndDate }, endDate: { $gte: newStartDate } },
            ],
          });

          if (overlap) {
            console.log(`[PlanScheduler] Skipping ${user.email}: overlapping plan exists`);
            continue;
          }

          // Generate new workout cycle
          await workoutGenerationService.generateWorkoutCycle(
            user._id.toString(),
            newStartDate,
            newCycleDuration
          );

          generated++;
          console.log(`[PlanScheduler] ✓ Generated new workout cycle for ${user.email}`);

        } catch (error: any) {
          errors++;
          console.error(`[PlanScheduler] ✗ Failed to generate workout:`, error.message);
        }
      }

      console.log(`[PlanScheduler] Workout expiry check complete:`, {
        expired: expiredPlans.length,
        generated,
        errors,
      });

    } catch (error) {
      console.error('[PlanScheduler] Workout expiry check failed:', error);
    }
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    console.log('[PlanScheduler] Starting automatic plan generation scheduler...');

    // Subscription status update: Every day at 1:00 AM
    this.subscriptionStatusCronJob = cron.schedule('0 1 * * *', async () => {
      console.log('[PlanScheduler] Subscription status update triggered');
      await this.updateExpiredSubscriptions();
    });

    // Daily diet generation: Every day at 2:00 AM
    this.dailyDietCronJob = cron.schedule('0 2 * * *', async () => {
      console.log('[PlanScheduler] Daily diet generation triggered');
      await this.generateDailyDietPlans();
    });

    // Workout expiry check: Every day at 3:00 AM
    this.workoutExpiryCronJob = cron.schedule('0 3 * * *', async () => {
      console.log('[PlanScheduler] Workout expiry check triggered');
      await this.checkWorkoutPlanExpiry();
    });

    console.log('[PlanScheduler] ✓ Scheduled jobs started:');
    console.log('  - Subscription status update: 1:00 AM');
    console.log('  - Daily diet generation: 2:00 AM');
    console.log('  - Workout expiry check: 3:00 AM');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (this.subscriptionStatusCronJob) {
      this.subscriptionStatusCronJob.stop();
      this.subscriptionStatusCronJob = null;
    }
    if (this.dailyDietCronJob) {
      this.dailyDietCronJob.stop();
      this.dailyDietCronJob = null;
    }
    if (this.workoutExpiryCronJob) {
      this.workoutExpiryCronJob.stop();
      this.workoutExpiryCronJob = null;
    }
    console.log('[PlanScheduler] Scheduled jobs stopped');
  }

  /**
   * Manual trigger for testing (generates diet for today)
   */
  async triggerDailyDietGeneration() {
    console.log('[PlanScheduler] Manual trigger: Daily diet generation');
    await this.generateDailyDietPlans();
  }

  /**
   * Manual trigger for testing (checks workout expiry)
   */
  async triggerWorkoutExpiryCheck() {
    console.log('[PlanScheduler] Manual trigger: Workout expiry check');
    await this.checkWorkoutPlanExpiry();
  }

  /**
   * Manual trigger for subscription update (for Vercel Cron / external triggers)
   */
  async triggerSubscriptionUpdate() {
    console.log('[PlanScheduler] Manual trigger: Subscription update');
    await this.updateExpiredSubscriptions();
  }

  /**
   * Get status information about scheduled jobs
   */
  getStatus() {
    const now = new Date();
    const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return {
      isRunning: !!(this.dailyDietCronJob || this.workoutExpiryCronJob || this.subscriptionStatusCronJob),
      serverTime: now.toISOString(),
      serverTimezone,
      schedules: {
        subscriptionUpdate: {
          cron: '0 1 * * *',
          description: 'Daily at 1:00 AM',
          isActive: !!this.subscriptionStatusCronJob,
          lastExecution: this.lastExecutionTimes.subscriptionUpdate?.toISOString() || null,
          executionCount: this.executionCounts.subscriptionUpdate,
        },
        dailyDiet: {
          cron: '0 2 * * *',
          description: 'Daily at 2:00 AM',
          isActive: !!this.dailyDietCronJob,
          lastExecution: this.lastExecutionTimes.dailyDiet?.toISOString() || null,
          executionCount: this.executionCounts.dailyDiet,
        },
        workoutExpiry: {
          cron: '0 3 * * *',
          description: 'Daily at 3:00 AM',
          isActive: !!this.workoutExpiryCronJob,
          lastExecution: this.lastExecutionTimes.workoutExpiry?.toISOString() || null,
          executionCount: this.executionCounts.workoutExpiry,
        },
      },
    };
  }
}

// Export singleton instance
export const planSchedulerService = new PlanSchedulerService();
