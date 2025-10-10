import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

const JINA_API_KEY = process.env.JINA_API_KEY;
const FETCH_TIMEOUT_MS = 20_000; // Increased for Jina API
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type AnalysisCacheEntry = {
  expiresAt: number;
  response: {
    url: string;
    pageTitle: string;
    pageContent: string;
    summary: string;
    keyPoints: string[];
    metadata: {
      description?: string;
      keywords?: string[];
    };
    status: 'success';
  };
};

const ANALYSIS_CACHE = new Map<string, AnalysisCacheEntry>();

function parseRequestBody(raw: string) {
  if (!raw || raw.trim() === '') {
    return null;
  }
  try {
    return JSON.parse(raw) as { url?: string };
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
}

function normalizeUrl(value: string) {
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    try {
      const parsed = new URL(`https://${value}`);
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  }
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithJinaReader(url: string) {
  console.log('[Webpage analysis] Using Jina AI Reader for:', url);

  // Jina Reader API format: https://r.jina.ai/{target-url}
  const jinaUrl = `https://r.jina.ai/${url}`;
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'X-Return-Format': 'markdown',
  };

  if (JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${JINA_API_KEY}`;
    console.log('[Webpage analysis] Using authenticated Jina API (200 RPM limit)');
  } else {
    console.log('[Webpage analysis] Using free Jina API (20 RPM limit)');
  }

  const response = await fetchWithTimeout(jinaUrl, { headers });

  if (!response.ok) {
    throw new Error(`Jina Reader failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Jina returns: { code, status, data: { title, description, url, content, usage: {...} } }
  if (data.code !== 200 || !data.data) {
    throw new Error(`Jina Reader error: ${data.status || 'Unknown error'}`);
  }

  const { title, description, content } = data.data;

  // Extract key points from markdown content (headings and important lines)
  const keyPoints = extractKeyPointsFromMarkdown(content || '');

  // Generate summary from first few sentences
  const summary = generateSummary(content || description || '');

  return {
    pageTitle: title || url,
    pageContent: content || '',
    summary,
    keyPoints,
    metadata: {
      description: description || summary,
      keywords: keyPoints.length ? keyPoints : undefined,
    },
  };
}

function extractKeyPointsFromMarkdown(markdown: string): string[] {
  const lines = markdown.split('\n').map(line => line.trim());
  const keyPoints: string[] = [];

  for (const line of lines) {
    // Extract headings (lines starting with #)
    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '').trim();
      if (heading.length > 0 && heading.length <= 140) {
        keyPoints.push(heading);
      }
    }
    // Extract list items
    else if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
      const listItem = line.replace(/^[-*+\d.]\s+/, '').trim();
      if (listItem.length > 0 && listItem.length <= 140) {
        keyPoints.push(listItem);
      }
    }

    if (keyPoints.length >= 8) break;
  }

  return keyPoints.slice(0, 5);
}

function generateSummary(text: string): string {
  // Remove markdown formatting for summary
  const cleanText = text
    .replace(/^#+\s+/gm, '') // Remove heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/`([^`]+)`/g, '$1') // Remove code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .trim();

  // Get first 3 sentences
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);

  if (sentences.length === 0) return '';

  return sentences.slice(0, 3).join(' ').trim();
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to analyze webpages');
  }

  try {
    const body = parseRequestBody(await req.text());
    const normalizedUrl = body?.url ? normalizeUrl(body.url) : null;

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 },
      );
    }

    const cachedEntry = ANALYSIS_CACHE.get(normalizedUrl);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      console.log('[Webpage analysis] ✅ Cache hit for:', normalizedUrl);
      return NextResponse.json(cachedEntry.response);
    }

    const result = await fetchWithJinaReader(normalizedUrl);

    console.log('[Webpage analysis] ✅ Success via Jina Reader', {
      title: result.pageTitle,
      contentLength: result.pageContent.length,
      keyPoints: result.keyPoints.length,
      hasApiKey: !!JINA_API_KEY,
    });

    const responseBody = {
      url: normalizedUrl,
      ...result,
      status: 'success',
    } as const;

    ANALYSIS_CACHE.set(normalizedUrl, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      response: responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Webpage Analysis Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze webpage';

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
      },
      { status: 500 },
    );
  }
}
