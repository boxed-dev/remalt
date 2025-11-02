import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

const FETCH_TIMEOUT_MS = 15_000;

interface ScreenshotProvider {
  name: string;
  getUrl: (targetUrl: string) => string;
  requiresAuth: boolean;
  priority: number;
}

/**
 * Enterprise-grade screenshot providers with fallback chain
 * Priority: 1 (highest) to 5 (lowest)
 */
const SCREENSHOT_PROVIDERS: ScreenshotProvider[] = [
  // ScreenshotOne - Best quality, requires API key
  {
    name: 'ScreenshotOne',
    getUrl: (url) => {
      const apiKey = process.env.SCREENSHOTONE_API_KEY;
      if (!apiKey) return '';
      const params = new URLSearchParams({
        url,
        access_key: apiKey,
        viewport_width: '1280',
        viewport_height: '720',
        device_scale_factor: '2',
        format: 'jpg',
        image_quality: '85',
        block_ads: 'true',
        block_cookie_banners: 'true',
        block_trackers: 'true',
        cache: 'true',
        cache_ttl: '2592000', // 30 days
      });
      return `https://api.screenshotone.com/take?${params}`;
    },
    requiresAuth: true,
    priority: 1,
  },

  // ApiFlash - Excellent reliability, requires API key
  {
    name: 'ApiFlash',
    getUrl: (url) => {
      const apiKey = process.env.APIFLASH_API_KEY;
      if (!apiKey) return '';
      const params = new URLSearchParams({
        access_key: apiKey,
        url,
        width: '1280',
        height: '720',
        format: 'jpeg',
        quality: '85',
        fresh: 'false',
        ttl: '2592000', // 30 days
      });
      return `https://api.apiflash.com/v1/urltoimage?${params}`;
    },
    requiresAuth: true,
    priority: 2,
  },

  // ScreenshotAPI - Good quality, requires API key
  {
    name: 'ScreenshotAPI',
    getUrl: (url) => {
      const apiKey = process.env.SCREENSHOTAPI_API_KEY;
      if (!apiKey) return '';
      const params = new URLSearchParams({
        token: apiKey,
        url,
        width: '1280',
        height: '720',
        output: 'image',
        file_type: 'jpeg',
        wait_for_event: 'load',
        fresh: 'false',
      });
      return `https://shot.screenshotapi.net/screenshot?${params}`;
    },
    requiresAuth: true,
    priority: 3,
  },

  // Microlink - Free tier available, good quality
  {
    name: 'Microlink',
    getUrl: (url) => {
      const params = new URLSearchParams({
        url,
        screenshot: 'true',
        meta: 'false',
        embed: 'screenshot.url',
        viewport: '1280x720',
        type: 'jpeg',
        quality: '85',
      });
      return `https://api.microlink.io/?${params}`;
    },
    requiresAuth: false,
    priority: 4,
  },

  // Urlbox - Requires API key but has generous free tier
  {
    name: 'Urlbox',
    getUrl: (url) => {
      const apiKey = process.env.URLBOX_API_KEY;
      const secret = process.env.URLBOX_SECRET;
      if (!apiKey || !secret) return '';

      const params = new URLSearchParams({
        url,
        width: '1280',
        height: '720',
        format: 'jpg',
        quality: '85',
        retina: 'true',
        ttl: '2592000',
      });

      // In production, you'd sign this with HMAC-SHA256 using the secret
      return `https://api.urlbox.io/v1/${apiKey}/jpeg?${params}`;
    },
    requiresAuth: true,
    priority: 2,
  },
];

async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RemaltBot/1.0; +https://remalt.ai)',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryProvider(provider: ScreenshotProvider, targetUrl: string): Promise<string | null> {
  const providerUrl = provider.getUrl(targetUrl);

  if (!providerUrl) {
    console.log(`[Screenshot] Provider ${provider.name} not configured (missing API key)`);
    return null;
  }

  console.log(`[Screenshot] Trying provider: ${provider.name}`);

  try {
    const response = await fetchWithTimeout(providerUrl, FETCH_TIMEOUT_MS);

    if (!response.ok) {
      console.warn(`[Screenshot] Provider ${provider.name} failed with status ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');

    // Handle Microlink's JSON response
    if (provider.name === 'Microlink') {
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        if (data?.data?.screenshot?.url) {
          console.log(`[Screenshot] Provider ${provider.name} succeeded (JSON response)`);
          return data.data.screenshot.url;
        }
      }
      console.warn(`[Screenshot] Provider ${provider.name} returned unexpected format`);
      return null;
    }

    // For image responses, convert to base64
    if (contentType?.startsWith('image/')) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = contentType;
      console.log(`[Screenshot] Provider ${provider.name} succeeded (${(buffer.byteLength / 1024).toFixed(1)}KB)`);
      return `data:${mimeType};base64,${base64}`;
    }

    console.warn(`[Screenshot] Provider ${provider.name} returned unexpected content-type: ${contentType}`);
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Screenshot] Provider ${provider.name} timed out`);
    } else {
      console.error(`[Screenshot] Provider ${provider.name} error:`, error);
    }
    return null;
  }
}

async function postHandler(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to generate screenshots');
  }

  try {
    const body = await req.json();
    const targetUrl = body.url;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let normalizedUrl: string;
    try {
      const parsed = new URL(targetUrl);
      normalizedUrl = parsed.toString();
    } catch {
      try {
        const parsed = new URL(`https://${targetUrl}`);
        normalizedUrl = parsed.toString();
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }

    console.log(`[Screenshot] Generating screenshot for: ${normalizedUrl}`);

    // Sort providers by priority (lower number = higher priority)
    const sortedProviders = [...SCREENSHOT_PROVIDERS].sort((a, b) => a.priority - b.priority);

    // Try each provider in order
    for (const provider of sortedProviders) {
      const imageUrl = await tryProvider(provider, normalizedUrl);

      if (imageUrl) {
        return NextResponse.json({
          success: true,
          imageUrl,
          provider: provider.name,
          cached: false,
        });
      }
    }

    // All providers failed
    console.error('[Screenshot] All providers failed');
    return NextResponse.json(
      {
        error: 'Failed to generate screenshot. All providers unavailable.',
        providers: sortedProviders.map(p => p.name),
      },
      { status: 503 }
    );

  } catch (error) {
    console.error('[Screenshot] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate screenshot';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = postHandler;
