import { NextRequest, NextResponse } from 'next/server';
import { transcriptCache } from '@/lib/cache/transcript-cache';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { getRobustTranscript } from '@/lib/youtube/robust-transcription';

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
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
        method: 'cache',
        videoId,
        cached: true,
      });
    }

    // Use robust transcription pipeline with all fallback methods
    try {
      const result = await getRobustTranscript(url, videoId);

      // Cache the successful result
      transcriptCache.set(result.videoId, result.transcript);
      console.log(`[Cache] Stored transcript for ${result.videoId}`);
      console.log(`[Result] ✅ Success via ${result.method}\n`);

      return NextResponse.json({
        transcript: result.transcript,
        method: result.method,
        language: result.language,
        videoId: result.videoId,
        cached: false,
        elapsed_ms: result.elapsed_ms,
      });
    } catch (pipelineError) {
      // All methods in the pipeline failed
      console.log('[Result] ❌ All transcription methods failed\n');

      const errorMessage = pipelineError instanceof Error
        ? pipelineError.message
        : 'All transcription methods exhausted';

      return NextResponse.json(
        {
          error: 'Transcription failed',
          details: errorMessage,
          videoId,
        },
        { status: 500 }
      );
    }

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
