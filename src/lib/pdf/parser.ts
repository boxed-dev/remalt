/**
 * Hybrid PDF Parser Service
 *
 * Intelligent PDF parsing with:
 * 1. Database cache lookup
 * 2. Fast text extraction for text-based PDFs
 * 3. Gemini AI for scanned/image PDFs
 * 4. File API + Context caching for large files
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { uploadFileToGemini, waitForFileProcessing } from '../gemini/file-api';
import { createPdfContextCache } from '../gemini/context-cache';
import * as pdfParse from 'pdf-parse';

export interface ParseResult {
  parsedText: string;
  segments: Array<{
    content: string;
    heading?: string;
    page?: number;
  }>;
  pageCount: number;
  parseMethod: 'text' | 'gemini' | 'cache';
  cached: boolean;
  geminiFileUri?: string;
  geminiCacheName?: string;
  parseDurationMs?: number;
}

export interface ParseOptions {
  forceReparse?: boolean; // Skip cache
  useContextCache?: boolean; // Use Gemini context caching
}

// Initialize Supabase client with service role
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Parse PDF with hybrid approach: cache → text extraction → Gemini
 */
export async function parsePdf(
  pdfIdentifier: string,
  pdfBuffer: ArrayBuffer,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const startTime = Date.now();

  console.log('\n[PDF Parser] Starting parse:', {
    identifier: pdfIdentifier,
    size: (pdfBuffer.byteLength / (1024 * 1024)).toFixed(2) + 'MB',
  });

  // Step 1: Check cache
  if (!options.forceReparse) {
    const cachedResult = await checkCache(pdfIdentifier);
    if (cachedResult) {
      console.log('[PDF Parser] Cache hit');
      return {
        ...cachedResult,
        cached: true,
        parseDurationMs: Date.now() - startTime,
      };
    }
  }

  console.log('[PDF Parser] Cache miss, proceeding with parsing');

  // Step 2: Try fast text extraction
  try {
    const textResult = await extractTextFast(pdfBuffer);

    // If we got meaningful text (>100 chars), use it
    if (textResult.parsedText.length > 100) {
      console.log('[PDF Parser] Text extraction successful');

      // Cache result
      await cacheResult(pdfIdentifier, textResult, Date.now() - startTime);

      return {
        ...textResult,
        cached: false,
        parseDurationMs: Date.now() - startTime,
      };
    }

    console.log('[PDF Parser] Text extraction yielded minimal content, trying Gemini');
  } catch (error) {
    console.warn('[PDF Parser] Text extraction failed:', error);
  }

  // Step 3: Use Gemini for scanned/image PDFs
  const geminiResult = await parseWithGemini(
    pdfBuffer,
    options.useContextCache || false
  );

  // Cache result
  await cacheResult(pdfIdentifier, geminiResult, Date.now() - startTime);

  return {
    ...geminiResult,
    cached: false,
    parseDurationMs: Date.now() - startTime,
  };
}

/**
 * Check database cache for existing parse result
 */
async function checkCache(
  pdfIdentifier: string
): Promise<ParseResult | null> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('pdf_cache')
      .select('*')
      .eq('pdf_identifier', pdfIdentifier)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Update access count and last accessed time
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
      geminiFileUri: data.gemini_file_uri,
      geminiCacheName: data.gemini_cache_name,
    };
  } catch (error) {
    console.error('[PDF Parser] Cache check failed:', error);
    return null;
  }
}

/**
 * Cache parse result in database
 */
async function cacheResult(
  pdfIdentifier: string,
  result: Omit<ParseResult, 'cached' | 'parseDurationMs'>,
  durationMs: number
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day TTL

    await supabase.from('pdf_cache').upsert({
      pdf_identifier: pdfIdentifier,
      parsed_text: result.parsedText,
      segments: result.segments,
      page_count: result.pageCount,
      parse_method: result.parseMethod,
      gemini_file_uri: result.geminiFileUri,
      gemini_cache_name: result.geminiCacheName,
      parse_duration_ms: durationMs,
      expires_at: expiresAt.toISOString(),
      last_accessed_at: new Date().toISOString(),
      access_count: 1,
    });

    console.log('[PDF Parser] Cached result for:', pdfIdentifier);
  } catch (error) {
    console.error('[PDF Parser] Failed to cache result:', error);
    // Don't throw - caching failure shouldn't fail the parse
  }
}

/**
 * Fast text extraction using pdf-parse library
 */
async function extractTextFast(
  pdfBuffer: ArrayBuffer
): Promise<Omit<ParseResult, 'cached' | 'parseDurationMs'>> {
  const buffer = Buffer.from(pdfBuffer);

  // pdf-parse can be called directly as a function when namespace imported
  const data = await (pdfParse as any)(buffer);

  // Split text into segments by page or section
  const segments = [];
  const pageTexts = data.text.split('\f'); // Form feed character separates pages

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

  return {
    parsedText: data.text,
    segments: segments.length > 0 ? segments : [{
      content: data.text,
      heading: 'Document Content',
      page: 1,
    }],
    pageCount: data.numpages,
    parseMethod: 'text',
  };
}

/**
 * Parse PDF using Gemini with File API + optional context caching
 */
async function parseWithGemini(
  pdfBuffer: ArrayBuffer,
  useContextCache: boolean = false
): Promise<Omit<ParseResult, 'cached' | 'parseDurationMs'>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  console.log('[PDF Parser] Uploading to Gemini File API...');

  // Upload to File API
  const fileResult = await uploadFileToGemini(pdfBuffer, {
    displayName: 'document.pdf',
    mimeType: 'application/pdf',
  });

  // Wait for processing
  await waitForFileProcessing(fileResult.fileUri);

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

  let model;
  let cacheName: string | undefined;

  if (useContextCache) {
    console.log('[PDF Parser] Creating context cache...');
    const cacheResult = await createPdfContextCache(
      fileResult.fileUri,
      prompt,
      { ttlSeconds: 3600 }
    );
    model = cacheResult.model;
    cacheName = cacheResult.cacheName;
  } else {
    // Use File API without context caching
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  }

  console.log('[PDF Parser] Calling Gemini for parsing...');

  const result = await model.generateContent([
    prompt,
    {
      fileData: {
        mimeType: 'application/pdf',
        fileUri: fileResult.fileUri,
      },
    },
  ]);

  const responseText = result.response.text();
  console.log('[PDF Parser] Gemini response received');

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
    console.warn('[PDF Parser] Failed to parse JSON, using fallback format');
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
    geminiFileUri: fileResult.fileUri,
    geminiCacheName: cacheName,
  };
}

/**
 * Parse PDF from URL
 */
export async function parsePdfFromUrl(
  url: string,
  pdfIdentifier: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  console.log('[PDF Parser] Fetching PDF from URL:', url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }

  const pdfBuffer = await response.arrayBuffer();
  return parsePdf(pdfIdentifier, pdfBuffer, options);
}
