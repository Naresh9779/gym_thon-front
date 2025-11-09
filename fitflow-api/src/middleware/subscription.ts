import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import User from '../models/User';

/**
 * Middleware to check if user's subscription is active
 * Admins bypass this check
 */
export async function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    // Admin bypasses subscription check
    if (role === 'admin') {
      return next();
    }

    // Check user subscription
    const user = await User.findById(userId).select('subscription').lean();
    
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: { message: 'User not found' },
      });
    }

    // Check if subscription exists and has endDate
    if (!user.subscription || !user.subscription.endDate) {
      return res.status(403).json({
        ok: false,
        error: {
          message: 'No active subscription',
          code: 'SUBSCRIPTION_REQUIRED',
        },
      });
    }

    // Check if subscription has expired
    const now = new Date();
    const endDate = new Date(user.subscription.endDate);

    if (now > endDate || user.subscription.status === 'expired') {
      return res.status(403).json({
        ok: false,
        error: {
          message: 'Subscription has expired',
          code: 'SUBSCRIPTION_EXPIRED',
          expiredOn: endDate.toISOString(),
        },
      });
    }

    // Subscription is active
    next();
  } catch (error) {
    console.error('[Subscription Middleware] Error:', error);
    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to verify subscription' },
    });
  }
}
