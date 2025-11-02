import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'music.youtube.com',
]);

function isValidYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch (error) {
    return false;
  }
}

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (!isValidYouTubeUrl(targetUrl)) {
    return NextResponse.json({ error: 'Only YouTube URLs are supported' }, { status: 400 });
  }

  try {
    const metadataResponse = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Remalt/1.0; +https://remalt.ai)',
      },
      cache: 'no-store',
    });

    if (!metadataResponse.ok) {
      return NextResponse.json({ error: 'Failed to load video metadata' }, { status: metadataResponse.status });
    }

    const metadata = await metadataResponse.json();
    const title = typeof metadata.title === 'string' ? metadata.title : null;
    const author = typeof metadata.author_name === 'string' ? metadata.author_name : null;

    return NextResponse.json({ title, author });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = getHandler;
