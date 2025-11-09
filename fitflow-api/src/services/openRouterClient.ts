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
 * Includes retry logic with exponential backoff for rate limits
 */
class OpenRouterClient {
  private client: AxiosInstance;
  private defaultModel = 'qwen/qwen3-coder:free'; // User-provided free model
  private maxRetries = 3;
  private baseDelay = 2000; // Start with 2 seconds

  constructor() {
    if (!ENV.OPENROUTER_API_KEY) {
      console.warn('[OpenRouter] Warning: OPENROUTER_API_KEY not set. AI generation will fail.');
    }
    
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
   * Sleep helper for retry delays
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate completion from OpenRouter with retry logic
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
    if (!ENV.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY in environment variables.');
    }

    const request: OpenRouterRequest = {
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      top_p: options.topP ?? 0.9,
    };

    // Retry logic with exponential backoff
    let lastError: any;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.post<OpenRouterResponse>('/chat/completions', request);

        const content = response.data.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content in OpenRouter response');
        }

        console.log(`[OpenRouter] Tokens used: ${response.data.usage.total_tokens} (attempt ${attempt + 1})`);
        return content.trim();
      } catch (error) {
        lastError = error;
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorData = error.response?.data;
          
          console.error(`[OpenRouter] API Error (attempt ${attempt + 1}/${this.maxRetries + 1}):`, {
            status,
            data: errorData,
            message: error.message,
          });
          
          // Don't retry for certain errors
          if (status === 401) {
            throw new Error('Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY environment variable.');
          } else if (status === 403) {
            throw new Error('OpenRouter API access denied. Please verify your account has sufficient credits.');
          } else if (status === 402) {
            throw new Error('Insufficient OpenRouter credits. Please add credits to your account.');
          }
          
          // Retry for 429 (rate limit) and 5xx errors
          if (status === 429 || (status && status >= 500)) {
            if (attempt < this.maxRetries) {
              // Exponential backoff: 2s, 4s, 8s
              const delay = this.baseDelay * Math.pow(2, attempt);
              console.log(`[OpenRouter] Retrying in ${delay}ms...`);
              await this.sleep(delay);
              continue;
            } else {
              throw new Error(`OpenRouter rate limit exceeded after ${this.maxRetries + 1} attempts. Please wait a few minutes before trying again.`);
            }
          }
          
          throw new Error(`OpenRouter API error: ${errorData?.error?.message || error.message}`);
        }
        throw error;
      }
    }
    
    throw lastError;
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
