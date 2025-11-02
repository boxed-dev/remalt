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
