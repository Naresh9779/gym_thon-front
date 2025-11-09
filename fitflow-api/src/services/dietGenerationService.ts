import { Types } from 'mongoose';
import User from '../models/User';
import DietPlan from '../models/DietPlan';
import ProgressLog from '../models/ProgressLog';
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

interface PreviousDayProgress {
  caloriesConsumed: number;
  mealsLogged: number;
  adherenceScore: number;
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
    previousDayProgress?: PreviousDayProgress
  ): string {
    const primaryGoal = userContext.goals.length > 0 ? userContext.goals[0] : 'maintenance';
    const allGoals = userContext.goals.length > 0 ? userContext.goals.join(', ') : 'maintenance';
    
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

**Preferences:** ${userContext.preferences.length > 0 ? userContext.preferences.join(', ') : 'None'}
**Restrictions:** ${userContext.restrictions.length > 0 ? userContext.restrictions.join(', ') : 'None'}
`;

    if (previousDayProgress) {
      prompt += `\n**Previous Day Performance:**
- Calories Consumed: ${previousDayProgress.caloriesConsumed} kcal
- Adherence Score: ${previousDayProgress.adherenceScore}%
${previousDayProgress.adherenceScore < 70 ? '- Note: Low adherence, suggest easier-to-prepare meals' : ''}
`;
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
   * Generate diet plan using AI
   */
  async generateDietPlan(
    userId: string,
    date: Date,
    previousDayProgressId?: string
  ): Promise<GeneratedDietPlan> {
    try {
      // Fetch user data
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate user profile
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

      // Calculate nutrition targets (use primary goal)
      const primaryGoal = userContext.goals.length > 0 ? userContext.goals[0] : 'maintenance';
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
      const prompt = this.buildDietPrompt(userContext, targetCalories, macros, previousDayProgress);
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
   * Save generated diet plan to database
   */
  async saveDietPlan(
    userId: string,
    date: Date,
    generatedPlan: GeneratedDietPlan,
    generatedFrom: 'manual' | 'ai' | 'auto-daily',
    previousDayProgressId?: string
  ): Promise<any> {
    const dietPlan = new DietPlan({
      userId: new Types.ObjectId(userId),
      name: `Diet Plan - ${date.toISOString().split('T')[0]}`,
      date,
      dailyCalories: generatedPlan.dailyCalories,
      macros: generatedPlan.macros,
      meals: generatedPlan.meals.map((meal) => ({
        name: meal.name,
        time: meal.time,
        foods: meal.foods,
        totalCalories: meal.totalCalories,
        macros: meal.macros,
      })),
      generatedFrom,
      previousDayProgressId: previousDayProgressId
        ? new Types.ObjectId(previousDayProgressId)
        : undefined,
    });

    await dietPlan.save();
    return dietPlan;
  }
}

// Export singleton instance
export const dietGenerationService = new DietGenerationService();
