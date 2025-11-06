import axios, { AxiosInstance } from 'axios';
import { ENV } from '../config/env';

interface NutritionixSearchResult {
  food_name: string;
  serving_qty: number;
  serving_unit: string;
  nf_calories: number;
  nf_protein: number;
  nf_total_carbohydrate: number;
  nf_total_fat: number;
  nf_sugars?: number;
  nf_dietary_fiber?: number;
  photo?: {
    thumb: string;
  };
}

interface NutritionixNutrientResponse {
  foods: Array<{
    food_name: string;
    serving_qty: number;
    serving_unit: string;
    serving_weight_grams: number;
    nf_calories: number;
    nf_total_fat: number;
    nf_saturated_fat: number;
    nf_cholesterol: number;
    nf_sodium: number;
    nf_total_carbohydrate: number;
    nf_dietary_fiber: number;
    nf_sugars: number;
    nf_protein: number;
    nf_potassium: number;
    photo?: {
      thumb: string;
    };
  }>;
}

/**
 * Nutritionix API Client (via RapidAPI)
 * Used for nutrition data validation and enrichment
 */
class NutritionixClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://nutritionix-api.p.rapidapi.com/v1_1',
      headers: {
          'X-RapidAPI-Key': ENV.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'nutritionix-api.p.rapidapi.com',
      },
      timeout: 10000,
    });
  }

  /**
   * Search for food items
   * @param query - Food search query (e.g., "chicken breast")
   * @param limit - Number of results to return
   */
  async searchFood(query: string, limit: number = 5): Promise<NutritionixSearchResult[]> {
    try {
      const response = await this.client.get('/search', {
        params: {
          query,
          limit,
          fields: 'item_name,nf_calories,nf_protein,nf_total_carbohydrate,nf_total_fat',
        },
      });

      return response.data.hits?.map((hit: any) => hit.fields) || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[Nutritionix] Search Error:', error.response?.data);
      }
      throw error;
    }
  }

  /**
   * Get detailed nutrition info for a food item
   * Uses natural language processing
   * @param query - Natural language query (e.g., "1 cup of rice")
   */
  async getNutrients(query: string): Promise<NutritionixNutrientResponse['foods'][0] | null> {
    // Nutritionix free tier discontinued - return null to use estimation fallback
    console.log('[Nutritionix] API disabled (free tier discontinued), using estimation for:', query);
    return null;
  }

  /**
   * Validate and enrich nutrition data from AI-generated meal
   * Uses estimation since Nutritionix free tier is discontinued
   * @param foodName - Name of the food item
   * @param portion - Portion description (e.g., "150g", "1 cup")
   */
  async validateNutrition(
    foodName: string,
    portion: string
  ): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    validated: boolean;
  }> {
    // Always use estimation now (Nutritionix free tier discontinued)
    console.log(`[NutritionEstimator] Calculating nutrition for: ${portion} ${foodName}`);
    return this.estimateNutrition(foodName, portion);
  }

  /**
   * Estimate nutrition based on food type and portion
   * Enhanced estimation with common food categories
   */
  private estimateNutrition(
    foodName: string,
    portion: string
  ): {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    validated: boolean;
  } {
    // Extract numeric portion and convert cups to grams
    let portionSize = 100; // default
    const lowerPortion = portion.toLowerCase();
    
    if (lowerPortion.includes('cup')) {
      const cupMatch = portion.match(/(\d+\.?\d*)/);
      const cups = cupMatch ? parseFloat(cupMatch[1]) : 1;
      portionSize = Math.round(cups * 240); // 1 cup ≈ 240g
    } else if (lowerPortion.includes('tbsp') || lowerPortion.includes('tablespoon')) {
      const tbspMatch = portion.match(/(\d+)/);
      const tbsp = tbspMatch ? parseInt(tbspMatch[1]) : 1;
      portionSize = tbsp * 15; // 1 tbsp = 15g
    } else if (lowerPortion.includes('tsp') || lowerPortion.includes('teaspoon')) {
      const tspMatch = portion.match(/(\d+)/);
      const tsp = tspMatch ? parseInt(tspMatch[1]) : 1;
      portionSize = tsp * 5; // 1 tsp = 5g
    } else {
      const gramMatch = portion.match(/(\d+)/);
      portionSize = gramMatch ? parseInt(gramMatch[1]) : 100;
    }

    const lowerFood = foodName.toLowerCase();
    
    // Calories per 100g and macro ratios for common food categories
    let calPer100g = 150;
    let proteinG = 10;
    let carbsG = 20;
    let fatsG = 5;

    // Proteins (lean)
    if (lowerFood.includes('chicken breast') || lowerFood.includes('turkey')) {
      calPer100g = 165; proteinG = 31; carbsG = 0; fatsG = 3.6;
    } else if (lowerFood.includes('chicken') || lowerFood.includes('fish') || lowerFood.includes('tuna')) {
      calPer100g = 200; proteinG = 26; carbsG = 0; fatsG = 10;
    } else if (lowerFood.includes('salmon')) {
      calPer100g = 208; proteinG = 20; carbsG = 0; fatsG = 13;
    } else if (lowerFood.includes('egg')) {
      calPer100g = 155; proteinG = 13; carbsG = 1; fatsG = 11;
    } else if (lowerFood.includes('tofu')) {
      calPer100g = 76; proteinG = 8; carbsG = 2; fatsG = 4.8;
    } else if (lowerFood.includes('beef') || lowerFood.includes('steak')) {
      calPer100g = 250; proteinG = 26; carbsG = 0; fatsG = 15;
    }
    
    // Carbs
    else if (lowerFood.includes('rice')) {
      calPer100g = 130; proteinG = 2.7; carbsG = 28; fatsG = 0.3;
    } else if (lowerFood.includes('pasta')) {
      calPer100g = 131; proteinG = 5; carbsG = 25; fatsG = 1.1;
    } else if (lowerFood.includes('bread') || lowerFood.includes('toast')) {
      calPer100g = 265; proteinG = 9; carbsG = 49; fatsG = 3.2;
    } else if (lowerFood.includes('oat') || lowerFood.includes('oatmeal')) {
      calPer100g = 389; proteinG = 17; carbsG = 66; fatsG = 7;
    } else if (lowerFood.includes('potato') || lowerFood.includes('sweet potato')) {
      calPer100g = 86; proteinG = 1.6; carbsG = 20; fatsG = 0.1;
    } else if (lowerFood.includes('quinoa')) {
      calPer100g = 120; proteinG = 4.4; carbsG = 21; fatsG = 1.9;
    }
    
    // Dairy
    else if (lowerFood.includes('milk') && lowerFood.includes('skim')) {
      calPer100g = 34; proteinG = 3.4; carbsG = 5; fatsG = 0.1;
    } else if (lowerFood.includes('milk')) {
      calPer100g = 61; proteinG = 3.2; carbsG = 4.8; fatsG = 3.3;
    } else if (lowerFood.includes('yogurt') || lowerFood.includes('greek yogurt')) {
      calPer100g = 59; proteinG = 10; carbsG = 3.6; fatsG = 0.4;
    } else if (lowerFood.includes('cheese')) {
      calPer100g = 402; proteinG = 25; carbsG = 1.3; fatsG = 33;
    }
    
    // Fats & Nuts
    else if (lowerFood.includes('almond') || lowerFood.includes('peanut') || lowerFood.includes('nut')) {
      calPer100g = 579; proteinG = 21; carbsG = 22; fatsG = 50;
    } else if (lowerFood.includes('butter')) {
      calPer100g = 717; proteinG = 0.9; carbsG = 0.1; fatsG = 81;
    } else if (lowerFood.includes('oil') || lowerFood.includes('olive')) {
      calPer100g = 884; proteinG = 0; carbsG = 0; fatsG = 100;
    } else if (lowerFood.includes('avocado')) {
      calPer100g = 160; proteinG = 2; carbsG = 9; fatsG = 15;
    }
    
    // Vegetables
    else if (lowerFood.includes('broccoli') || lowerFood.includes('spinach') || lowerFood.includes('lettuce')) {
      calPer100g = 34; proteinG = 2.8; carbsG = 7; fatsG = 0.4;
    } else if (lowerFood.includes('vegetable') || lowerFood.includes('salad')) {
      calPer100g = 40; proteinG = 2; carbsG = 8; fatsG = 0.3;
    }
    
    // Fruits
    else if (lowerFood.includes('banana')) {
      calPer100g = 89; proteinG = 1.1; carbsG = 23; fatsG = 0.3;
    } else if (lowerFood.includes('apple') || lowerFood.includes('orange')) {
      calPer100g = 52; proteinG = 0.3; carbsG = 14; fatsG = 0.2;
    } else if (lowerFood.includes('berry') || lowerFood.includes('berries')) {
      calPer100g = 57; proteinG = 0.7; carbsG = 14; fatsG = 0.3;
    }

    // Scale to portion size
    const multiplier = portionSize / 100;
    return {
      calories: Math.round(calPer100g * multiplier),
      protein: Math.round(proteinG * multiplier),
      carbs: Math.round(carbsG * multiplier),
      fats: Math.round(fatsG * multiplier),
      validated: false,
    };
  }
}

// Export singleton instance
export const nutritionixClient = new NutritionixClient();
