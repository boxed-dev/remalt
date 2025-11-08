/**
 * Tavily API Client
 * Web search API for retrieving real-time information
 * https://docs.tavily.com/docs/tavily-api/rest_api
 */

export interface TavilySearchOptions {
  query: string;
  search_depth?: 'basic' | 'advanced';
  topic?: 'general' | 'news' | 'finance';
  max_results?: number;
  include_answer?: boolean;
  include_raw_content?: boolean;
  time_range?: 'day' | 'week' | 'month' | 'year';
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  favicon?: string;
  raw_content?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  images?: Array<{ url: string; description: string }>;
  response_time: number;
  request_id: string;
}

/**
 * Perform a web search using Tavily API
 */
export async function search(options: TavilySearchOptions): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured');
  }

  const {
    query,
    search_depth = 'basic',
    topic = 'general',
    max_results = 5,
    include_answer = true,
    include_raw_content = false,
    time_range,
  } = options;

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth,
        topic,
        max_results,
        include_answer,
        include_raw_content,
        ...(time_range && { time_range }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Tavily] Search failed:', error);
    throw error;
  }
}

/**
 * Check if Tavily API is configured
 */
export function isConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error occurred';
}
