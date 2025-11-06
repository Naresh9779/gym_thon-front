import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

// Validation schema for profile update
const updateProfileSchema = z.object({
  age: z.number().min(13).max(120).optional(),
  weight: z.number().min(20).max(300).optional(),
  height: z.number().min(100).max(250).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  goals: z.array(z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'endurance'])).optional(),
  preferences: z.array(z.string()).optional(),
  restrictions: z.array(z.string()).optional(),
  timezone: z.string().optional(),
});

/**
 * PATCH /api/users/profile
 * Update user profile
 */
export async function updateUserProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    // Validate request body
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: {
          message: 'Invalid profile data',
          details: validation.error.errors,
        },
      });
    }

    const updates = validation.data;

    // Update user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: { message: 'User not found' },
      });
    }

    // Merge profile updates
      // Initialize profile if not exists
      if (!user.profile) {
        user.profile = {
          goals: [],
          preferences: [],
          restrictions: [],
          timezone: 'UTC',
        };
      }

    // Update individual profile fields
    if (updates.age !== undefined) user.profile.age = updates.age;
    if (updates.weight !== undefined) user.profile.weight = updates.weight;
    if (updates.height !== undefined) user.profile.height = updates.height;
    if (updates.gender !== undefined) user.profile.gender = updates.gender;
    if (updates.activityLevel !== undefined) user.profile.activityLevel = updates.activityLevel;
    if (updates.goals !== undefined) user.profile.goals = updates.goals;
    if (updates.preferences !== undefined) user.profile.preferences = updates.preferences;
    if (updates.restrictions !== undefined) user.profile.restrictions = updates.restrictions;
    if (updates.timezone !== undefined) user.profile.timezone = updates.timezone;

    await user.save();

    return res.json({
      ok: true,
      data: {
        message: 'Profile updated successfully',
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('[UserController] Error updating profile:', error);
    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to update profile' },
    });
  }
}

/**
 * GET /api/users/profile
 * Get user profile
 */
export async function getUserProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Unauthorized' },
      });
    }

    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: { message: 'User not found' },
      });
    }

    return res.json({
      ok: true,
      data: { user },
    });
  } catch (error) {
    console.error('[UserController] Error fetching profile:', error);
    return res.status(500).json({
      ok: false,
      error: { message: 'Failed to fetch profile' },
    });
  }
}
