import React from 'react';

/**
 * Model Registry with Provider Branding
 * Maintains official brand colors and model metadata for multi-LLM support
 */

export interface ModelProvider {
  id: string;
  name: string;
  iconName: string; // Icon component name from @lobehub/icons
  colors: {
    primary: string;
    gradient?: string[];
    bg: string; // Tailwind class
    text: string; // Tailwind class
    border: string; // Tailwind class
  };
}

export interface ModelInfo {
  id: string; // OpenRouter format: "provider/model-name"
  name: string;
  displayName: string;
  provider: string;
  contextWindow: number;
  pricing: {
    input: number; // per 1M tokens in USD
    output: number; // per 1M tokens in USD
  };
  capabilities: string[];
  category: 'flagship' | 'reasoning' | 'fast' | 'lite';
  tier: 'smart' | 'cheap'; // For UI grouping
  description: string;
  recommended?: boolean;
}

/**
 * Provider Configurations with Official Brand Colors
 */
export const PROVIDERS: Record<string, ModelProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    iconName: 'OpenAI',
    colors: {
      primary: '#000000',
      bg: 'bg-black/5',
      text: 'text-black',
      border: 'border-black/20',
    },
  },
  google: {
    id: 'google',
    name: 'Google',
    iconName: 'Google',
    colors: {
      primary: '#4285F4',
      gradient: ['#4285F4', '#EA4335', '#FBBC04', '#34A853'],
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    iconName: 'Anthropic',
    colors: {
      primary: '#C15F3C',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
    },
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    iconName: 'DeepSeek',
    colors: {
      primary: '#0066FF',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
  },
  xai: {
    id: 'xai',
    name: 'xAI',
    iconName: 'OpenAI', // Using OpenAI icon as placeholder
    colors: {
      primary: '#000000',
      bg: 'bg-gray-50',
      text: 'text-gray-800',
      border: 'border-gray-200',
    },
  },
};

/**
 * Comprehensive Model Registry (2025)
 * All models available via OpenRouter API
 */
export const MODELS: ModelInfo[] = [
  // ============ Anthropic Claude Models ============
  {
    id: 'anthropic/claude-4.5-sonnet',
    name: 'Claude 4.5 Sonnet',
    displayName: 'Claude 4.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 3.5, output: 16.0 },
    capabilities: ['text', 'code', 'reasoning', 'analysis', 'creative'],
    category: 'flagship',
    tier: 'smart',
    description: 'Latest Claude model with enhanced reasoning and creative capabilities',
    recommended: true,
  },
  {
    id: 'anthropic/claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    displayName: 'Claude 4 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 3.2, output: 15.5 },
    capabilities: ['text', 'code', 'reasoning', 'analysis', 'creative'],
    category: 'flagship',
    tier: 'smart',
    description: 'Advanced Claude model with excellent reasoning capabilities',
    recommended: true,
  },
  {
    id: 'anthropic/claude-4.1-opus',
    name: 'Claude 4.1 Opus',
    displayName: 'Claude 4.1 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 4.0, output: 18.0 },
    capabilities: ['text', 'code', 'reasoning', 'analysis', 'creative', 'complex-tasks'],
    category: 'flagship',
    tier: 'smart',
    description: 'Most powerful Claude model for complex tasks',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    displayName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ['text', 'code', 'reasoning', 'analysis', 'creative'],
    category: 'flagship',
    tier: 'smart',
    description: 'Flagship Claude model with excellent reasoning and creative capabilities',
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    displayName: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 0.8, output: 4.0 },
    capabilities: ['text', 'code', 'fast', 'cost-efficient'],
    category: 'fast',
    tier: 'cheap',
    description: 'Fast and efficient Claude model for quick responses',
  },

  // ============ OpenAI Models ============
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    displayName: 'GPT-5',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 2.5, output: 10.0 },
    capabilities: ['text', 'code', 'reasoning', 'long-context'],
    category: 'flagship',
    tier: 'smart',
    description: 'Most advanced OpenAI model with auto-switching capabilities and complex reasoning',
    recommended: true,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 2.0, output: 8.0 },
    capabilities: ['text', 'code', 'multimodal', 'long-context'],
    category: 'flagship',
    tier: 'smart',
    description: 'Multimodal flagship model with strong reasoning capabilities',
  },
  {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    displayName: 'GPT-4.1',
    provider: 'openai',
    contextWindow: 1000000, // 1M context
    pricing: { input: 2.0, output: 8.0 },
    capabilities: ['text', 'code', 'instruction-following', 'long-context'],
    category: 'flagship',
    tier: 'smart',
    description: 'Improved coding and instruction following with 1M token context window',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    displayName: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.4 },
    capabilities: ['text', 'code', 'fast', 'cost-efficient'],
    category: 'fast',
    tier: 'cheap',
    description: 'Fast and cost-efficient GPT-5 variant',
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    displayName: 'GPT-4.1 Mini',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: ['text', 'code', 'fast', 'cost-efficient'],
    category: 'fast',
    tier: 'cheap',
    description: 'Fast and cost-efficient variant with strong performance',
  },
  {
    id: 'openai/o4-mini',
    name: 'o4-mini',
    displayName: 'o4-mini',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ['reasoning', 'math', 'fast', 'cost-efficient'],
    category: 'reasoning',
    tier: 'cheap',
    description: 'Fast reasoning model optimized for AIME benchmarks',
  },

  // ============ Google Gemini Models ============
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    displayName: 'Gemini 2.5 Pro',
    provider: 'google',
    contextWindow: 1000000, // 1M context
    pricing: { input: 1.25, output: 5.0 },
    capabilities: ['text', 'code', 'reasoning', 'deep-think', 'multimodal'],
    category: 'flagship',
    tier: 'smart',
    description: 'Most advanced Gemini model with Deep Think mode for complex enterprise solutions',
    recommended: true,
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    displayName: 'Gemini 2.5 Flash',
    provider: 'google',
    contextWindow: 1000000, // 1M context
    pricing: { input: 0.075, output: 0.3 },
    capabilities: ['text', 'code', 'fast', 'cost-efficient', 'multimodal'],
    category: 'fast',
    tier: 'cheap',
    description: 'Best price/performance balance - ideal for most use cases',
    recommended: true,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    displayName: 'Gemini 2.5 Flash-Lite',
    provider: 'google',
    contextWindow: 1000000, // 1M context
    pricing: { input: 0.02, output: 0.08 },
    capabilities: ['text', 'fast', 'cost-efficient', 'high-volume'],
    category: 'lite',
    tier: 'cheap',
    description: 'Fastest and most cost-efficient for high-volume tasks',
  },

  // ============ DeepSeek Models ============
  {
    id: 'deepseek/deepseek-v3.2-exp',
    name: 'DeepSeek V3.2 Experimental',
    displayName: 'DeepSeek V3.2',
    provider: 'deepseek',
    contextWindow: 128000,
    pricing: { input: 0.27, output: 1.1 }, // 50% cost reduction with Sparse Attention
    capabilities: ['text', 'code', 'sparse-attention', 'long-context'],
    category: 'flagship',
    tier: 'cheap',
    description: 'Latest model with Sparse Attention - 50% cost reduction for long documents',
    recommended: true,
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    displayName: 'DeepSeek R1',
    provider: 'deepseek',
    contextWindow: 128000,
    pricing: { input: 0.55, output: 2.19 },
    capabilities: ['reasoning', 'math', 'code', 'complex-problems'],
    category: 'reasoning',
    tier: 'cheap',
    description: 'Advanced reasoning model - stronger on math and code',
  },

  // ============ xAI Models ============
  {
    id: 'xai/grok-3',
    name: 'Grok 3',
    displayName: 'Grok 3',
    provider: 'xai',
    contextWindow: 128000,
    pricing: { input: 2.0, output: 8.0 },
    capabilities: ['text', 'code', 'reasoning', 'real-time'],
    category: 'flagship',
    tier: 'smart',
    description: 'Latest xAI model with real-time information access',
  },
];

