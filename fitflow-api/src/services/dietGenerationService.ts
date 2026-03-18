import { Types } from 'mongoose';
import User from '../models/User';
import DietPlan from '../models/DietPlan';
import ProgressLog from '../models/ProgressLog';
import LeaveRequest from '../models/LeaveRequest';
import { openRouterClient } from './openRouterClient';
import { nutritionixClient } from './nutritionixClient';

interface UserContext {
  userId: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goals: string[]; // Array of goals
  preferences: string[];
  restrictions: string[];
  timezone: string;
}

interface DietOverrides {
  goalOverride?: string;       // Override user's primary goal
  dietType?: string;           // e.g. 'balanced', 'high_protein', 'low_carb', 'mediterranean'
  isVegetarian?: boolean;      // Exclude meat and fish
  budget?: number;             // Weekly budget in local currency
  additionalPreferences?: string; // Free-text extra preferences
}

interface PreviousDayProgress {
  caloriesConsumed: number;
  mealsLogged: number;
  adherenceScore: number;
}

interface CheckIn {
  currentWeight?: number;
  energyLevel: number;      // 1-5
  sleepQuality: number;     // 1-5
  muscleSoreness: number;   // 1-5
  dietAdherence: number;    // 0-100%
  injuries?: string;
  notes?: string;
}

interface LastMonthDietReport {
  adherenceScore: number;
  avgDailyCalories: number;
  avgMacros: { protein: number; carbs: number; fats: number };
  totalDaysLogged: number;
}

