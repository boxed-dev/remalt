/**
 * Gemini Context Caching Utilities
 *
 * Provides utilities for using Gemini's context caching feature
 * to reduce cost and latency for repeated PDF processing.
 *
 * Context caching reduces input token costs by 90% for Gemini 2.5+
 */

import { GoogleGenerativeAI, CachedContent } from '@google/generative-ai';

export interface ContextCacheOptions {
  ttlSeconds?: number; // Time to live in seconds (default: 1 hour)
  displayName?: string;
}

export interface CachedContextResult {
  cacheName: string;
  model: any; // Gemini model with cached context
  ttlSeconds: number;
}

/**
 * Create a cached context for a PDF file
 */
export async function createPdfContextCache(
  fileUri: string,
  systemPrompt: string,
  options: ContextCacheOptions = {}
): Promise<CachedContextResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const ttl = options.ttlSeconds || 3600; // Default 1 hour

  // Create cached content
  const cache = await genAI.cacheManager.create({
    model: 'models/gemini-2.5-flash',
    displayName: options.displayName || 'PDF Document Cache',
    systemInstruction: systemPrompt,
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              mimeType: 'application/pdf',
              fileUri: fileUri,
            },
          },
        ],
      },
    ],
    ttlSeconds: ttl,
  });

  console.log('[Context Cache] Created:', {
    name: cache.name,
    displayName: cache.displayName,
    ttl: ttl,
  });

  // Create model with cached context
  const model = genAI.getGenerativeModelFromCachedContent(cache);

  return {
    cacheName: cache.name || '',
    model,
    ttlSeconds: ttl,
  };
}

/**
 * Get an existing cached context
 */
export async function getCachedContext(cacheName: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Get cached content
  const cache = await genAI.cacheManager.get(cacheName);

  // Create model from cached content
  const model = genAI.getGenerativeModelFromCachedContent(cache);

  console.log('[Context Cache] Retrieved:', cacheName);

  return model;
}

/**
 * Delete a cached context
 */
export async function deleteCachedContext(cacheName: string): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  await genAI.cacheManager.delete(cacheName);
  console.log('[Context Cache] Deleted:', cacheName);
}

/**
 * Update cached context TTL
 */
export async function updateCacheTtl(
  cacheName: string,
  ttlSeconds: number
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  await genAI.cacheManager.update(cacheName, {
    cachedContent: {
      ttlSeconds: ttlSeconds,
    },
  });

  console.log('[Context Cache] Updated TTL:', { cacheName, ttlSeconds });
}

/**
 * List all cached contexts
 */
export async function listCachedContexts(): Promise<CachedContent[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const caches = await genAI.cacheManager.list();
  return caches.cachedContents || [];
}
