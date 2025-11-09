import { Request, Response, NextFunction } from 'express';
import AdminLog from '../models/AdminLog';
import { AuthRequest } from './auth';

/**
 * Middleware to log admin actions
 */
export function logAdminAction(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Store action info in request for post-processing
    (req as any).adminAction = {
      action,
      timestamp: new Date()
    };
    
    // Continue to route handler
    next();
  };
}

/**
 * Utility function to save admin log
 */
export async function saveAdminLog(
  adminId: string,
  adminEmail: string,
  action: string,
  details: Record<string, any> = {},
  targetUserId?: string,
  targetUserEmail?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await AdminLog.create({
      adminId,
      adminEmail,
      action,
      targetUserId,
      targetUserEmail,
      details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('[AdminLog] Failed to save log:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}
