import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@deepgram/sdk';
import { Readable } from 'stream';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const APIFY_ACTOR_ENDPOINT = 'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items';

interface ApifyInstagramItem {
  shortCode?: string;
  caption?: string;
  videoUrl?: string;
  ownerUsername?: string;
  type?: string;
  isVideo?: boolean;
}

interface DualTranscriptionResponse {
  success: boolean;
  instagram: {
    url: string;
    postCode: string;
    author: string;
    caption?: string;
    videoUrl: string;
    duration?: number;
  };
  gemini: {
    transcript: string;
    summary: string;
    fullAnalysis: string;
    processingTime: number;
    model: string;
  };
  deepgram: {
    transcript: string;
    words: Array<{
      word: string;
      start: number;
      end: number;
      confidence: number;
    }>;
    confidence: number;
    processingTime: number;
    model: string;
  };
  comparison: {
    geminiWordCount: number;
    deepgramWordCount: number;
    geminiLength: number;
    deepgramLength: number;
    similarityNote: string;
  };
  metadata: {
    totalProcessingTime: number;
    videoSizeMB: number;
    timestamp: string;
  };
  error?: string;
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch (error) {
    throw new Error('Invalid Instagram URL');
  }
}

async function fetchInstagramVideo(url: string): Promise<{
  videoUrl: string;
  postCode: string;
  author: string;
  caption?: string;
  duration?: number;
}> {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_API_TOKEN not configured');
  }

  const apifyUrl = new URL(APIFY_ACTOR_ENDPOINT);
  apifyUrl.searchParams.set('token', APIFY_TOKEN);

  console.log('[Dual Transcribe] Fetching Instagram data from Apify...');
  const apifyResponse = await fetch(apifyUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      directUrls: [url],
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
      resultsType: 'posts',
      resultsLimit: 1,
    }),
    cache: 'no-store',
  });

  if (!apifyResponse.ok) {
    throw new Error(`Apify API failed: ${apifyResponse.statusText}`);
  }

  const data = await apifyResponse.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No data returned from Instagram');
  }

  const item = data[0] as ApifyInstagramItem;
  const videoUrl = item.videoUrl;

  if (!videoUrl) {
    throw new Error('No video found - this post may be an image or carousel');
  }

  return {
    videoUrl,
    postCode: item.shortCode || 'unknown',
    author: item.ownerUsername || 'unknown',
    caption: item.caption,
  };
}

async function downloadVideo(videoUrl: string): Promise<{ buffer: ArrayBuffer; sizeMB: number }> {
  console.log('[Dual Transcribe] Downloading video...');
  const downloadStart = Date.now();

  const response = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.instagram.com/',
      'Accept': 'video/mp4,video/*;q=0.8,*/*;q=0.5',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const sizeMB = buffer.byteLength / (1024 * 1024);
  const downloadTime = Date.now() - downloadStart;

  console.log(`[Dual Transcribe] ✓ Video downloaded: ${sizeMB.toFixed(2)}MB in ${downloadTime}ms`);

  return { buffer, sizeMB };
}