/**
 * Helper Functions
 */

export const getProviderForModel = (modelId: string): string => {
  const model = MODELS.find((m) => m.id === modelId);
  return model?.provider || 'google'; // Default to google
};

export const getModelInfo = (modelId: string): ModelInfo | undefined => {
  return MODELS.find((m) => m.id === modelId);
};

export const getModelDisplayName = (modelId: string): string => {
  const model = getModelInfo(modelId);
  return model?.displayName || modelId;
};

export const getProviderInfo = (providerId: string): ModelProvider | undefined => {
  return PROVIDERS[providerId];
};

export const getModelsByProvider = (providerId: string): ModelInfo[] => {
  return MODELS.filter((m) => m.provider === providerId);
};

export const getProviderColor = (modelId: string): string => {
  const provider = getProviderForModel(modelId);
  return PROVIDERS[provider]?.colors.primary || '#095D40';
};

export const getRecommendedModels = (): ModelInfo[] => {
  return MODELS.filter((m) => m.recommended);
};

export const getModelsByTier = (tier: 'smart' | 'cheap'): ModelInfo[] => {
  return MODELS.filter((m) => m.tier === tier);
};

/**
 * Legacy model mapping for backward compatibility
 */
export const LEGACY_MODEL_MAP: Record<string, string> = {
  'gemini-flash-latest': 'google/gemini-2.5-flash',
  'gemini-pro': 'google/gemini-2.5-pro',
  'gemini-flash': 'google/gemini-2.5-flash',
};

export const normalizeLegacyModel = (model: string): string => {
  return LEGACY_MODEL_MAP[model] || model;
};
