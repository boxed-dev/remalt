import { NextRequest, NextResponse } from 'next/server';
import {
  getChannelWithVideos,
  getChannelVideos,
  extractChannelId,
} from '@/lib/api/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/youtube/channel?url=...&maxResults=10&pageToken=...
 * Fetch channel details and videos from a YouTube channel URL
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const maxResults = parseInt(searchParams.get('maxResults') || '10', 10);
    const pageToken = searchParams.get('pageToken') || undefined;

    if (!url) {
      return NextResponse.json(
        { error: 'Missing required parameter: url' },
        { status: 400 }
      );
    }

    // Validate that this is actually a channel URL
    const channelInfo = extractChannelId(url);
    if (!channelInfo) {
      return NextResponse.json(
        { error: 'Invalid YouTube channel URL. Please provide a channel URL (e.g., youtube.com/@username or youtube.com/channel/UCxxx)' },
        { status: 400 }
      );
    }

    const result = await getChannelWithVideos(url, maxResults, pageToken);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[YouTube Channel API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch channel data';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/youtube/channel/videos
 * Fetch more videos from a channel (for pagination)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, maxResults = 10, pageToken } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: 'Missing required parameter: channelId' },
        { status: 400 }
      );
    }

    const result = await getChannelVideos(channelId, maxResults, pageToken);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[YouTube Channel Videos API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch channel videos';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
