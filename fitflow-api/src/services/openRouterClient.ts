import axios, { AxiosInstance } from 'axios';
import { ENV } from '../config/env';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter API Client
 * Supports free models: Google Gemini Flash 1.5, Meta Llama 3.1 8B
 */
class OpenRouterClient {
  private client: AxiosInstance;
  private defaultModel = 'qwen/qwen3-coder:free'; // User-provided free model

  constructor() {
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
          'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://fitflow.app', // Optional: For rankings
        'X-Title': 'FitFlow', // Optional: For rankings
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout for AI generation
    });
  }

  /**
   * Generate completion from OpenRouter
   * @param messages - Array of chat messages
   * @param options - Generation options
   * @returns AI-generated text response
   */
  async generateCompletion(
    messages: OpenRouterMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    } = {}
  ): Promise<string> {
    try {
      const request: OpenRouterRequest = {
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        top_p: options.topP ?? 0.9,
      };

      const response = await this.client.post<OpenRouterResponse>('/chat/completions', request);

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenRouter response');
      }

      console.log(`[OpenRouter] Tokens used: ${response.data.usage.total_tokens}`);
      return content.trim();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[OpenRouter] API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate diet plan using AI
   * Uses free tier model (Gemini Flash 1.5)
   */
  async generateDietPlan(prompt: string): Promise<string> {
    return this.generateCompletion(
      [
        {
          role: 'system',
          content: 'You are an expert nutritionist and dietitian. Generate personalized meal plans based on user requirements. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        model: 'qwen/qwen3-coder:free', // Free model provided by user
        temperature: 0.7, // Balanced creativity
        maxTokens: 2500, // Enough for detailed meal plan
      }
    );
  }

  /**
   * Generate workout plan using AI
   * Uses Llama 3.1 8B for workout logic
   */
  async generateWorkoutPlan(prompt: string): Promise<string> {
    return this.generateCompletion(
      [
        {
          role: 'system',
          content: 'You are an expert fitness trainer and exercise physiologist. Generate personalized workout plans based on user requirements. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        model: 'qwen/qwen3-coder:free', // Use same free model for consistency
        temperature: 0.6, // More deterministic for workout structure
        maxTokens: 3000, // Enough for full workout cycle
      }
    );
  }

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels(): Promise<any> {
    try {
      const response = await this.client.get('/models');
      return response.data.data;
    } catch (error) {
      console.error('[OpenRouter] Failed to fetch models:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const openRouterClient = new OpenRouterClient();
