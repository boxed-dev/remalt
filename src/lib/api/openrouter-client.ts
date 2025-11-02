import OpenAI from 'openai';

/**
 * OpenRouter API Client
 * Provides unified access to multiple LLM providers via OpenRouter's API
 */

export interface OpenRouterConfig {
  apiKey: string;
  siteUrl?: string;
  appName?: string;
}

/**
 * Create OpenRouter client instance
 * Uses OpenAI SDK with custom baseURL for compatibility
 */
export const createOpenRouterClient = (config?: Partial<OpenRouterConfig>) => {
  const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.');
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': config?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://remalt.ai',
      'X-Title': config?.appName || process.env.NEXT_PUBLIC_APP_NAME || 'Remalt',
    },
  });
};

/**
 * Validate OpenRouter API key is configured
 */
export const isOpenRouterConfigured = (): boolean => {
  return !!process.env.OPENROUTER_API_KEY;
};

/**
 * Get OpenRouter error message
 */
export const getOpenRouterErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred with OpenRouter API';
};
