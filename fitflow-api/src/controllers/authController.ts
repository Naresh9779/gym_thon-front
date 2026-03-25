import { Request, Response } from 'express';
import { z } from 'zod';
import User from '../models/User';
import Subscription from '../models/Subscription';
import Session from '../models/Session';
import { hashPassword, comparePassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/auth';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

async function findValidSession(userId: string, refreshToken: string) {
  const sessions = await Session.find({ userId });
  for (const session of sessions) {
    if (!session.refreshTokenHash || !session.expiresAt) continue;
    const isValid = await comparePassword(refreshToken, session.refreshTokenHash as string);
    if (isValid && session.expiresAt > new Date()) return session;
  }
  return null;
}

/** Returns the user's currently active (non-expired) subscription, or null */
async function getActiveSub(userId: string) {
  return Subscription.findOne({
    userId,
    status: { $in: ['active', 'trial'] },
    endDate: { $gt: new Date() },
  }).lean();
}

// ── Register ─────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ ok: false, error: { message: 'Email already registered' } });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash, name, role: 'user' });

    // Create a 30-day trial subscription
    const trialSub = await Subscription.create({
      userId:         user._id,
      planName:       'Trial',
      price:          0,
      features:       { aiWorkoutPlan: false, aiDietPlan: false, leaveRequests: true, progressTracking: true },
      status:         'trial',
      startDate:      new Date(),
      endDate:        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      durationMonths: 1,
    });
    await User.findByIdAndUpdate(user._id, { activeSubscriptionId: trialSub._id });

    const accessToken  = signAccessToken({ userId: String(user._id), role: user.role });
    const refreshToken = signRefreshToken({ userId: String(user._id) });

    await Session.create({
      userId:           user._id,
      refreshTokenHash: await hashPassword(refreshToken),
      userAgent:        req.headers['user-agent'],
      ip:               req.ip,
      expiresAt:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      ok: true,
      data: {
        user:         { id: user._id, email: user.email, name: user.name, role: user.role, subscription: trialSub },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: { message: 'Validation error', details: error.errors } });
    }
    console.error('Register error:', error);
    res.status(500).json({ ok: false, error: { message: 'Registration failed' } });
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ ok: false, error: { message: 'Invalid credentials' } });

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ ok: false, error: { message: 'Invalid credentials' } });

    const accessToken  = signAccessToken({ userId: String(user._id), role: user.role });
    const refreshToken = signRefreshToken({ userId: String(user._id) });

    await Session.create({
      userId:           user._id,
      refreshTokenHash: await hashPassword(refreshToken),
      userAgent:        req.headers['user-agent'],
      ip:               req.ip,
      expiresAt:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const subscription = await getActiveSub(String(user._id));

    res.json({
      ok: true,
      data: {
        user: {
          id:           user._id,
          email:        user.email,
          name:         user.name,
          role:         user.role,
          profile:      user.profile,
          subscription: subscription ?? null,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: { message: 'Validation error', details: error.errors } });
    }
    console.error('Login error:', error);
    res.status(500).json({ ok: false, error: { message: 'Login failed' } });
  }
}

// ── Get current user ──────────────────────────────────────────────────────────

export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    const subscription = await getActiveSub(String(user._id));

    res.json({
      ok: true,
      data: {
        user: {
          id:           user._id,
          email:        user.email,
          name:         user.name,
          role:         user.role,
          profile:      user.profile,
          subscription: subscription ?? null,
          createdAt:    user.createdAt,
          updatedAt:    user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch user' } });
  }
}

// ── Refresh access token ──────────────────────────────────────────────────────

export async function refreshAccessToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ ok: false, error: { message: 'Refresh token required' } });
    }

    const decoded      = verifyRefreshToken(refreshToken);
    const validSession = await findValidSession(decoded.userId, refreshToken);
    if (!validSession) {
      return res.status(401).json({ ok: false, error: { message: 'Invalid or expired refresh token' } });
    }

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ ok: false, error: { message: 'User not found' } });

    const accessToken = signAccessToken({ userId: String(user._id), role: user.role });

    res.json({ ok: true, data: { accessToken } });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(401).json({ ok: false, error: { message: 'Invalid refresh token' } });
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(req: AuthRequest, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const session = await findValidSession(req.user?.userId as string, refreshToken);
      if (session) await Session.deleteOne({ _id: session._id });
    }
    res.json({ ok: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ ok: false, error: { message: 'Logout failed' } });
  }
}
