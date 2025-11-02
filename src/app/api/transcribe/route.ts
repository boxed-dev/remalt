import { NextRequest, NextResponse } from 'next/server';
import { transcriptCache } from '@/lib/cache/transcript-cache';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { fetchSupadataTranscript } from '@/lib/api/supadata';

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/, // Support YouTube Shorts
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function postHandler(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to transcribe YouTube videos');
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`\n=== Transcription Request for ${videoId} ===`);
    console.log('User ID:', user.id);

    // Check cache first for instant response
    const cachedTranscript = transcriptCache.get(videoId);
    if (cachedTranscript) {
      console.log(`[Cache] ✅ Returning cached transcript (${cachedTranscript.length} chars)`);
      console.log(`[Result] ✅ Success via Cache\n`);
      return NextResponse.json({
        transcript: cachedTranscript,
        method: 'supadata',
        videoId,
        cached: true,
      });
    }

    // Fetch transcript using Supadata API
    const startTime = Date.now();
    const result = await fetchSupadataTranscript(url);
    const elapsed = Date.now() - startTime;

    if (!result.success) {
      console.log('[Result] ❌ Supadata transcription failed:', result.error);
      return NextResponse.json(
        {
          error: result.error || 'Transcription failed',
          videoId,
        },
        { status: 500 }
      );
    }

    // Cache the successful result
    transcriptCache.set(videoId, result.transcript!);
    console.log(`[Cache] Stored transcript for ${videoId}`);
    console.log(`[Result] ✅ Success via Supadata (${elapsed}ms)\n`);

    return NextResponse.json({
      transcript: result.transcript,
      method: 'supadata',
      videoId,
      cached: false,
      elapsed_ms: elapsed,
    });

  } catch (error) {
    console.error('Transcription API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract transcript';
    const errorDetails = error instanceof Error ? error.toString() : String(error);

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}

export const POST = postHandler;
