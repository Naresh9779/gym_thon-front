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
  response_format?: { type: 'json_object' | 'text' };
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
 * Gemini API Client (OpenAI-compatible endpoint)
 * Model: gemini-2.0-flash (free tier — 15 RPM, 1M tokens/day)
 * Includes retry logic with exponential backoff for rate limits
 */
class OpenRouterClient {
  private client: AxiosInstance;
  private defaultModel = 'gemini-2.0-flash';
  private maxRetries = 3;
  private baseDelay = 2000;

  constructor() {
    // Priority: Groq → Gemini → OpenRouter
    const apiKey = ENV.GROQ_API_KEY || ENV.GEMINI_API_KEY || ENV.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn('[AI] Warning: No AI API key set (GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY). AI generation will fail.');
    }

    let baseURL: string;
    let provider: string;

    if (ENV.GROQ_API_KEY) {
      baseURL = 'https://api.groq.com/openai/v1';
      this.defaultModel = 'llama-3.1-8b-instant';
      provider = 'Groq';
    } else if (ENV.GEMINI_API_KEY) {
      baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      this.defaultModel = 'gemini-2.0-flash';
      provider = 'Gemini';
    } else {
      baseURL = 'https://openrouter.ai/api/v1';
      this.defaultModel = 'qwen/qwen3-coder:free';
      provider = 'OpenRouter';
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'OpenRouter' && { 'HTTP-Referer': 'https://fitflow.app', 'X-Title': 'FitFlow' }),
      },
      timeout: 60000,
    });

    console.log(`[AI] Using ${provider} backend (model: ${this.defaultModel})`);
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
    const apiKey = ENV.GROQ_API_KEY || ENV.GEMINI_API_KEY || ENV.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('No AI API key configured. Please set GROQ_API_KEY or GEMINI_API_KEY in environment variables.');
    }

    const isGemini = !!ENV.GEMINI_API_KEY && !ENV.GROQ_API_KEY;
    const isGroq = !!ENV.GROQ_API_KEY;
    const request: OpenRouterRequest = {
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      ...(isGemini ? {} : { top_p: options.topP ?? 0.9 }),
      // JSON mode: Groq and OpenAI-compatible endpoints support this — forces valid JSON output
      ...(isGroq ? { response_format: { type: 'json_object' } } : {}),
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

        console.log(`[AI] Tokens used: ${response.data.usage.total_tokens} (attempt ${attempt + 1})`);
        return content.trim();
      } catch (error) {
        lastError = error;
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorData = error.response?.data;
          
          console.error(`[AI] API Error (attempt ${attempt + 1}/${this.maxRetries + 1}):`, {
            status,
            data: JSON.stringify(errorData, null, 2),
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
              console.log(`[AI] Retrying in ${delay}ms...`);
              await this.sleep(delay);
              continue;
            } else {
              throw new Error(`OpenRouter rate limit exceeded after ${this.maxRetries + 1} attempts. Please wait a few minutes before trying again.`);
            }
          }
          
          // Gemini returns errors as an array: [{ error: { message, status } }]
          const geminiMsg = Array.isArray(errorData) ? errorData[0]?.error?.message : undefined;
          throw new Error(`AI API error: ${geminiMsg || errorData?.error?.message || error.message}`);
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
  async generateDietPlan(prompt: string, options?: { adminInstructions?: string }): Promise<string> {
    const adminRule = options?.adminInstructions
      ? ` ADMIN OVERRIDE (must follow above all else): ${options.adminInstructions}`
      : '';
    return this.generateCompletion(
      [
        {
          role: 'system',
          content: `You are an expert nutritionist and dietitian. Generate personalized meal plans based on user requirements. Always respond with valid JSON only, no additional text. CRITICAL: You MUST generate all 7 days (Monday through Sunday) — never truncate or stop early.${adminRule}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        temperature: 0.7,
        maxTokens: 8000,
      }
    );
  }

  /**
   * Generate workout plan using AI
   * Uses Llama 3.1 8B for workout logic
   */
  async generateWorkoutPlan(
    prompt: string,
    options?: { daysPerWeek?: number; exercisesPerDay?: number; adminInstructions?: string }
  ): Promise<string> {
    const countRule = (options?.daysPerWeek && options?.exercisesPerDay)
      ? ` CRITICAL: generate EXACTLY ${options.daysPerWeek} days and EXACTLY ${options.exercisesPerDay} exercises per day — no exceptions.`
      : '';
    const adminRule = options?.adminInstructions
      ? ` ADMIN OVERRIDE (must follow above all else): ${options.adminInstructions}`
      : '';
    return this.generateCompletion(
      [
        {
          role: 'system',
          content: `You are an expert fitness trainer and exercise physiologist. Generate personalized workout plans based on user requirements. Always respond with valid JSON only, no additional text.${countRule}${adminRule}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        temperature: 0.6,
        maxTokens: 4000,
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
      console.error('[AI] Failed to fetch models:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const openRouterClient = new OpenRouterClient();
