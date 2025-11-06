import { Request, Response } from 'express';
import { z } from 'zod';
import User from '../models/User';
import Session from '../models/Session';
import { hashPassword, comparePassword, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/auth';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ ok: false, error: { message: 'Email already registered' } });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      name,
      role: 'user',
      subscription: {
        plan: 'free',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
      }
    });

    // Generate tokens
    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    // Store refresh token hash in session
    const refreshTokenHash = await hashPassword(refreshToken);
    await Session.create({
      userId: user._id,
      refreshTokenHash,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    res.status(201).json({
      ok: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscription: user.subscription
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: { message: 'Validation error', details: error.errors } });
    }
    console.error('Register error:', error);
    res.status(500).json({ ok: false, error: { message: 'Registration failed' } });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: 'Invalid credentials' } });
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ ok: false, error: { message: 'Invalid credentials' } });
    }

    // Generate tokens
    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    // Store refresh token
    const refreshTokenHash = await hashPassword(refreshToken);
    await Session.create({
      userId: user._id,
      refreshTokenHash,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.json({
      ok: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          profile: user.profile,
          subscription: user.subscription
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: { message: 'Validation error', details: error.errors } });
    }
    console.error('Login error:', error);
    res.status(500).json({ ok: false, error: { message: 'Login failed' } });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ ok: false, error: { message: 'User not found' } });
    }

    res.json({
      ok: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          profile: user.profile,
          subscription: user.subscription,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch user' } });
  }
}

export async function refreshAccessToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ ok: false, error: { message: 'Refresh token required' } });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find session
    const sessions = await Session.find({ userId: decoded.userId });
    let validSession = null;

    for (const session of sessions) {
      if (!session.refreshTokenHash || !session.expiresAt) continue;
      const isValid = await comparePassword(refreshToken, session.refreshTokenHash);
      if (isValid && session.expiresAt > new Date()) {
        validSession = session;
        break;
      }
    }

      if (!validSession) {
      return res.status(401).json({ ok: false, error: { message: 'Invalid or expired refresh token' } });
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: 'User not found' } });
    }

    // Generate new access token
    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });

    res.json({
      ok: true,
      data: { accessToken }
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(401).json({ ok: false, error: { message: 'Invalid refresh token' } });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Delete the specific session
      const sessions = await Session.find({ userId: req.user?.userId });
      for (const session of sessions) {
          if (!session.refreshTokenHash) continue;
        const isMatch = await comparePassword(refreshToken, session.refreshTokenHash);
        if (isMatch) {
          await Session.deleteOne({ _id: session._id });
          break;
        }
      }
    }

    res.json({ ok: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ ok: false, error: { message: 'Logout failed' } });
  }
}