interface GeneratedMeal {
  name: string;
  time: string;
  foods: Array<{
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>;
  totalCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

interface GeneratedDietPlan {
  dailyCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  meals: GeneratedMeal[];
}

interface GeneratedWeeklyDay {
  dayName: string;
  date: Date;
  meals: GeneratedMeal[];
  totalCalories: number;
  macros: { protein: number; carbs: number; fats: number };
}

/**
 * Diet Generation Service
 * Uses OpenRouter AI + Nutritionix for personalized meal plans
 */
class DietGenerationService {
  /**
   * Calculate TDEE (Total Daily Energy Expenditure)
   * Using Mifflin-St Jeor Equation
   */
  private calculateTDEE(
    weight: number,
    height: number,
    age: number,
    gender: string,
    activityLevel: string
  ): number {
    // BMR calculation
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multipliers
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const multiplier = activityMultipliers[activityLevel] || 1.55;
    return Math.round(bmr * multiplier);
  }

  /**
   * Calculate target calories based on goal
   */
  private calculateTargetCalories(tdee: number, goal: string): number {
    const adjustments: Record<string, number> = {
      weight_loss: -500, // 500 cal deficit
      muscle_gain: 300, // 300 cal surplus
      maintenance: 0,
      endurance: 200, // Slight surplus for endurance
    };

    const adjustment = adjustments[goal] || 0;
    return Math.round(tdee + adjustment);
  }

  /**
   * Calculate macro distribution based on goal
   */
  private calculateMacros(
    targetCalories: number,
    goal: string
  ): { protein: number; carbs: number; fats: number } {
    let proteinPercent: number;
    let carbPercent: number;
    let fatPercent: number;

    switch (goal) {
      case 'muscle_gain':
        proteinPercent = 0.3; // 30% protein
        carbPercent = 0.45; // 45% carbs
        fatPercent = 0.25; // 25% fat
        break;
      case 'weight_loss':
        proteinPercent = 0.35; // 35% protein (preserve muscle)
        carbPercent = 0.35; // 35% carbs
        fatPercent = 0.3; // 30% fat
        break;
      case 'endurance':
        proteinPercent = 0.2; // 20% protein
        carbPercent = 0.55; // 55% carbs (fuel)
        fatPercent = 0.25; // 25% fat
        break;
      default: // maintenance
        proteinPercent = 0.25;
        carbPercent = 0.45;
        fatPercent = 0.3;
    }

    return {
      protein: Math.round((targetCalories * proteinPercent) / 4), // 4 cal per g
      carbs: Math.round((targetCalories * carbPercent) / 4), // 4 cal per g
      fats: Math.round((targetCalories * fatPercent) / 9), // 9 cal per g
    };
  }

  /**
   * Build AI prompt for diet generation
   */
  private buildDietPrompt(
    userContext: UserContext,
    targetCalories: number,
    macros: { protein: number; carbs: number; fats: number },
    previousDayProgress?: PreviousDayProgress,
    overrides?: DietOverrides,
    checkIn?: CheckIn,
    lastMonthReport?: LastMonthDietReport,
    additionalInstructions?: string
  ): string {
    const primaryGoal = overrides?.goalOverride || (userContext.goals.length > 0 ? userContext.goals[0] : 'maintenance');
    const allGoals = userContext.goals.length > 0 ? userContext.goals.join(', ') : 'maintenance';

    // Merge preferences
    const mergedPreferences = [...userContext.preferences];
    if (overrides?.additionalPreferences) mergedPreferences.push(overrides.additionalPreferences);

    // Merge restrictions
    const mergedRestrictions = [...userContext.restrictions];
    if (overrides?.isVegetarian) mergedRestrictions.push('vegetarian (no meat or fish)');

    let prompt = `Generate a personalized daily meal plan for the following user:

**User Profile:**
- Age: ${userContext.age} years
- Weight: ${userContext.weight} kg
- Height: ${userContext.height} cm
- Gender: ${userContext.gender}
- Activity Level: ${userContext.activityLevel}
- Primary Goal: ${primaryGoal}
- All Goals: ${allGoals}

**Nutritional Targets:**
- Daily Calories: ${targetCalories} kcal
- Protein: ${macros.protein}g
- Carbs: ${macros.carbs}g
- Fats: ${macros.fats}g

**Preferences:** ${mergedPreferences.length > 0 ? mergedPreferences.join(', ') : 'None'}
**Restrictions:** ${mergedRestrictions.length > 0 ? mergedRestrictions.join(', ') : 'None'}
`;

    if (overrides?.dietType) {
      const dietTypeDescriptions: Record<string, string> = {
        balanced: 'well-rounded balanced diet with variety',
        high_protein: 'high protein focus (prioritise protein-rich foods like chicken, eggs, legumes)',
        low_carb: 'low carbohydrate / keto-friendly (minimise bread, rice, pasta)',
        mediterranean: 'Mediterranean style (olive oil, fish, vegetables, legumes, whole grains)',
      };
      prompt += `**Diet Style:** ${dietTypeDescriptions[overrides.dietType] || overrides.dietType}\n`;
    }

    if (overrides?.budget && overrides.budget > 0) {
      prompt += `**Budget:** approximately ₹${overrides.budget} per week — suggest affordable, locally available ingredients\n`;
    }


    if (lastMonthReport) {
      prompt += `\n**Previous Month Diet Performance:**
- Days Logged: ${lastMonthReport.totalDaysLogged}
- Adherence Score: ${lastMonthReport.adherenceScore}%
- Avg Daily Calories: ${lastMonthReport.avgDailyCalories} kcal
- Avg Protein: ${lastMonthReport.avgMacros.protein}g | Carbs: ${lastMonthReport.avgMacros.carbs}g | Fats: ${lastMonthReport.avgMacros.fats}g
${lastMonthReport.adherenceScore < 70 ? '- Note: Low adherence last month — suggest simple, easy-to-prepare meals' : ''}
${lastMonthReport.adherenceScore >= 90 ? '- Great adherence last month — can increase variety and complexity' : ''}
`;
    }

    if (previousDayProgress) {
      prompt += `\n**Previous Day Performance:**
- Calories Consumed: ${previousDayProgress.caloriesConsumed} kcal
- Adherence Score: ${previousDayProgress.adherenceScore}%
${previousDayProgress.adherenceScore < 70 ? '- Note: Low adherence, suggest easier-to-prepare meals' : ''}
`;
    }

    if (checkIn) {
      prompt += `\n**Member Check-In (Current Condition):**
- Current Weight: ${checkIn.currentWeight ? `${checkIn.currentWeight} kg` : 'not provided'}
- Energy Level: ${checkIn.energyLevel}/5
- Sleep Quality: ${checkIn.sleepQuality}/5
- Muscle Soreness: ${checkIn.muscleSoreness}/5
- Diet Adherence Last Month: ${checkIn.dietAdherence}%
${checkIn.injuries ? `- Injuries/Limitations: ${checkIn.injuries}` : ''}
${checkIn.notes ? `- Notes: ${checkIn.notes}` : ''}
${checkIn.energyLevel <= 2 ? '- Low energy: prioritize easily digestible, energizing foods' : ''}
`;
    }

    if (additionalInstructions) {
      prompt += `\n**ADMIN/TRAINER INSTRUCTIONS (MUST FOLLOW — highest priority):**\n${additionalInstructions}\n`;
    }

    prompt += `\n**Instructions:**
1. Create 4-6 meals throughout the day (breakfast, lunch, dinner, snacks)
2. Each meal should have specific foods with portions
3. Ensure total macros match targets within 5% tolerance
4. Consider user preferences and restrictions
5. Provide meal times (e.g., "08:00", "12:30")
6. Make meals practical and easy to prepare

**Response Format (JSON only, no additional text):**
{
  "meals": [
    {
      "name": "Breakfast",
      "time": "08:00",
      "foods": [
        {
          "name": "Oatmeal",
          "portion": "100g",
          "calories": 350,
          "protein": 12,
          "carbs": 58,
          "fats": 7
        }
      ]
    }
  ]
}`;

    return prompt;
  }

  /**
   * Build AI prompt for weekly diet generation
   */
  private buildWeeklyDietPrompt(
    userContext: UserContext,
    weekStartDate: Date,
    targetCalories: number,
    macros: { protein: number; carbs: number; fats: number },
    overrides?: DietOverrides,
    checkIn?: CheckIn,
    lastMonthReport?: LastMonthDietReport,
    additionalInstructions?: string
  ): string {
    const primaryGoal = overrides?.goalOverride || (userContext.goals.length > 0 ? userContext.goals[0] : 'maintenance');
    const allGoals = userContext.goals.length > 0 ? userContext.goals.join(', ') : 'maintenance';
    const weekStartISO = weekStartDate.toISOString().split('T')[0];

    const mergedPreferences = [...userContext.preferences];
    if (overrides?.additionalPreferences) mergedPreferences.push(overrides.additionalPreferences);

    const mergedRestrictions = [...userContext.restrictions];
    if (overrides?.isVegetarian) mergedRestrictions.push('vegetarian (no meat or fish)');

    let prompt = `Generate a personalized 7-day weekly meal plan (Monday through Sunday) starting ${weekStartISO}.

**User Profile:**
- Age: ${userContext.age} years
- Weight: ${checkIn?.currentWeight ?? userContext.weight} kg
- Height: ${userContext.height} cm
- Gender: ${userContext.gender}
- Activity Level: ${userContext.activityLevel}
- Primary Goal: ${primaryGoal}
- All Goals: ${allGoals}

**Nutritional Targets:**
- Daily Calories: ${targetCalories} kcal
- Protein: ${macros.protein}g
- Carbs: ${macros.carbs}g
- Fats: ${macros.fats}g

**Preferences:** ${mergedPreferences.length > 0 ? mergedPreferences.join(', ') : 'None'}
**Restrictions:** ${mergedRestrictions.length > 0 ? mergedRestrictions.join(', ') : 'None'}
`;

    if (overrides?.dietType) {
      const dietTypeDescriptions: Record<string, string> = {
        balanced: 'well-rounded balanced diet with variety',
        high_protein: 'high protein focus (prioritise protein-rich foods like chicken, eggs, legumes)',
        low_carb: 'low carbohydrate / keto-friendly (minimise bread, rice, pasta)',
        mediterranean: 'Mediterranean style (olive oil, fish, vegetables, legumes, whole grains)',
      };
      prompt += `**Diet Style:** ${dietTypeDescriptions[overrides.dietType] || overrides.dietType}\n`;
    }

    if (overrides?.budget && overrides.budget > 0) {
      prompt += `**Budget:** approximately ₹${overrides.budget} per week — suggest affordable, locally available ingredients\n`;
    }

    if (lastMonthReport) {
      prompt += `
**Previous Month Diet Performance:**
- Days Logged: ${lastMonthReport.totalDaysLogged}
- Adherence Score: ${lastMonthReport.adherenceScore}%
- Avg Daily Calories: ${lastMonthReport.avgDailyCalories} kcal
- Avg Macros - Protein: ${lastMonthReport.avgMacros.protein}g | Carbs: ${lastMonthReport.avgMacros.carbs}g | Fats: ${lastMonthReport.avgMacros.fats}g
${lastMonthReport.adherenceScore < 70 ? '- Note: Low adherence last month — suggest simple, easy-to-prepare meals' : ''}
${lastMonthReport.adherenceScore >= 90 ? '- Great adherence last month — can increase variety and complexity' : ''}
`;
    }

    if (checkIn) {
      prompt += `
**Member Check-In:**
- Energy Level: ${checkIn.energyLevel}/5
- Sleep Quality: ${checkIn.sleepQuality}/5
- Muscle Soreness: ${checkIn.muscleSoreness}/5
- Diet Adherence Last Month: ${checkIn.dietAdherence}%
${checkIn.injuries ? `- Injuries/Limitations: ${checkIn.injuries}` : ''}
${checkIn.notes ? `- Notes: ${checkIn.notes}` : ''}
${checkIn.energyLevel <= 2 ? '- Low energy: prioritize easily digestible, energizing foods' : ''}
`;
    }

    if (additionalInstructions) {
      prompt += `\n**ADMIN/TRAINER INSTRUCTIONS (MUST FOLLOW — highest priority):**\n${additionalInstructions}\n`;
    }

    prompt += `
**Instructions:**
1. Create ALL 7 days (Monday through Sunday) — this is mandatory, do not stop before Sunday
2. Each day: exactly 4 meals (breakfast, lunch, dinner, snack) — keep it concise
3. Each meal: 2-3 foods max with portion and macros
4. Keep total daily macros within 10% of targets
5. Meal times: breakfast ~08:00, lunch ~12:30, dinner ~19:00, snack ~16:00
6. Vary meals across the week — no identical days

**Response Format (JSON only, no extra text):**
{
  "days": [
    {
      "dayName": "Monday",
      "meals": [
        {
          "name": "Breakfast",
          "time": "08:00",
          "foods": [
            { "name": "Oatmeal", "portion": "100g", "calories": 350, "protein": 12, "carbs": 58, "fats": 7 }
          ],
          "totalCalories": 350,
          "macros": { "protein": 12, "carbs": 58, "fats": 7 }
        }
      ],
      "totalCalories": 2200,
      "macros": { "protein": 165, "carbs": 250, "fats": 70 }
    }
  ]
}

Generate exactly 7 days starting Monday.`;

    return prompt;
  }

  /**
   * Parse AI response and validate/enrich with Nutritionix
   */
  private async parseAndValidateMeals(aiResponse: string): Promise<GeneratedMeal[]> {
    try {
      // Extract JSON from response (in case AI adds extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const meals: GeneratedMeal[] = [];

      for (const meal of parsed.meals || []) {
        const validatedFoods = [];
        let mealCalories = 0;
        let mealProtein = 0;
        let mealCarbs = 0;
        let mealFats = 0;

        for (const food of meal.foods || []) {
          // Validate nutrition with Nutritionix
          const validated = await nutritionixClient.validateNutrition(food.name, food.portion);

          const foodData = {
            name: food.name,
            portion: food.portion,
            calories: validated.calories,
            protein: validated.protein,
            carbs: validated.carbs,
            fats: validated.fats,
          };

          validatedFoods.push(foodData);
          mealCalories += foodData.calories;
          mealProtein += foodData.protein;
          mealCarbs += foodData.carbs;
          mealFats += foodData.fats;
        }

        meals.push({
          name: meal.name,
          time: meal.time,
          foods: validatedFoods,
          totalCalories: mealCalories,
          macros: {
            protein: mealProtein,
            carbs: mealCarbs,
            fats: mealFats,
          },
        });
      }

      return meals;
    } catch (error) {
      console.error('[DietGen] Failed to parse AI response:', error);
      throw new Error('Failed to parse diet plan from AI response');
    }
  }

  /**
   * Parse weekly AI response into GeneratedWeeklyDay array
   */
  private async parseWeeklyMeals(aiResponse: string, weekStartDate: Date): Promise<GeneratedWeeklyDay[]> {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const daysRaw: any[] = parsed.days || [];
      const result: GeneratedWeeklyDay[] = [];

      for (let i = 0; i < daysRaw.length; i++) {
        const dayRaw = daysRaw[i];
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(dayDate.getDate() + i);

        const meals: GeneratedMeal[] = [];
        let dayCalories = 0;
        let dayProtein = 0;
        let dayCarbs = 0;
        let dayFats = 0;

        for (const meal of dayRaw.meals || []) {
          const validatedFoods = [];
          let mealCalories = 0;
          let mealProtein = 0;
          let mealCarbs = 0;
          let mealFats = 0;

          for (const food of meal.foods || []) {
            const validated = await nutritionixClient.validateNutrition(food.name, food.portion);
            const foodData = {
              name: food.name,
              portion: food.portion,
              calories: validated.calories,
              protein: validated.protein,
              carbs: validated.carbs,
              fats: validated.fats,
            };
            validatedFoods.push(foodData);
            mealCalories += foodData.calories;
            mealProtein += foodData.protein;
            mealCarbs += foodData.carbs;
            mealFats += foodData.fats;
          }

          meals.push({
            name: meal.name,
            time: meal.time,
            foods: validatedFoods,
            totalCalories: mealCalories,
            macros: { protein: mealProtein, carbs: mealCarbs, fats: mealFats },
          });

          dayCalories += mealCalories;
          dayProtein += mealProtein;
          dayCarbs += mealCarbs;
          dayFats += mealFats;
        }

        result.push({
          dayName: dayRaw.dayName || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i] || `Day ${i + 1}`,
          date: dayDate,
          meals,
          totalCalories: dayCalories,
          macros: { protein: dayProtein, carbs: dayCarbs, fats: dayFats },
        });
      }

      return result;
    } catch (error) {
      console.error('[DietGen] Failed to parse weekly AI response:', error);
      throw new Error('Failed to parse weekly diet plan from AI response');
    }
  }

