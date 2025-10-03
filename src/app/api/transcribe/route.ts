import { NextRequest, NextResponse } from 'next/server';
import { transcriptCache } from '@/lib/cache/transcript-cache';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

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

// Call Python API for transcription (using youtube_transcript_api)
async function getPythonTranscript(url: string): Promise<{ 
  transcript: string; 
  method: string; 
  language: string; 
  videoId: string;
  cached: boolean;
  elapsed_ms: number;
} | null> {
  try {
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5001';
    console.log(`[Python API] Calling ${pythonApiUrl}/api/transcribe for URL: ${url}`);

    const response = await fetch(`${pythonApiUrl}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Python API] ❌ Error:', errorData);
      return null;
    }

    const data = await response.json();
    console.log(`[Python API] ✅ Success - ${data.transcript.length} chars (${data.language}) in ${data.elapsed_ms.toFixed(0)}ms`);
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Python API] ❌ Failed:', errorMessage);
    return null;
  }
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

    // Call Python API for transcription
    const pythonResult = await getPythonTranscript(url);
    if (pythonResult) {
      // Cache the successful result
      transcriptCache.set(pythonResult.videoId, pythonResult.transcript);
      console.log(`[Cache] Stored transcript for ${pythonResult.videoId}`);
      console.log(`[Result] ✅ Success via Python API (${pythonResult.language})\n`);
      
      return NextResponse.json({
        transcript: pythonResult.transcript,
        method: pythonResult.method,
        language: pythonResult.language,
        videoId: pythonResult.videoId,
        cached: false,
        elapsed_ms: pythonResult.elapsed_ms,
      });
    }

    // Python API failed
    console.log('[Result] ❌ Python API transcription failed\n');
    return NextResponse.json(
      {
        error: 'Transcription failed',
        details: 'Unable to extract transcript using Python API.',
        videoId,
      },
      { status: 500 }
    );

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
