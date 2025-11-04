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
 * Handpicked models optimized for content creation and reasoning
 */
export const MODELS: ModelInfo[] = [
  // ============ Google Gemini Models ============
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
    description: 'Most capable Gemini with advanced reasoning and 1M context',
    recommended: true,
    badge: 'Reasoning',
  },
  {
    id: 'google/gemini-2.5-flash-preview-09-2025',
    name: 'Gemini 2.5 Flash',
    displayName: 'Gemini Flash',
    provider: 'google',
    contextWindow: 1000000,
    pricing: { input: 0.5, output: 2.0 },
    capabilities: ['fast', 'multimodal', 'coding', 'content'],
    category: 'fast',
    tier: 'cheap',
    description: 'Fast content creation with 1M context window',
    badge: 'Content',
  },
  {
    id: 'google/gemini-2.5-flash-lite-preview-09-2025',
    name: 'Gemini 2.5 Flash Lite',
    displayName: 'Gemini Lite',
    provider: 'google',
    contextWindow: 1000000,
    pricing: { input: 0.1, output: 0.4 },
    capabilities: ['fast', 'cost-efficient', 'content'],
    category: 'lite',
    tier: 'cheap',
    description: 'Ultra-fast and cost-efficient for simple tasks',
    badge: 'Fast',
  },

  // ============ OpenAI GPT-5 Models ============
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    displayName: 'GPT-5',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 1.25, output: 10.0 },
    capabilities: ['writing', 'reasoning', 'coding', 'multimodal'],
    category: 'flagship',
    tier: 'smart',
    description: 'Most advanced OpenAI model for writing and reasoning',
    recommended: true,
    badge: 'Writing',
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    displayName: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 0.25, output: 2.0 },
    capabilities: ['fast', 'reasoning', 'content'],
    category: 'fast',
    tier: 'cheap',
    description: 'Compact GPT-5 for faster content generation',
    badge: 'Content',
  },
  {
    id: 'openai/gpt-5-pro',
    name: 'GPT-5 Pro',
    displayName: 'GPT-5 Pro',
    provider: 'openai',
    contextWindow: 128000,
    pricing: { input: 2.5, output: 10.0 },
    capabilities: ['reasoning', 'coding', 'analysis'],
    category: 'reasoning',
    tier: 'smart',
    description: 'Optimized for complex reasoning and high-stakes tasks',
    badge: 'Reasoning',
  },

  // ============ xAI Grok Models ============
  {
    id: 'x-ai/grok-4',
    name: 'Grok 4',
    displayName: 'Grok 4',
    provider: 'xai',
    contextWindow: 256000,
    pricing: { input: 2.0, output: 8.0 },
    capabilities: ['reasoning', 'real-time', 'multimodal', 'tools'],
    category: 'flagship',
    tier: 'smart',
    description: 'Latest reasoning model with 256k context and parallel tools',
    badge: 'Real-time',
    recommended: true,
  },
  {
    id: 'x-ai/grok-4-fast',
    name: 'Grok 4 Fast',
    displayName: 'Grok 4 Fast',
    provider: 'xai',
    contextWindow: 2000000,
    pricing: { input: 1.0, output: 4.0 },
    capabilities: ['fast', 'multimodal', 'cost-efficient', 'reasoning'],
    category: 'fast',
    tier: 'cheap',
    description: 'SOTA cost-efficiency with 2M context window',
    badge: 'Fast',
  },
  {
    id: 'x-ai/grok-3',
    name: 'Grok 3',
    displayName: 'Grok 3',
    provider: 'xai',
    contextWindow: 128000,
    pricing: { input: 1.5, output: 6.0 },
    capabilities: ['reasoning', 'coding', 'data-extraction'],
    category: 'flagship',
    tier: 'smart',
    description: 'Enterprise flagship for data extraction and coding',
    badge: 'Enterprise',
  },
  {
    id: 'x-ai/grok-3-mini',
    name: 'Grok 3 Mini',
    displayName: 'Grok 3 Mini',
    provider: 'xai',
    contextWindow: 128000,
    pricing: { input: 0.4, output: 1.6 },
    capabilities: ['fast', 'reasoning', 'thinking'],
    category: 'fast',
    tier: 'cheap',
    description: 'Lightweight thinking model with reasoning capabilities',
    badge: 'Thinking',
  },
  {
    id: 'x-ai/grok-code-fast-1',
    name: 'Grok Code Fast',
    displayName: 'Grok Code Fast',
    provider: 'xai',
    contextWindow: 128000,
    pricing: { input: 0.5, output: 2.0 },
    capabilities: ['coding', 'fast', 'agentic'],
    category: 'fast',
    tier: 'cheap',
    description: 'Speedy and economical for agentic coding tasks',
    badge: 'Coding',
  },

  // ============ DeepSeek Models ============
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    displayName: 'DeepSeek R1',
    provider: 'deepseek',
    contextWindow: 64000,
    pricing: { input: 0.8, output: 3.2 },
    capabilities: ['reasoning', 'math', 'coding'],
    category: 'reasoning',
    tier: 'cheap',
    description: 'Advanced reasoning for math and coding problems',
    badge: 'Reasoning',
  },
  {
    id: 'deepseek/deepseek-v3.2-exp',
    name: 'DeepSeek V3.2',
    displayName: 'DeepSeek V3.2',
    provider: 'deepseek',
    contextWindow: 128000,
    pricing: { input: 0.5, output: 2.0 },
    capabilities: ['coding', 'reasoning', 'cost-efficient'],
    category: 'fast',
    tier: 'cheap',
    description: 'Excellent coding and reasoning at low cost',
    badge: 'Coding',
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
  'gemini-flash-latest': 'google/gemini-2.5-flash-preview-09-2025',
  'gemini-pro': 'google/gemini-2.5-pro',
  'gemini-flash': 'google/gemini-2.5-flash-preview-09-2025',
  'google/gemini-2.5-flash': 'google/gemini-2.5-flash-preview-09-2025',
  'google/gemini-flash-lite': 'google/gemini-2.5-flash-lite-preview-09-2025',

  // Old OpenAI model names
  'openai/gpt-4o': 'openai/gpt-5',
  'openai/gpt-5-image': 'openai/gpt-5',
  'openai/gpt-5-image-mini': 'openai/gpt-5-mini',

  // Old xAI model names (incorrect format without hyphen)
  'xai/grok-4': 'x-ai/grok-4',
  'xai/grok-4-fast': 'x-ai/grok-4-fast',
  'xai/grok-3': 'x-ai/grok-3',
  'xai/grok-3-mini': 'x-ai/grok-3-mini',
  'xai/grok-code-fast-1': 'x-ai/grok-code-fast-1',
};

export const normalizeLegacyModel = (model: string): string => {
  return LEGACY_MODEL_MAP[model] || model;
};