  /**
   * Fetch user and build UserContext
   */
  private async getUserContext(userId: string): Promise<{ user: any; userContext: UserContext }> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.profile?.age || !user.profile?.weight || !user.profile?.height) {
      throw new Error('User profile incomplete. Please update age, weight, and height.');
    }

    const userContext: UserContext = {
      userId: user._id.toString(),
      age: user.profile.age,
      weight: user.profile.weight,
      height: user.profile.height,
      gender: (user.profile.gender as 'male' | 'female' | 'other') || 'other',
      activityLevel: (user.profile.activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active') || 'moderate',
      goals: Array.isArray(user.profile.goals) ? user.profile.goals : (user.profile.goals ? [user.profile.goals as string] : ['maintenance']),
      preferences: user.profile.preferences || [],
      restrictions: user.profile.restrictions || [],
      timezone: user.profile.timezone || 'UTC',
    };

    return { user, userContext };
  }

  /**
   * Generate diet plan using AI
   */
  async generateDietPlan(
    userId: string,
    date: Date,
    previousDayProgressId?: string,
    overrides?: DietOverrides,
    checkIn?: CheckIn,
    lastMonthReport?: LastMonthDietReport,
    additionalInstructions?: string
  ): Promise<GeneratedDietPlan> {
    try {
      const { userContext } = await this.getUserContext(userId);

      // Calculate nutrition targets (use override goal if provided, else user's primary goal)
      const primaryGoal = overrides?.goalOverride || (userContext.goals.length > 0 ? userContext.goals[0] : 'maintenance');
      const tdee = this.calculateTDEE(
        userContext.weight,
        userContext.height,
        userContext.age,
        userContext.gender,
        userContext.activityLevel
      );
      const targetCalories = this.calculateTargetCalories(tdee, primaryGoal);
      const macros = this.calculateMacros(targetCalories, primaryGoal);

      // Fetch previous day progress if provided
      let previousDayProgress: PreviousDayProgress | undefined;
      if (previousDayProgressId) {
        const progressLog = await ProgressLog.findById(previousDayProgressId);
        if (progressLog) {
         const totalCalories = progressLog.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
          const adherence = (totalCalories / targetCalories) * 100;
          previousDayProgress = {
            caloriesConsumed: totalCalories,
            mealsLogged: progressLog.meals.length,
            adherenceScore: Math.min(100, Math.round(adherence)),
          };
        }
      }

      // Build prompt and generate with AI
      const prompt = this.buildDietPrompt(userContext, targetCalories, macros, previousDayProgress, overrides, checkIn, lastMonthReport, additionalInstructions);
      console.log('[DietGen] Generating diet plan with OpenRouter...');
      const aiResponse = await openRouterClient.generateDietPlan(prompt);

      // Parse and validate meals
      const meals = await this.parseAndValidateMeals(aiResponse);

      // Calculate actual totals
      const actualCalories = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);
      const actualProtein = meals.reduce((sum, meal) => sum + meal.macros.protein, 0);
      const actualCarbs = meals.reduce((sum, meal) => sum + meal.macros.carbs, 0);
      const actualFats = meals.reduce((sum, meal) => sum + meal.macros.fats, 0);

      console.log('[DietGen] Generated diet plan:', {
        targetCalories,
        actualCalories,
        mealsCount: meals.length,
      });

      return {
        dailyCalories: actualCalories,
        macros: {
          protein: actualProtein,
          carbs: actualCarbs,
          fats: actualFats,
        },
        meals,
      };
    } catch (error) {
      console.error('[DietGen] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate weekly diet plan using AI
   */
  async generateWeeklyDietPlan(
    userId: string,
    weekStartDate: Date,
    overrides?: DietOverrides,
    checkIn?: CheckIn,
    lastMonthReport?: LastMonthDietReport,
    additionalInstructions?: string
  ): Promise<{ days: GeneratedWeeklyDay[]; avgDailyCalories: number; avgMacros: { protein: number; carbs: number; fats: number } }> {
    try {
      const { userContext } = await this.getUserContext(userId);

      const primaryGoal = overrides?.goalOverride || (userContext.goals.length > 0 ? userContext.goals[0] : 'maintenance');
      const tdee = this.calculateTDEE(
        userContext.weight,
        userContext.height,
        userContext.age,
        userContext.gender,
        userContext.activityLevel
      );
      const targetCalories = this.calculateTargetCalories(tdee, primaryGoal);
      const macros = this.calculateMacros(targetCalories, primaryGoal);

      // Append recent approved leave notes from admin
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentLeaves = await LeaveRequest.find({
        userId: new Types.ObjectId(userContext.userId),
        status: 'approved',
        adminNote: { $exists: true, $ne: '' },
        updatedAt: { $gte: thirtyDaysAgo },
      }).sort({ updatedAt: -1 }).limit(3).lean();

      let combinedInstructions = additionalInstructions || '';
      if (recentLeaves.length > 0) {
        const leaveContext = recentLeaves
          .map((l: any) => `- Leave approved (${(l.dates as string[]).slice(0,3).join(', ')}${l.dates.length > 3 ? '…' : ''}): ${l.adminNote}`)
          .join('\n');
        combinedInstructions = [combinedInstructions, `Recent admin notes from leave approvals:\n${leaveContext}`].filter(Boolean).join('\n');
      }

      const prompt = this.buildWeeklyDietPrompt(userContext, weekStartDate, targetCalories, macros, overrides, checkIn, lastMonthReport, combinedInstructions || undefined);
      console.log('[DietGen] Generating weekly diet plan with OpenRouter...');
      const aiResponse = await openRouterClient.generateDietPlan(prompt, {
        adminInstructions: combinedInstructions || undefined,
      });

      const days = await this.parseWeeklyMeals(aiResponse, weekStartDate);

      // Calculate averages
      const avgDailyCalories = days.length > 0
        ? Math.round(days.reduce((sum, d) => sum + d.totalCalories, 0) / days.length)
        : targetCalories;

      const avgMacros = {
        protein: days.length > 0 ? Math.round(days.reduce((sum, d) => sum + d.macros.protein, 0) / days.length) : macros.protein,
        carbs: days.length > 0 ? Math.round(days.reduce((sum, d) => sum + d.macros.carbs, 0) / days.length) : macros.carbs,
        fats: days.length > 0 ? Math.round(days.reduce((sum, d) => sum + d.macros.fats, 0) / days.length) : macros.fats,
      };

      console.log('[DietGen] Generated weekly diet plan:', {
        daysCount: days.length,
        avgDailyCalories,
      });

      return { days, avgDailyCalories, avgMacros };
    } catch (error) {
      console.error('[DietGen] Weekly generation failed:', error);
      throw error;
    }
  }

  /**
   * Save generated diet plan to database (legacy daily)
   */
  async saveDietPlan(
    userId: string,
    date: Date,
    generatedPlan: GeneratedDietPlan,
    generatedFrom: 'manual' | 'ai' | 'auto-daily',
    previousDayProgressId?: string
  ): Promise<any> {
    // Save as weekly plan with a single day (backward compat wrapper)
    const weekStartDate = new Date(date);
    weekStartDate.setHours(0, 0, 0, 0);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];

    const dietPlan = new DietPlan({
      userId: new Types.ObjectId(userId),
      name: `Diet Plan - ${date.toISOString().split('T')[0]}`,
      weekStartDate,
      weekEndDate,
      avgDailyCalories: generatedPlan.dailyCalories,
      avgMacros: generatedPlan.macros,
      days: [{
        dayName,
        date: weekStartDate,
        meals: generatedPlan.meals.map((meal) => ({
          name: meal.name,
          time: meal.time,
          foods: meal.foods,
          totalCalories: meal.totalCalories,
          macros: meal.macros,
        })),
        totalCalories: generatedPlan.dailyCalories,
        macros: generatedPlan.macros,
      }],
      generatedFrom: generatedFrom === 'auto-daily' ? 'ai' : generatedFrom,
    });

    await dietPlan.save();
    return dietPlan;
  }

  /**
   * Save weekly diet plan to database
   */
  async saveWeeklyDietPlan(
    userId: string,
    weekStartDate: Date,
    generated: { days: GeneratedWeeklyDay[]; avgDailyCalories: number; avgMacros: any },
    generatedFrom: 'ai' | 'user-self' | 'admin',
    checkIn?: CheckIn
  ): Promise<any> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const dietPlan = new DietPlan({
      userId: new Types.ObjectId(userId),
      name: `Weekly Nutrition Plan - ${weekStartDate.toISOString().split('T')[0]}`,
      weekStartDate,
      weekEndDate,
      avgDailyCalories: generated.avgDailyCalories,
      avgMacros: generated.avgMacros,
      days: generated.days.map((day) => ({
        dayName: day.dayName,
        date: day.date,
        meals: day.meals.map((meal) => ({
          name: meal.name,
          time: meal.time,
          foods: meal.foods,
          totalCalories: meal.totalCalories,
          macros: meal.macros,
        })),
        totalCalories: day.totalCalories,
        macros: day.macros,
      })),
      generatedFrom,
      checkIn: checkIn || undefined,
    });

    await dietPlan.save();
    return dietPlan;
  }
}

// Export singleton instance
export const dietGenerationService = new DietGenerationService();