async function transcribeWithGemini(videoBuffer: ArrayBuffer, caption?: string): Promise<{
  transcript: string;
  summary: string;
  fullAnalysis: string;
  processingTime: number;
}> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  console.log('[Dual Transcribe] Starting Gemini analysis...');
  const startTime = Date.now();

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
  });

  const base64Video = Buffer.from(videoBuffer).toString('base64');

  const prompt = `You are transcribing an Instagram reel/video${caption ? ` with caption: "${caption}"` : ''}.

Please provide:

1. **Complete Transcript**: Word-for-word transcription of ALL spoken content in the video. Include every word of dialogue, narration, speech, voiceovers, and any text-to-speech. Capture EVERYTHING that is spoken. Format as continuous text.

2. **Summary**: A concise 2-3 sentence summary of the video's main message or purpose.

3. **Full Analysis**: Additional context about the video including:
   - Visual elements and scenes
   - Background music or sound effects
   - Tone and delivery style
   - Key points or takeaways

Format your response with clear section headers (## Transcript, ## Summary, ## Full Analysis).`;

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Video,
        mimeType: 'video/mp4',
      },
    },
    prompt,
  ]);

  const response = result.response;
  const analysis = response.text();
  const processingTime = Date.now() - startTime;

  console.log(`[Dual Transcribe] ✓ Gemini completed in ${processingTime}ms`);

  // Extract sections
  let transcript = '';
  const transcriptMatch = analysis.match(/##\s*(?:Complete\s+)?Transcript:?\s*([\s\S]*?)(?=##|$)/i);
  if (transcriptMatch) {
    transcript = transcriptMatch[1].trim();
  }

  let summary = '';
  const summaryMatch = analysis.match(/##\s*Summary:?\s*([\s\S]*?)(?=##|$)/i);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
  }

  // If extraction failed, use the whole analysis
  if (!transcript) {
    transcript = analysis;
  }

  return {
    transcript,
    summary: summary || analysis.substring(0, 500),
    fullAnalysis: analysis,
    processingTime,
  };
}

