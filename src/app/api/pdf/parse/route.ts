import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { parsePdf, parsePdfFromUrl } from '@/lib/pdf/parser';
import { createJob, registerProcessor, updateJobProgress } from '@/lib/pdf/job-queue';
import { createClient } from '@supabase/supabase-js';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;
// Threshold for background processing: 20MB
const BACKGROUND_THRESHOLD = 20 * 1024 * 1024;
// API timeout: 2 minutes for synchronous parsing
const API_TIMEOUT_MS = 120000;

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Timeout wrapper for promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// Register job processor for background jobs
registerProcessor(async (job) => {
  console.log('[PDF Parse] Processing background job:', job.id);

  try {
    updateJobProgress(job.id, 20);

    let pdfBuffer: ArrayBuffer;

    // Fetch PDF based on available data
    if (job.uploadcareCdnUrl) {
      const response = await fetch(job.uploadcareCdnUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      pdfBuffer = await response.arrayBuffer();
    } else if (job.pdfUrl) {
      const response = await fetch(job.pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      pdfBuffer = await response.arrayBuffer();
    } else {
      throw new Error('No PDF source available');
    }

    updateJobProgress(job.id, 30);

    // Parse PDF with hybrid approach
    const result = await parsePdf(job.pdfIdentifier, pdfBuffer, {
      useContextCache: true, // Use context caching for large files
    });

    return {
      parsedText: result.parsedText,
      segments: result.segments,
      pageCount: result.pageCount,
      parseMethod: result.parseMethod,
    };
  } catch (error) {
    console.error('[PDF Parse] Background job error:', error);
    throw error;
  }
});

export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to parse PDFs');
  }

  try {
    const { pdfData, pdfUrl, storagePath, uploadcareCdnUrl, uploadcareUuid } = await req.json();

    // Validate input
    if (!pdfData && !pdfUrl && !storagePath && !uploadcareCdnUrl) {
      return NextResponse.json(
        { error: 'PDF data, URL, storage path, or Uploadcare CDN URL is required' },
        { status: 400 }
      );
    }

    console.log('\n=== PDF Parsing Request ===');
    console.log('User ID:', user.id);

    let pdfBuffer: ArrayBuffer;
    let fileSize: number;
    let source: 'storage' | 'url' | 'upload' | 'uploadcare';
    let fileName: string | undefined;

    // Generate PDF identifier for caching (prefer uploadcare UUID)
    let pdfIdentifier: string;
    if (uploadcareUuid) {
      pdfIdentifier = uploadcareUuid;
    } else if (uploadcareCdnUrl) {
      // Extract UUID from URL if not provided
      const match = uploadcareCdnUrl.match(/\/([a-f0-9-]+)\//);
      pdfIdentifier = match ? match[1] : `url-${hashString(uploadcareCdnUrl)}`;
    } else if (pdfUrl) {
      pdfIdentifier = `url-${hashString(pdfUrl)}`;
    } else {
      pdfIdentifier = `upload-${Date.now()}`;
    }

    // Get PDF data from different sources
    if (uploadcareCdnUrl) {
      // Fetch from Uploadcare CDN
      console.log('Source: Uploadcare CDN');
      source = 'uploadcare';

      const urlResponse = await withTimeout(
        fetch(uploadcareCdnUrl),
        30000,
        'PDF download from Uploadcare CDN timed out'
      );

      if (!urlResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF from Uploadcare CDN: ${urlResponse.statusText}` },
          { status: 400 }
        );
      }

      pdfBuffer = await urlResponse.arrayBuffer();
      fileSize = pdfBuffer.byteLength;
      fileName = uploadcareCdnUrl.split('/').pop();

    } else if (storagePath) {
      // Fetch from Supabase Storage
      console.log('Source: Supabase Storage');
      source = 'storage';
      const supabase = getSupabaseClient();

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('workflow-pdfs')
        .download(storagePath);

      if (downloadError || !fileData) {
        console.error('Storage download error:', downloadError);
        return NextResponse.json(
          { error: 'Failed to download PDF from storage' },
          { status: 404 }
        );
      }

      pdfBuffer = await fileData.arrayBuffer();
      fileSize = pdfBuffer.byteLength;
      fileName = storagePath.split('/').pop();

    } else if (pdfUrl) {
      // Fetch from URL
      console.log('Source: URL');
      source = 'url';

      const urlResponse = await withTimeout(
        fetch(pdfUrl),
        30000,
        'PDF download from URL timed out'
      );

      if (!urlResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF from URL: ${urlResponse.statusText}` },
          { status: 400 }
        );
      }

      pdfBuffer = await urlResponse.arrayBuffer();
      fileSize = pdfBuffer.byteLength;
      fileName = pdfUrl.split('/').pop();

    } else {
      // Use provided base64 data (legacy support)
      console.log('Source: Base64 data');
      source = 'upload';

      try {
        pdfBuffer = Buffer.from(pdfData, 'base64').buffer;
        fileSize = pdfBuffer.byteLength;
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid PDF data format' },
          { status: 400 }
        );
      }
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `PDF file too large (${sizeMB}MB). Maximum size is 50MB.`,
          code: 'FILE_TOO_LARGE'
        },
        { status: 413 }
      );
    }

    console.log(`File size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`PDF Identifier: ${pdfIdentifier}`);

    // Decide: synchronous or background processing
    if (fileSize >= BACKGROUND_THRESHOLD) {
      console.log('[PDF Parse] File is large, creating background job');

      // Create background job
      const job = createJob(pdfIdentifier, {
        pdfUrl,
        uploadcareCdnUrl,
        fileName,
        fileSize,
      });

      return NextResponse.json({
        status: 'processing',
        jobId: job.id,
        message: 'PDF parsing started in background. Poll /api/pdf/status/' + job.id + ' for progress.',
        metadata: {
          source,
          fileSize,
          fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
          backgroundJob: true,
        }
      });
    }

    // Synchronous processing for smaller files
    console.log('[PDF Parse] Processing synchronously');

    const result = await withTimeout(
      parsePdf(pdfIdentifier, pdfBuffer, { useContextCache: false }),
      API_TIMEOUT_MS,
      'PDF parsing timed out. The file might be too large or complex.'
    );

    console.log('[Result] ✅ Success');
    console.log('  Parse method:', result.parseMethod);
    console.log('  Cached:', result.cached);
    console.log('  Parsed text length:', result.parsedText?.length || 0, 'chars');
    console.log('  Segments:', result.segments?.length || 0);
    console.log('  Pages:', result.pageCount || 0);
    console.log('  Duration:', result.parseDurationMs, 'ms');
    console.log('===================\n');

    return NextResponse.json({
      parsedText: result.parsedText || '',
      segments: result.segments || [],
      pageCount: result.pageCount || 1,
      status: 'success',
      metadata: {
        source,
        fileSize,
        fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
        parseMethod: result.parseMethod,
        cached: result.cached,
        parseDurationMs: result.parseDurationMs,
        backgroundJob: false,
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

// Simple string hash function for generating identifiers
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
