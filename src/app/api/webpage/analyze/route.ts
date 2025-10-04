import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

const USER_AGENT = 'Mozilla/5.0 (compatible; RemaltBot/1.0; +https://remalt.ai)';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_CONTENT_LENGTH = 12_000;

function parseRequestBody(raw: string) {
  if (!raw || raw.trim() === '') {
    throw new Error('Request body is empty');
  }
  try {
    return JSON.parse(raw) as { url?: string };
  } catch (error) {
    console.error('JSON parse error:', error);
    throw new Error('Invalid JSON in request body');
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

function stripHtml(html: string) {
  const withBreaks = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(br|\/?p|\/?div|\/?section|\/?article|\/?li|\/?ul|\/?ol|\/?tr|\/?td|\/?th|\/?h[1-6])[^>]*>/gi, '\n');

  return withBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractMeta(html: string, matcher: { attribute: 'property' | 'name'; value: string }): string | null {
  const { attribute, value } = matcher;
  const patterns = [
    new RegExp(`<meta[^>]*${attribute}=["']${value}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${value}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function buildSummary(content: string) {
  const normalized = content.replace(/\n+/g, ' ');
  const sentences = normalized.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
  if (sentences.length === 0) {
    return '';
  }
  const summarySentences = sentences.slice(0, 3);
  return summarySentences.join(' ').trim();
}

function extractKeyPoints(content: string) {
  const lines = content.split('\n').map((line) => line.trim());
  return lines
    .filter((line) => line.length > 0 && line.length <= 140)
    .filter((line, index) => index === 0 || /^[A-Z0-9]/.test(line))
    .slice(0, 5);
}

async function directHtmlAnalysis(url: string, userId: string) {
  console.log('[Webpage analysis] Using direct HTML fetch for:', url, 'user:', userId);

  const response = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  const cleanedContent = stripHtml(html).slice(0, MAX_CONTENT_LENGTH);
  const pageTitle = extractMeta(html, { attribute: 'property', value: 'og:title' })
    || extractTitle(html)
    || url;
  const description = extractMeta(html, { attribute: 'name', value: 'description' })
    || extractMeta(html, { attribute: 'property', value: 'og:description' })
    || '';

  const summary = buildSummary(cleanedContent);
  const keyPoints = extractKeyPoints(cleanedContent);

  return {
    pageTitle,
    pageContent: cleanedContent,
    summary,
    keyPoints,
    metadata: {
      description: description || summary,
      keywords: keyPoints.length ? keyPoints : undefined,
    },
  };
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to analyze webpages');
  }

  try {
    const body = parseRequestBody(await req.text());
    const normalizedUrl = typeof body.url === 'string' ? normalizeUrl(body.url) : null;

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 },
      );
    }

    const result = await directHtmlAnalysis(normalizedUrl, user.id);

    console.log('[Webpage analysis] ✅ Success', {
      title: result.pageTitle,
      length: result.pageContent.length,
      keyPoints: result.keyPoints.length,
    });

    return NextResponse.json({
      url: normalizedUrl,
      ...result,
      status: 'success',
    });
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
