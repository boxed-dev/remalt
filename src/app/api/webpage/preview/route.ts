import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import Firecrawl from '@mendable/firecrawl-js';

const FIRECRAWL_API_KEY = 'fc-64322bfbcefd4930921a785b8bd464a7';

function toAbsoluteUrl(value: string | null, base: string): URL | null {
  if (!value) return null;
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to preview webpages');
  }

  try {
    let body;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Initialize Firecrawl
    const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

    // Scrape the webpage with metadata
    const result: any = await firecrawl.scrape(url, {
      formats: ['html'],
    });

    if (!result || (!result.success && !result.metadata)) {
      return NextResponse.json(
        { error: 'Failed to scrape webpage' },
        { status: 500 }
      );
    }

    // Extract metadata from the result
    const metadata = result.metadata || {};
    const title = (metadata.title as string) || (metadata.ogTitle as string) || url;
    const description = (metadata.description as string) || (metadata.ogDescription as string) || null;
    const metaImage = (metadata.ogImage as string) || (metadata.image as string) || null;
    const themeColor = (metadata.themeColor as string) || null;

    // Process image URL
    const imageUrlUrl = toAbsoluteUrl(metaImage, url);
    const imageUrlHost = imageUrlUrl?.hostname ?? null;
    const imageUrl = imageUrlUrl?.toString() ?? null;

    return NextResponse.json({
      title,
      description,
      imageUrl,
      imageUrlHost,
      themeColor,
    });
  } catch (error) {
    console.error('Firecrawl error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load preview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

