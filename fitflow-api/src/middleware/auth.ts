import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email: string;
    name: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: { message: 'Unauthorized: No token provided' } });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    // Optionally fetch full user from DB
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: 'User not found' } });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, error: { message: 'Token expired' } });
    }
    return res.status(401).json({ ok: false, error: { message: 'Invalid token' } });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: { message: 'Forbidden: Admin only' } });
  }
  next();
}