async function transcribeWithDeepgram(videoBuffer: ArrayBuffer): Promise<{
  transcript: string;
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
  confidence: number;
  processingTime: number;
}> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY not configured');
  }

  console.log('[Dual Transcribe] Starting Deepgram transcription...');
  const startTime = Date.now();

  const deepgram = createClient(DEEPGRAM_API_KEY);

  // Convert ArrayBuffer to Buffer and then to ReadableStream
  const buffer = Buffer.from(videoBuffer);

  // Create a ReadableStream from the buffer
  const stream = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });

  console.log(`[Dual Transcribe] Buffer size: ${buffer.byteLength} bytes (${(buffer.byteLength / (1024 * 1024)).toFixed(2)}MB)`);

  // Deepgram can handle video files directly (extracts audio automatically)
  let result, error;
  try {
    const response = await deepgram.listen.prerecorded.transcribeFile(
      stream,
      {
        model: 'nova-3',
        detect_language: true,  // Auto-detect language
        smart_format: true,
        punctuate: true,
        paragraphs: false,
        utterances: false,
        diarize: false,
      }
    );
    result = response.result;
    error = response.error;
  } catch (err) {
    console.error('[Dual Transcribe] Deepgram SDK error:', err);
    throw new Error(`Deepgram SDK threw an exception: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (error) {
    console.error('[Dual Transcribe] Deepgram returned error:', error);
    throw new Error(`Deepgram transcription failed: ${typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error)}`);
  }

  const processingTime = Date.now() - startTime;
  console.log(`[Dual Transcribe] ✓ Deepgram completed in ${processingTime}ms`);

  if (!result || !result.results || !result.results.channels) {
    console.error('[Dual Transcribe] Invalid Deepgram result structure:', result);
    throw new Error('Deepgram returned invalid result structure');
  }

  const channel = result.results.channels[0];
  if (!channel) {
    console.error('[Dual Transcribe] No channels in Deepgram result');
    throw new Error('No audio channels found in Deepgram result');
  }

  const alternative = channel.alternatives?.[0];
  if (!alternative) {
    console.error('[Dual Transcribe] No alternatives in Deepgram result');
    throw new Error('No transcription results from Deepgram');
  }

  const transcript = alternative.transcript || '';
  const words = (alternative.words || []).map(w => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
  }));

  const confidence = alternative.confidence || 0;

  return {
    transcript,
    words,
    confidence,
    processingTime,
  };
}

function compareTranscripts(geminiTranscript: string, deepgramTranscript: string): {
  geminiWordCount: number;
  deepgramWordCount: number;
  geminiLength: number;
  deepgramLength: number;
  similarityNote: string;
} {
  const geminiWords = geminiTranscript.trim().split(/\s+/).filter(Boolean);
  const deepgramWords = deepgramTranscript.trim().split(/\s+/).filter(Boolean);

  const geminiWordCount = geminiWords.length;
  const deepgramWordCount = deepgramWords.length;
  const geminiLength = geminiTranscript.length;
  const deepgramLength = deepgramTranscript.length;

  let similarityNote = '';
  const wordCountDiff = Math.abs(geminiWordCount - deepgramWordCount);
  const wordCountDiffPercent = geminiWordCount > 0
    ? (wordCountDiff / geminiWordCount) * 100
    : 0;

  if (wordCountDiffPercent < 5) {
    similarityNote = 'Very similar word counts - both transcripts are closely aligned';
  } else if (wordCountDiffPercent < 15) {
    similarityNote = 'Moderately similar - minor differences in transcript length';
  } else {
    similarityNote = 'Significant difference - one transcript may be more detailed or include non-verbal descriptions';
  }

  if (geminiWordCount > deepgramWordCount * 1.5) {
    similarityNote += '. Gemini likely includes visual descriptions and scene details in addition to spoken words.';
  } else if (deepgramWordCount > geminiWordCount * 1.5) {
    similarityNote += '. Deepgram may have captured more audio nuances or filler words.';
  }

  return {
    geminiWordCount,
    deepgramWordCount,
    geminiLength,
    deepgramLength,
    similarityNote,
  };
}

async function postHandler(request: Request) {
  const overallStartTime = Date.now();

  try {
    const body = await request.json();
    const rawUrl = body?.url;

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: 'Instagram URL is required' },
        { status: 400 }
      );
    }

    const url = normalizeUrl(rawUrl);

    // Step 1: Fetch Instagram video data
    const instagramData = await fetchInstagramVideo(url);

    // Step 2: Download video
    const { buffer, sizeMB } = await downloadVideo(instagramData.videoUrl);

    // Step 3: Transcribe with both services in parallel
    console.log('[Dual Transcribe] Starting parallel transcription with Gemini and Deepgram...');

    const [geminiResult, deepgramResult] = await Promise.all([
      transcribeWithGemini(buffer, instagramData.caption),
      transcribeWithDeepgram(buffer),
    ]);

    console.log('[Dual Transcribe] ✓ Both transcriptions completed');

    // Step 4: Compare transcripts
    const comparison = compareTranscripts(geminiResult.transcript, deepgramResult.transcript);

    // Step 5: Calculate total time
    const totalProcessingTime = Date.now() - overallStartTime;

    // Step 6: Build response
    const response: DualTranscriptionResponse = {
      success: true,
      instagram: {
        url,
        postCode: instagramData.postCode,
        author: instagramData.author,
        caption: instagramData.caption,
        videoUrl: instagramData.videoUrl,
        duration: instagramData.duration,
      },
      gemini: {
        transcript: geminiResult.transcript,
        summary: geminiResult.summary,
        fullAnalysis: geminiResult.fullAnalysis,
        processingTime: geminiResult.processingTime,
        model: 'gemini-2.0-flash-exp',
      },
      deepgram: {
        transcript: deepgramResult.transcript,
        words: deepgramResult.words,
        confidence: deepgramResult.confidence,
        processingTime: deepgramResult.processingTime,
        model: 'nova-3',
      },
      comparison,
      metadata: {
        totalProcessingTime,
        videoSizeMB: sizeMB,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`[Dual Transcribe] ✅ Complete success in ${totalProcessingTime}ms`);
    console.log(`[Dual Transcribe]   - Gemini: ${comparison.geminiWordCount} words`);
    console.log(`[Dual Transcribe]   - Deepgram: ${comparison.deepgramWordCount} words`);

    return NextResponse.json(response);
  } catch (error) {
    const totalProcessingTime = Date.now() - overallStartTime;
    console.error(`[Dual Transcribe] ❌ Failed after ${totalProcessingTime}ms:`, error);

    const message = error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: message,
        details: 'Please ensure the Instagram URL is a video post (reel) and is publicly accessible.',
        metadata: {
          totalProcessingTime,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

export const POST = postHandler;
export const maxDuration = 60; // Allow up to 60 seconds for processing
