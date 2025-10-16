import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { createClient } from '@supabase/supabase-js';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;
// API timeout: 2 minutes for large PDFs
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

export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to parse PDFs');
  }

  try {
    const { pdfData, pdfUrl, storagePath } = await req.json();

    // Validate input
    if (!pdfData && !pdfUrl && !storagePath) {
      return NextResponse.json(
        { error: 'PDF data, URL, or storage path is required' },
        { status: 400 }
      );
    }

    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('\n=== PDF Parsing Request ===');
    console.log('User ID:', user.id);
    
    let pdfBuffer: ArrayBuffer;
    let fileSize: number;
    let source: 'storage' | 'url' | 'upload';

    // Get PDF data from different sources
    if (storagePath) {
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

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Prepare PDF for Gemini
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
    const pdfPart = {
      inlineData: {
        data: base64Pdf,
        mimeType: 'application/pdf',
      },
    };

    const prompt = `Extract all text from this PDF document with structure preservation. Organize the content as follows:

1. **Full Text**: Complete text extraction
2. **Segments**: Break content into logical sections with headings
3. **Page Count**: Total number of pages

Format your response as JSON:
{
  "parsedText": "complete text here",
  "segments": [
    {
      "heading": "Section Title",
      "content": "section content",
      "page": 1
    }
  ],
  "pageCount": 10
}

Important:
- Preserve paragraph structure
- Identify and label headings/sections
- Maintain logical reading order
- Include all text, tables, and captions`;

    console.log('Starting Gemini API call...');
    
    // Call Gemini with timeout
    const result = await withTimeout(
      model.generateContent([prompt, pdfPart]),
      API_TIMEOUT_MS,
      'PDF parsing timed out. The file might be too large or complex.'
    );

    const responseText = result.response.text();
    console.log('[Gemini] Parsing complete:', responseText.length, 'chars');

    // Parse JSON response
    let parseData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parseData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON, using fallback format');
      // Fallback: use raw response as parsed text
      parseData = {
        parsedText: responseText,
        segments: [
          {
            heading: 'Document Content',
            content: responseText,
            page: 1
          }
        ],
        pageCount: 1
      };
    }

    console.log('[Result] ✅ Success');
    console.log('  Parsed text length:', parseData.parsedText?.length || 0, 'chars');
    console.log('  Segments:', parseData.segments?.length || 0);
    console.log('  Pages:', parseData.pageCount || 0);
    console.log('===================\n');

    return NextResponse.json({
      parsedText: parseData.parsedText || '',
      segments: parseData.segments || [],
      pageCount: parseData.pageCount || 1,
      status: 'success',
      metadata: {
        source,
        fileSize,
        fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
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
