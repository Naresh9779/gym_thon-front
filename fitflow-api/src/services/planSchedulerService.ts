import cron from 'node-cron';
import User from '../models/User';
import WorkoutPlan from '../models/WorkoutPlan';

/**
 * Plan Scheduler Service
 * Handles lightweight background housekeeping tasks only.
 * Plan generation is now user/admin-triggered via check-in flow.
 */
class PlanSchedulerService {
  private subscriptionStatusCronJob: cron.ScheduledTask | null = null;
  private workoutExpiryCronJob: cron.ScheduledTask | null = null;

  private lastExecutionTimes = {
    subscriptionUpdate: null as Date | null,
    workoutExpiry: null as Date | null,
  };

  private executionCounts = {
    subscriptionUpdate: 0,
    workoutExpiry: 0,
  };

  /**
   * Auto-expire subscriptions based on endDate
   * Runs every day at 1 AM (server time)
   */
  async triggerSubscriptionUpdate() {
    this.lastExecutionTimes.subscriptionUpdate = new Date();
    this.executionCounts.subscriptionUpdate++;

    try {
      console.log('[PlanScheduler] Checking for expired subscriptions...');

      const result = await User.updateMany(
        {
          'subscription.status': { $in: ['active', 'trial'] },
          'subscription.endDate': { $lt: new Date() },
        },
        { $set: { 'subscription.status': 'expired' } }
      );

      console.log(`[PlanScheduler] ✓ Auto-expired ${result.modifiedCount} subscriptions`);
    } catch (error) {
      console.error('[PlanScheduler] Subscription status update failed:', error);
    }
  }

  /**
   * Mark expired workout plans as 'completed' (housekeeping only — no re-generation)
   * Runs every day at 2 AM (server time)
   */
  async triggerWorkoutExpiryMark() {
    this.lastExecutionTimes.workoutExpiry = new Date();
    this.executionCounts.workoutExpiry++;

    try {
      console.log('[PlanScheduler] Marking expired workout plans as completed...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await WorkoutPlan.updateMany(
        { status: 'active', endDate: { $lt: today } },
        { $set: { status: 'completed' } }
      );

      console.log(`[PlanScheduler] ✓ Marked ${result.modifiedCount} workout plans as completed`);
    } catch (error) {
      console.error('[PlanScheduler] Workout expiry mark failed:', error);
    }
  }

  start() {
    console.log('[PlanScheduler] Starting housekeeping scheduler...');

    // Subscription status update: Every day at 1:00 AM
    this.subscriptionStatusCronJob = cron.schedule('0 1 * * *', async () => {
      await this.triggerSubscriptionUpdate();
    });

    // Workout plan expiry mark: Every day at 2:00 AM
    this.workoutExpiryCronJob = cron.schedule('0 2 * * *', async () => {
      await this.triggerWorkoutExpiryMark();
    });

    console.log('[PlanScheduler] ✓ Scheduled jobs started:');
    console.log('  - Subscription status update: 1:00 AM');
    console.log('  - Workout plan expiry mark: 2:00 AM');
  }

  stop() {
    this.subscriptionStatusCronJob?.stop();
    this.subscriptionStatusCronJob = null;
    this.workoutExpiryCronJob?.stop();
    this.workoutExpiryCronJob = null;
    console.log('[PlanScheduler] Scheduled jobs stopped');
  }

  getStatus() {
    return {
      isRunning: !!(this.subscriptionStatusCronJob || this.workoutExpiryCronJob),
      serverTime: new Date().toISOString(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      schedules: {
        subscriptionUpdate: {
          cron: '0 1 * * *',
          description: 'Daily at 1:00 AM — auto-expire subscriptions',
          isActive: !!this.subscriptionStatusCronJob,
          lastExecution: this.lastExecutionTimes.subscriptionUpdate?.toISOString() ?? null,
          executionCount: this.executionCounts.subscriptionUpdate,
        },
        workoutExpiry: {
          cron: '0 2 * * *',
          description: 'Daily at 2:00 AM — mark expired workout plans as completed',
          isActive: !!this.workoutExpiryCronJob,
          lastExecution: this.lastExecutionTimes.workoutExpiry?.toISOString() ?? null,
          executionCount: this.executionCounts.workoutExpiry,
        },
      },
    };
  }
}

export const planSchedulerService = new PlanSchedulerService();
