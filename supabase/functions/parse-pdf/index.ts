import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  pdfData?: string; // base64
  pdfUrl?: string;
  storagePath?: string;
  storageUrl?: string;
  forceReparse?: boolean;
  useContextCache?: boolean;
}

interface ParseResult {
  parsedText: string;
  segments: Array<{
    content: string;
    heading?: string;
    page?: number;
  }>;
  pageCount: number;
  parseMethod: 'text' | 'gemini' | 'cache';
  cached: boolean;
  parseDurationMs?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Missing required environment variables');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { pdfData, pdfUrl, storagePath, storageUrl, forceReparse, useContextCache }: ParseRequest = await req.json();

    // Validate input
    if (!pdfData && !pdfUrl && !storagePath && !storageUrl) {
      return new Response(
        JSON.stringify({ error: 'PDF data, URL, or storage path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Generate PDF identifier for caching
    let pdfIdentifier: string;
    if (storagePath) {
      const match = storagePath.match(/\/([a-f0-9-]+)-/);
      pdfIdentifier = match ? match[1] : `path-${hashString(storagePath)}`;
    } else if (storageUrl) {
      const match = storageUrl.match(/\/([a-f0-9-]+)-/);
      pdfIdentifier = match ? match[1] : `url-${hashString(storageUrl)}`;
    } else if (pdfUrl) {
      pdfIdentifier = `url-${hashString(pdfUrl)}`;
    } else {
      pdfIdentifier = `upload-${Date.now()}`;
    }

    console.log('PDF Identifier:', pdfIdentifier);

    // Step 1: Check cache
    if (!forceReparse) {
      const cachedResult = await checkCache(supabase, pdfIdentifier);
      if (cachedResult) {
        console.log('Cache hit');
        return new Response(
          JSON.stringify({
            ...cachedResult,
            cached: true,
            parseDurationMs: Date.now() - startTime,
            status: 'success',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Cache miss, fetching PDF');

    // Step 2: Fetch PDF data
    let pdfBuffer: ArrayBuffer;
    let fileSize: number;

    if (storageUrl) {
      const response = await fetch(storageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF from storage: ${response.statusText}`);
      }
      pdfBuffer = await response.arrayBuffer();
      fileSize = pdfBuffer.byteLength;
    } else if (storagePath) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('media')
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error('Failed to download PDF from storage');
      }

      pdfBuffer = await fileData.arrayBuffer();
      fileSize = pdfBuffer.byteLength;
    } else if (pdfUrl) {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
      }
      pdfBuffer = await response.arrayBuffer();
      fileSize = pdfBuffer.byteLength;
    } else {
      // Base64 data
      const decoder = new TextDecoder();
      pdfBuffer = Uint8Array.from(atob(pdfData!), c => c.charCodeAt(0)).buffer;
      fileSize = pdfBuffer.byteLength;
    }

    // Validate file size (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      return new Response(
        JSON.stringify({
          error: `PDF file too large (${sizeMB}MB). Maximum size is 50MB.`,
          code: 'FILE_TOO_LARGE'
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`File size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB`);

    // Step 3: Try pdf-parse for text extraction
    let result: ParseResult;

    try {
      // Try using pdf-parse via npm:pdf-parse
      const pdfParse = (await import('npm:pdf-parse@1.1.1')).default;
      const data = await pdfParse(new Uint8Array(pdfBuffer));

      // If we got meaningful text (>100 chars), use it
      if (data.text && data.text.length > 100) {
        console.log('Text extraction successful');

        const segments = [];
        const pageTexts = data.text.split('\f');

        for (let i = 0; i < pageTexts.length; i++) {
          const pageText = pageTexts[i].trim();
          if (pageText) {
            segments.push({
              content: pageText,
              heading: `Page ${i + 1}`,
              page: i + 1,
            });
          }
        }

        result = {
          parsedText: data.text,
          segments: segments.length > 0 ? segments : [{
            content: data.text,
            heading: 'Document Content',
            page: 1,
          }],
          pageCount: data.numpages,
          parseMethod: 'text',
          cached: false,
        };

        // Cache result
        await cacheResult(supabase, pdfIdentifier, result, Date.now() - startTime);

        return new Response(
          JSON.stringify({
            ...result,
            parseDurationMs: Date.now() - startTime,
            status: 'success',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Text extraction yielded minimal content, trying Gemini');
    } catch (error) {
      console.warn('Text extraction failed:', error);
    }

    // Step 4: Use Gemini for scanned/image PDFs
    console.log('Parsing with Gemini API');
    result = await parseWithGemini(pdfBuffer, geminiApiKey, useContextCache || false);

    // Cache result
    await cacheResult(supabase, pdfIdentifier, result, Date.now() - startTime);

    return new Response(
      JSON.stringify({
        ...result,
        parseDurationMs: Date.now() - startTime,
        status: 'success',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PDF Parsing Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to parse PDF';

    return new Response(
      JSON.stringify({
        error: errorMessage,
        status: 'error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Check database cache
async function checkCache(supabase: any, pdfIdentifier: string): Promise<ParseResult | null> {
  try {
    const { data, error } = await supabase
      .from('pdf_cache')
      .select('*')
      .eq('pdf_identifier', pdfIdentifier)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Update access count
    await supabase
      .from('pdf_cache')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: data.access_count + 1,
      })
      .eq('id', data.id);

    return {
      parsedText: data.parsed_text || '',
      segments: data.segments || [],
      pageCount: data.page_count || 0,
      parseMethod: 'cache',
      cached: true,
    };
  } catch (error) {
    console.error('Cache check failed:', error);
    return null;
  }
}

// Helper: Cache result
async function cacheResult(
  supabase: any,
  pdfIdentifier: string,
  result: ParseResult,
  durationMs: number
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day TTL

    await supabase.from('pdf_cache').upsert({
      pdf_identifier: pdfIdentifier,
      parsed_text: result.parsedText,
      segments: result.segments,
      page_count: result.pageCount,
      parse_method: result.parseMethod,
      parse_duration_ms: durationMs,
      expires_at: expiresAt.toISOString(),
      last_accessed_at: new Date().toISOString(),
      access_count: 1,
    });

    console.log('Cached result for:', pdfIdentifier);
  } catch (error) {
    console.error('Failed to cache result:', error);
  }
}

// Helper: Parse with Gemini
async function parseWithGemini(
  pdfBuffer: ArrayBuffer,
  apiKey: string,
  useContextCache: boolean
): Promise<ParseResult> {
  // Upload to Gemini File API
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
  const pdfBytes = new Uint8Array(pdfBuffer);

  const bodyParts = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="document.pdf"',
    'Content-Type: application/pdf',
    '',
    '',
  ];

  const textEncoder = new TextEncoder();
  const header = textEncoder.encode(bodyParts.join('\r\n'));
  const footer = textEncoder.encode(`\r\n--${boundary}--\r\n`);

  const body = new Uint8Array(header.length + pdfBytes.length + footer.length);
  body.set(header, 0);
  body.set(pdfBytes, header.length);
  body.set(footer, header.length + pdfBytes.length);

  // Upload file
  const uploadResponse = await fetch(
    'https://generativelanguage.googleapis.com/upload/v1beta/files?key=' + apiKey,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Goog-Upload-Protocol': 'multipart',
      },
      body,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(`File upload failed: ${uploadResponse.statusText}`);
  }

  const uploadResult = await uploadResponse.json();
  const fileUri = uploadResult.file.uri;
  const fileName = uploadResult.file.name;

  console.log('File uploaded:', fileUri);

  // Wait for processing
  let state = 'PROCESSING';
  while (state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const statusResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
    );
    const statusResult = await statusResponse.json();
    state = statusResult.state;

    if (state === 'FAILED') {
      throw new Error('File processing failed');
    }
  }

  console.log('File processed, calling Gemini');

  // Call Gemini API
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

  const generateResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                fileData: {
                  mimeType: 'application/pdf',
                  fileUri: fileUri,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!generateResponse.ok) {
    throw new Error(`Gemini API failed: ${generateResponse.statusText}`);
  }

  const generateResult = await generateResponse.json();
  const responseText = generateResult.candidates[0].content.parts[0].text;

  console.log('Gemini response received');

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
    parseData = {
      parsedText: responseText,
      segments: [
        {
          heading: 'Document Content',
          content: responseText,
          page: 1,
        },
      ],
      pageCount: 1,
    };
  }

  return {
    parsedText: parseData.parsedText || '',
    segments: parseData.segments || [],
    pageCount: parseData.pageCount || 1,
    parseMethod: 'gemini',
    cached: false,
  };
}

// Helper: String hash function
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
