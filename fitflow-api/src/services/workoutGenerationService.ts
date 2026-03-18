import { Types } from 'mongoose';
import User from '../models/User';
import WorkoutPlan from '../models/WorkoutPlan';
import LeaveRequest from '../models/LeaveRequest';
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

interface CheckIn {
  currentWeight?: number;
  energyLevel: number;      // 1-5
  sleepQuality: number;     // 1-5
  muscleSoreness: number;   // 1-5 (5=very sore)
  dietAdherence: number;    // 0-100%
  injuries?: string;
  notes?: string;
}

interface LastMonthWorkoutReport {
  completedWorkouts: number;
  totalWorkouts: number;
  adherenceScore: number;
  avgDuration: number;
}

class WorkoutGenerationService {
  private buildWorkoutPrompt(
    user: UserContext,
    startDate: Date,
    durationWeeks: number,
    daysPerWeek?: number,
    goal?: string,
    experience?: string,
    preferences?: string,
    checkIn?: CheckIn,
    lastMonthReport?: LastMonthWorkoutReport,
    exercisesPerDay?: number,
    additionalInstructions?: string
  ): string {
    const startISO = startDate.toISOString().split('T')[0];
    const primaryGoal = goal || ((user.goals && user.goals.length > 0) ? user.goals[0] : 'maintenance');
    const allGoals = (user.goals && user.goals.length > 0) ? user.goals.join(', ') : 'maintenance';
    const trainingDays = daysPerWeek || 6;
    const userExperience = experience || 'intermediate';
    const userPreferences = preferences || (user.preferences || []).join(', ') || 'None';
    const exPerDay = exercisesPerDay || 6;

    let prompt = `Generate a progressive overload workout cycle with EXACTLY ${trainingDays} training days per week.

User Profile:
- Age: ${user.age}
- Weight: ${checkIn?.currentWeight ?? user.weight} kg
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
- Exercises per session: EXACTLY ${exPerDay} exercises per day (NO MORE, NO LESS)
- Include warm-up guidance and rest intervals
- Emphasize correct form and safety
- Tailor exercises to user's goals, preferences, and restrictions`;

    if (lastMonthReport) {
      const avgMin = Math.round(lastMonthReport.avgDuration / 60);
      prompt += `

Previous Month Performance:
- Completed ${lastMonthReport.completedWorkouts} of ${lastMonthReport.totalWorkouts} planned workouts (${lastMonthReport.adherenceScore}% adherence)
- Average session duration: ${avgMin} minutes
${lastMonthReport.adherenceScore < 60 ? '- Note: Low adherence last month — consider slightly reducing volume to improve consistency' : ''}
${lastMonthReport.adherenceScore >= 80 ? '- Great adherence last month — can increase progressive overload' : ''}`;
    }

    if (checkIn) {
      prompt += `

Member Check-In (Current Condition):
- Energy Level: ${checkIn.energyLevel}/5
- Sleep Quality: ${checkIn.sleepQuality}/5
- Muscle Soreness: ${checkIn.muscleSoreness}/5 ${checkIn.muscleSoreness >= 4 ? '(very sore — include extra recovery days)' : ''}
- Diet Adherence Last Month: ${checkIn.dietAdherence}%
${checkIn.injuries ? `- Injuries/Limitations: ${checkIn.injuries} — avoid exercises that stress this area` : ''}
${checkIn.notes ? `- Trainer Notes: ${checkIn.notes}` : ''}`;
    }

    if (additionalInstructions) {
      prompt += `

ADMIN INSTRUCTIONS (MUST FOLLOW — highest priority):
${additionalInstructions}`;
    }

    prompt += `

IMPORTANT:
- Generate EXACTLY ${trainingDays} workout days in the "days" array — no more, no less.
- Each day must have EXACTLY ${exPerDay} exercises — no more, no less.

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

Generate exactly ${trainingDays} days, each with exactly ${exPerDay} exercises.`;

    return prompt;
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
    preferences?: string,
    checkIn?: CheckIn,
    lastMonthReport?: LastMonthWorkoutReport,
    exercisesPerDay?: number,
    additionalInstructions?: string
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

    // Append recent approved leave notes from admin so AI is aware of context
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLeaves = await LeaveRequest.find({
      userId: new Types.ObjectId(userId),
      status: 'approved',
      adminNote: { $exists: true, $ne: '' },
      updatedAt: { $gte: thirtyDaysAgo },
    }).sort({ updatedAt: -1 }).limit(3).lean();

    let combinedInstructions = additionalInstructions || '';
    if (recentLeaves.length > 0) {
      const leaveContext = recentLeaves
        .map(l => `- Leave approved (${l.dates.slice(0,3).join(', ')}${l.dates.length > 3 ? '…' : ''}): ${l.adminNote}`)
        .join('\n');
      combinedInstructions = [combinedInstructions, `Recent admin notes from leave approvals:\n${leaveContext}`].filter(Boolean).join('\n');
    }

    const trainingDays = daysPerWeek || 6;
    const exPerDay = exercisesPerDay || 6;
    const prompt = this.buildWorkoutPrompt(userCtx, startDate, durationWeeks, trainingDays, goal, experience, preferences, checkIn, lastMonthReport, exPerDay, combinedInstructions || undefined);
    const ai = await openRouterClient.generateWorkoutPlan(prompt, {
      daysPerWeek: trainingDays,
      exercisesPerDay: exPerDay,
      adminInstructions: combinedInstructions || undefined,
    });
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
