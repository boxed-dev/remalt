import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { createClient } from '@/lib/supabase/server';

// API timeout: 2 minutes for edge function call
const API_TIMEOUT_MS = 120000;

// Timeout wrapper for promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

async function postHandler(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to parse PDFs');
  }

  try {
    const { pdfData, pdfUrl, storagePath, storageUrl, forceReparse, useContextCache } = await req.json();

    // Validate input
    if (!pdfData && !pdfUrl && !storagePath && !storageUrl) {
      return NextResponse.json(
        { error: 'PDF data, URL, or storage path is required' },
        { status: 400 }
      );
    }

    console.log('\n=== PDF Parsing Request (via Edge Function) ===');
    console.log('User ID:', user.id);

    // Get Supabase client and function URL
    const supabase = await createClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/parse-pdf`;

    // Prepare request payload
    const payload = {
      pdfData,
      pdfUrl,
      storagePath,
      storageUrl,
      forceReparse: forceReparse || false,
      useContextCache: useContextCache || false,
    };

    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return unauthorizedResponse('Authentication session not found');
    }

    console.log('Calling edge function...');

    // Call edge function with timeout
    const result = await withTimeout(
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }),
      API_TIMEOUT_MS,
      'PDF parsing timed out. The file might be too large or complex.'
    );

    if (!result.ok) {
      const errorData = await result.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Edge function error:', errorData);

      return NextResponse.json(
        {
          error: errorData.error || 'Failed to parse PDF',
          status: 'error',
          code: result.status === 413 ? 'FILE_TOO_LARGE' :
                result.status === 400 ? 'INVALID_REQUEST' :
                'PARSE_ERROR'
        },
        { status: result.status }
      );
    }

    const data = await result.json();

    console.log('[Result] ✅ Success');
    console.log('  Parse method:', data.parseMethod);
    console.log('  Cached:', data.cached);
    console.log('  Parsed text length:', data.parsedText?.length || 0, 'chars');
    console.log('  Segments:', data.segments?.length || 0);
    console.log('  Pages:', data.pageCount || 0);
    console.log('  Duration:', data.parseDurationMs, 'ms');
    console.log('===================\n');

    return NextResponse.json({
      parsedText: data.parsedText || '',
      segments: data.segments || [],
      pageCount: data.pageCount || 1,
      status: 'success',
      metadata: {
        parseMethod: data.parseMethod,
        cached: data.cached,
        parseDurationMs: data.parseDurationMs,
        edgeFunction: true,
      }
    });

  } catch (error) {
    console.error('PDF Parsing Error:', error);

    // Handle specific error types
    let errorMessage = 'Failed to parse PDF';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for timeout
      if (errorMessage.includes('timed out')) {
        statusCode = 504;
      }
      // Check for rate limit
      else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        statusCode = 429;
        errorMessage = 'API rate limit exceeded. Please try again in a moment.';
      }
      // Check for invalid PDF
      else if (errorMessage.includes('invalid') || errorMessage.includes('corrupt')) {
        statusCode = 400;
        errorMessage = 'Invalid or corrupted PDF file';
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
        code: statusCode === 429 ? 'RATE_LIMIT' :
              statusCode === 504 ? 'TIMEOUT' :
              statusCode === 400 ? 'INVALID_FILE' : 'PARSE_ERROR'
      },
      { status: statusCode }
    );
  }
}

export const POST = postHandler;
