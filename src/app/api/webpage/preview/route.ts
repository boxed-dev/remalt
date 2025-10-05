import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

const USER_AGENT = 'Mozilla/5.0 (compatible; RemaltBot/1.0; +https://remalt.ai)';
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type PreviewCacheEntry = {
  expiresAt: number;
  response: {
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    themeColor: string | null;
  };
};

const PREVIEW_CACHE = new Map<string, PreviewCacheEntry>();

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

function toAbsoluteUrl(value: string | null, base: string) {
  if (!value) return null;
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
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

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
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

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to preview webpages');
  }

  try {
    const body = parseRequestBody(await req.text());
    const normalizedUrl = body?.url ? normalizeUrl(body.url) : null;

    if (!normalizedUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const cachedEntry = PREVIEW_CACHE.get(normalizedUrl);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      return NextResponse.json(cachedEntry.response);
    }

    let html: string | null = null;
    try {
      const response = await fetchWithTimeout(normalizedUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (response.ok) {
        html = await response.text();
      } else {
        console.warn('Preview fetch failed with status', response.status, response.statusText);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Preview fetch timed out for', normalizedUrl);
      } else {
        console.error('Preview fetch error:', error);
      }
    }

    const ogTitle = html ? extractMeta(html, { attribute: 'property', value: 'og:title' }) : null;
    const ogDescription = html ? extractMeta(html, { attribute: 'property', value: 'og:description' }) : null;
    const ogImage = html ? extractMeta(html, { attribute: 'property', value: 'og:image' }) : null;
    const twitterImage = html ? extractMeta(html, { attribute: 'name', value: 'twitter:image' }) : null;
    const metaDescription = html ? extractMeta(html, { attribute: 'name', value: 'description' }) : null;
    const explicitTitle = html ? extractTitle(html) : null;
    const themeColor = html ? extractMeta(html, { attribute: 'name', value: 'theme-color' }) : null;
    const linkImageMatch = html ? html.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i) : null;

    const title = ogTitle || explicitTitle || normalizedUrl;
    const description = ogDescription || metaDescription || null;

    const imageCandidate = toAbsoluteUrl(ogImage, normalizedUrl)
      || toAbsoluteUrl(twitterImage, normalizedUrl)
      || toAbsoluteUrl(linkImageMatch?.[1] ?? null, normalizedUrl);

    let imageUrl = imageCandidate?.toString() ?? null;

    // If no og:image or twitter:image found, try to generate screenshot
    if (!imageUrl) {
      try {
        console.log('[Preview] No meta image found, attempting screenshot generation');
        const screenshotResponse = await fetch(`${req.nextUrl.origin}/api/webpage/screenshot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || '', // Pass auth cookie
          },
          body: JSON.stringify({ url: normalizedUrl }),
        });

        if (screenshotResponse.ok) {
          const screenshotData = await screenshotResponse.json();
          if (screenshotData.imageUrl) {
            imageUrl = screenshotData.imageUrl;
            console.log(`[Preview] Screenshot generated via ${screenshotData.provider}`);
          }
        } else {
          console.warn('[Preview] Screenshot API returned', screenshotResponse.status);
        }
      } catch (screenshotError) {
        console.error('[Preview] Screenshot fallback failed:', screenshotError);
        // Continue without screenshot - not critical
      }
    }

    const responseBody = {
      title,
      description,
      imageUrl,
      themeColor,
    } as const;

    PREVIEW_CACHE.set(normalizedUrl, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      response: responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Webpage preview error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load preview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
