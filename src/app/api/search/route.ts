import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { search as tavilySearch, isConfigured, getErrorMessage } from '@/lib/api/tavily-client';
import type { TavilySearchResponse } from '@/lib/api/tavily-client';

/**
 * In-memory cache for search results
 * Prevents duplicate API calls for the same query
 */
const searchCache = new Map<string, {
  result: TavilySearchResponse;
  timestamp: number;
}>();

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Get cached search result if available and not expired
 */
function getCachedSearch(query: string): TavilySearchResponse | null {
  const cached = searchCache.get(query.toLowerCase().trim());
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    searchCache.delete(query.toLowerCase().trim());
    return null;
  }

  return cached.result;
}

/**
 * Store search result in cache
 */
function setCachedSearch(query: string, result: TavilySearchResponse): void {
  searchCache.set(query.toLowerCase().trim(), {
    result,
    timestamp: Date.now(),
  });

  // Clean up old entries (keep cache size reasonable)
  if (searchCache.size > 100) {
    const entries = Array.from(searchCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    // Remove oldest 20 entries
    for (let i = 0; i < 20; i++) {
      searchCache.delete(entries[i][0]);
    }
  }
}

/**
 * POST /api/search
 * Perform web search using Tavily API
 */
export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to perform web searches');
  }

  try {
    // Check if Tavily is configured
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'Web search is not configured. TAVILY_API_KEY is missing.' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      query,
      search_depth = 'basic',
      max_results = 5,
      include_answer = true,
      topic = 'general',
      time_range,
    } = body;

    // Validate query
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = getCachedSearch(query);
    if (cached) {
      console.log('[Search API] Cache hit for query:', query);
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // Perform search
    console.log('[Search API] Performing search for query:', query);
    const startTime = Date.now();

    const result = await tavilySearch({
      query,
      search_depth,
      max_results,
      include_answer,
      topic,
      time_range,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[Search API] Search completed in ${elapsed}ms`);
    console.log(`[Search API] Found ${result.results.length} results`);

    // Cache the result
    setCachedSearch(query, result);

    return NextResponse.json({
      ...result,
      cached: false,
      elapsed_ms: elapsed,
    });

  } catch (error) {
    console.error('[Search API] Error:', error);

    const errorMessage = getErrorMessage(error);

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
