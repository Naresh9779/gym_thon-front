import { Types } from 'mongoose';
import User from '../models/User';
import WorkoutPlan from '../models/WorkoutPlan';
import { openRouterClient } from './openRouterClient';

interface UserContext {
  age: number;
  weight: number;
  height: number;
  gender?: 'male' | 'female' | 'other';
  goals?: string[]; // Array of goals
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  preferences?: string[];
  restrictions?: string[];
}

interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes?: string;
}

interface GeneratedDay {
  day: string;
  exercises: GeneratedExercise[];
}

interface GeneratedWorkoutCycle {
  name: string;
  durationWeeks: number;
  days: GeneratedDay[];
}

class WorkoutGenerationService {
  private buildWorkoutPrompt(
    user: UserContext, 
    startDate: Date, 
    durationWeeks: number,
    daysPerWeek?: number,
    goal?: string,
    experience?: string,
    preferences?: string
  ): string {
    const startISO = startDate.toISOString().split('T')[0];
    const primaryGoal = goal || ((user.goals && user.goals.length > 0) ? user.goals[0] : 'maintenance');
    const allGoals = (user.goals && user.goals.length > 0) ? user.goals.join(', ') : 'maintenance';
    const trainingDays = daysPerWeek || 4; // Default to 4 days if not specified
    const userExperience = experience || 'intermediate';
    const userPreferences = preferences || (user.preferences || []).join(', ') || 'None';
    
    return `Generate a progressive overload workout cycle with EXACTLY ${trainingDays} training days per week.

User Profile:
- Age: ${user.age}
- Weight: ${user.weight} kg
- Height: ${user.height} cm
- Gender: ${user.gender || 'other'}
- Activity Level: ${user.activityLevel || 'moderate'}
- Experience Level: ${userExperience}
- Primary Goal: ${primaryGoal}
- All Goals: ${allGoals}
- Preferences: ${userPreferences}
- Restrictions: ${(user.restrictions || []).join(', ') || 'None'}

Cycle Requirements:
- Start Date: ${startISO}
- Duration: ${durationWeeks} weeks
- Training Days: EXACTLY ${trainingDays} days per week (NO MORE, NO LESS)
- Include warm-up guidance and rest intervals
- Emphasize correct form and safety
- Tailor exercises to user's goals, preferences, and restrictions

IMPORTANT: Generate EXACTLY ${trainingDays} workout days. Do not add extra days.

Response format (JSON only):
{
  "name": "Hypertrophy Block",
  "durationWeeks": ${durationWeeks},
  "days": [
    {"day": "Day 1 - Push", "exercises": [
      {"name": "Bench Press", "sets": 4, "reps": "6-8", "rest": 120, "notes": "RPE 7-8"}
    ]}
  ]
}

Generate exactly ${trainingDays} days in the "days" array.`;
  }

  private parseCycle(aiResponse: string): GeneratedWorkoutCycle {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.days || !Array.isArray(parsed.days)) {
      throw new Error('Invalid workout plan structure: missing days');
    }
    // Normalize
    parsed.days = parsed.days.map((d: any, idx: number) => ({
      day: d.day || `Day ${idx + 1}`,
      exercises: (d.exercises || []).map((e: any) => ({
        name: String(e.name || 'Exercise'),
        sets: Number(e.sets || 3),
        reps: String(e.reps || '8-12'),
        rest: Number(e.rest || 60),
        notes: e.notes ? String(e.notes) : undefined,
      })),
    }));
    return {
      name: parsed.name || 'Workout Cycle',
      durationWeeks: Number(parsed.durationWeeks || 4),
      days: parsed.days,
    };
  }

  async generateWorkoutCycle(
    userId: string, 
    startDate: Date, 
    durationWeeks = 4,
    daysPerWeek?: number,
    goal?: string,
    experience?: string,
    preferences?: string
  ) {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');
    if (!user.profile?.age || !user.profile?.weight || !user.profile?.height) {
      throw new Error('User profile incomplete. Please update age, weight, and height.');
    }

    const userCtx: UserContext = {
      age: user.profile.age,
      weight: user.profile.weight,
      height: user.profile.height,
      gender: (user.profile.gender as 'male' | 'female' | 'other') || undefined,
      goals: user.profile.goals || undefined,
      activityLevel: (user.profile.activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active') || undefined,
      preferences: user.profile.preferences || undefined,
      restrictions: user.profile.restrictions || undefined,
    };

    const prompt = this.buildWorkoutPrompt(userCtx, startDate, durationWeeks, daysPerWeek, goal, experience, preferences);
    const ai = await openRouterClient.generateWorkoutPlan(prompt);
    const parsed = this.parseCycle(ai);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationWeeks * 7 - 1);

    const workoutPlan = new WorkoutPlan({
      userId: new Types.ObjectId(userId),
      name: parsed.name,
      duration: durationWeeks,
      startDate,
      endDate,
      status: 'active',
      days: parsed.days,
    });

    await workoutPlan.save();
    return workoutPlan;
  }
}

export const workoutGenerationService = new WorkoutGenerationService();
