import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import Subscription from '../models/Subscription';

/**
 * Middleware to check if user's subscription is active.
 * Reads directly from the Subscription collection — no embedded data on User.
 * Admins bypass this check.
 */
export async function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.userId;
    const role   = req.user?.role;

    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    }

    // Admins bypass subscription check
    if (role === 'admin') return next();

    const sub = await Subscription.findOne({
      userId,
      status:  { $in: ['active', 'trial'] },
      endDate: { $gt: new Date() },
    }).lean();

    if (!sub) {
      return res.status(403).json({
        ok: false,
        error: { message: 'No active subscription', code: 'SUBSCRIPTION_REQUIRED' },
      });
    }

    next();
  } catch (error) {
    console.error('[Subscription Middleware] Error:', error);
    return res.status(500).json({ ok: false, error: { message: 'Failed to verify subscription' } });
  }
}
