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
  badge?: string; // Simple badge label
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
    iconName: 'XAi',
    colors: {
      primary: '#000000',
      bg: 'bg-gray-50',
      text: 'text-gray-900',
      border: 'border-gray-200',
    },
  },
};

/**
 * Curated Model Registry (2025)
 * Models matching the screenshot specification
 */
export const MODELS: ModelInfo[] = [
  // ============ Smart (Higher Credits) - Anthropic ============
  {
    id: 'anthropic/claude-4.5-sonnet',
    name: 'Claude 4.5 Sonnet',
    displayName: 'Claude 4.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ['reasoning', 'coding', 'writing', 'analysis'],
    category: 'flagship',
    tier: 'smart',
    description: 'Most advanced Claude for complex reasoning and analysis',
    recommended: true,
  },
  {
    id: 'anthropic/claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    displayName: 'Claude 4 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ['reasoning', 'coding', 'writing'],
    category: 'flagship',
    tier: 'smart',
    description: 'Balanced performance for general tasks',
  },
  {
    id: 'anthropic/claude-4.1-opus',
    name: 'Claude 4.1 Opus',
    displayName: 'Claude 4.1 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0 },
    capabilities: ['reasoning', 'coding', 'analysis', 'long-form'],
    category: 'flagship',
    tier: 'smart',
    description: 'Premium model for highest quality outputs',
  },

  // ============ Smart (Higher Credits) - OpenAI ============
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    displayName: 'GPT-5',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 5.0, output: 15.0 },
    capabilities: ['writing', 'reasoning', 'coding', 'multimodal'],
    category: 'flagship',
    tier: 'smart',
    description: 'Latest and most capable GPT model',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 2.5, output: 10.0 },
    capabilities: ['multimodal', 'fast', 'vision'],
    category: 'flagship',
    tier: 'smart',
    description: 'Fast multimodal model with vision capabilities',
  },

  // ============ Smart (Higher Credits) - Google ============
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    displayName: 'Gemini 2.5 Pro',
    provider: 'google',
    contextWindow: 1000000,
    pricing: { input: 1.25, output: 5.0 },
    capabilities: ['reasoning', 'coding', 'multimodal', 'long-context'],
    category: 'flagship',
    tier: 'smart',
    description: 'Most capable Gemini with 1M context window',
  },

  // ============ Smart (Higher Credits) - xAI ============
  {
    id: 'x-ai/grok-3',
    name: 'Grok 3',
    displayName: 'Grok 3',
    provider: 'xai',
    contextWindow: 128000,
    pricing: { input: 1.5, output: 6.0 },
    capabilities: ['reasoning', 'coding', 'real-time'],
    category: 'flagship',
    tier: 'smart',
    description: 'Latest Grok model with real-time data',
  },

  // ============ Cheap - OpenAI ============
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    displayName: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: ['fast', 'reasoning', 'content'],
    category: 'fast',
    tier: 'cheap',
    description: 'Fast and cost-effective GPT model',
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
  // Old Gemini model names
  'gemini-flash-latest': 'google/gemini-2.5-pro',
  'gemini-pro': 'google/gemini-2.5-pro',
  'gemini-flash': 'google/gemini-2.5-pro',
  'google/gemini-2.5-flash': 'google/gemini-2.5-pro',
  'google/gemini-flash-lite': 'google/gemini-2.5-pro',
  'google/gemini-2.5-flash-preview-09-2025': 'google/gemini-2.5-pro',
  'google/gemini-2.5-flash-lite-preview-09-2025': 'google/gemini-2.5-pro',

  // Old OpenAI model names
  'openai/gpt-5-image': 'openai/gpt-5',
  'openai/gpt-5-image-mini': 'openai/gpt-5-mini',

  // Old Anthropic model names
  'anthropic/claude-3.5-sonnet': 'anthropic/claude-4.5-sonnet',
  'anthropic/claude-3-opus': 'anthropic/claude-4.1-opus',

  // Old xAI model names (incorrect format without hyphen)
  'xai/grok-4': 'x-ai/grok-3',
  'xai/grok-4-fast': 'x-ai/grok-3',
  'xai/grok-3': 'x-ai/grok-3',
  'xai/grok-3-mini': 'x-ai/grok-3',
  'xai/grok-code-fast-1': 'x-ai/grok-3',
  'x-ai/grok-4': 'x-ai/grok-3',
  'x-ai/grok-4-fast': 'x-ai/grok-3',
  'x-ai/grok-3-mini': 'x-ai/grok-3',
  'x-ai/grok-code-fast-1': 'x-ai/grok-3',
};

export const normalizeLegacyModel = (model: string): string => {
  return LEGACY_MODEL_MAP[model] || model;
};
