/**
 * Robust YouTube Transcription System
 * Multi-layered fallback approach with retry logic
 */

import ytdl from '@distube/ytdl-core';
import { Readable } from 'stream';
import { createClient } from '@deepgram/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { log } from 'next-axiom';

// Configuration
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
];

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export interface TranscriptionResult {
  transcript: string;
  method: string;
  language: string;
  videoId: string;
  cached: boolean;
  elapsed_ms: number;
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
          RETRY_CONFIG.maxDelay
        );
        console.log(`[${context}] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`${context} failed after ${maxRetries} retries`);
}

/**
 * Method 1: Python API (Official Captions)
 */
export async function getPythonTranscript(url: string): Promise<TranscriptionResult | null> {
  try {
    let pythonApiUrl: string;

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.PYTHON_API_URL) {
        throw new Error(
          'PYTHON_API_URL environment variable is not set in production.',
        );
      }
      pythonApiUrl = process.env.PYTHON_API_URL;
    } else {
      pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5001';
    }

    console.log(`[Python API] Calling ${pythonApiUrl}/api/transcribe`);

    const result = await retryWithBackoff(async () => {
      const response = await fetch(`${pythonApiUrl}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': getRandomUserAgent(),
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      // 404 means no captions available - don't retry, move to next method
      if (response.status === 404) {
        console.log('[Python API] ⏭️ No captions available (404), skipping to next method');
        throw new Error('NO_CAPTIONS_AVAILABLE');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    }, 'Python API');

    console.log(`[Python API] ✅ Success - ${result.transcript.length} chars`);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Don't log as error if it's just no captions
    if (errorMsg.includes('NO_CAPTIONS_AVAILABLE')) {
      console.log('[Python API] No captions available, proceeding to audio extraction');
    } else {
      console.error('[Python API] ❌ All attempts failed:', errorMsg);
    }

    return null;
  }
}

/**
 * Method 2: ytdl-core audio download with retry and agent rotation
 */
async function downloadYouTubeAudioRobust(videoId: string): Promise<Buffer | null> {
  return retryWithBackoff(async () => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const userAgent = getRandomUserAgent();

    console.log(`[YTDL] Downloading audio for ${videoId} with agent rotation...`);

    // Create agent with custom options
    const agent = ytdl.createAgent(undefined, {
      localAddress: undefined,
    });

    const info = await ytdl.getInfo(videoUrl, {
      agent,
      requestOptions: {
        headers: {
          'User-Agent': userAgent,
        },
      },
    });

    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    if (audioFormats.length === 0) {
      throw new Error('No audio formats available');
    }

    const bestAudio = audioFormats.sort((a, b) => {
      const aBitrate = a.audioBitrate || 0;
      const bBitrate = b.audioBitrate || 0;
      return bBitrate - aBitrate;
    })[0];

    console.log(`[YTDL] Downloading: ${bestAudio.mimeType} (${bestAudio.audioBitrate}kbps)`);

    const audioStream = ytdl(videoUrl, {
      quality: bestAudio.itag,
      agent,
      requestOptions: {
        headers: {
          'User-Agent': userAgent,
        },
      },
    });

    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      const timeout = setTimeout(() => {
        audioStream.destroy();
        reject(new Error('Download timeout after 60s'));
      }, 60000);

      audioStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

      audioStream.on('end', () => {
        clearTimeout(timeout);
        const buffer = Buffer.concat(chunks);
        console.log(`[YTDL] ✓ Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        resolve(buffer);
      });

      audioStream.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }, 'YTDL Audio Download');
}

/**
 * Method 3: Deepgram transcription from audio
 */
export async function getDeepgramTranscript(videoId: string): Promise<TranscriptionResult | null> {
  if (!DEEPGRAM_API_KEY) {
    console.log('[Deepgram] ⏭️ Skipping - API key not configured');
    return null;
  }

  try {
    const startTime = Date.now();
    console.log(`[Deepgram] 🎙️ Starting transcription for ${videoId}`);

    // Download audio with retry
    const audioBuffer = await downloadYouTubeAudioRobust(videoId);

    if (!audioBuffer) {
      throw new Error('Failed to download audio after all retries');
    }

    // Transcribe with Deepgram with retry
    const result = await retryWithBackoff(async () => {
      const deepgram = createClient(DEEPGRAM_API_KEY);
      const audioStream = Readable.from(audioBuffer);

      console.log(`[Deepgram] Transcribing audio stream...`);

      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioStream,
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
          paragraphs: true,
          utterances: false,
          language: 'multi',
          detect_language: true,
        }
      );

      if (error) {
        throw new Error(`Deepgram error: ${JSON.stringify(error)}`);
      }

      if (!result?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        throw new Error('No transcript in Deepgram response');
      }

      return result;
    }, 'Deepgram Transcription');

    const transcript = result.results.channels[0].alternatives[0].transcript;
    const detectedLanguage = result.results.channels[0].detected_language || 'unknown';
    const elapsed = Date.now() - startTime;

    console.log(`[Deepgram] ✅ Success - ${transcript.length} chars (${detectedLanguage}) in ${elapsed}ms`);

    return {
      transcript,
      method: 'deepgram',
      language: detectedLanguage,
      videoId,
      cached: false,
      elapsed_ms: elapsed,
    };
  } catch (error) {
    console.error('[Deepgram] ❌ Failed after all retries:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Method 2: Gemini Video Analysis (FAST - Right After Captions Fail)
 * Extracts comprehensive summary, key points, and content analysis
 * Much faster and more practical than audio download + transcription
 */
export async function getGeminiAnalysis(url: string, videoId: string): Promise<TranscriptionResult | null> {
  if (!GEMINI_API_KEY) {
    console.log('[Gemini] ⏭️ Skipping - API key not configured');
    return null;
  }

  try {
    const startTime = Date.now();
    console.log(`[Gemini] 🤖 Analyzing YouTube video: ${videoId}`);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await retryWithBackoff(async () => {
      const prompt = `Analyze this YouTube video and provide a comprehensive content breakdown:

📊 VIDEO SUMMARY
Write a detailed 2-3 paragraph summary of the main content and key messages.

🎯 KEY POINTS
List the 5-10 main points or takeaways (bullet format).

📚 TOPICS COVERED
Main topics and themes discussed in the video.

🎬 CONTENT TYPE
What type of content is this? (Tutorial, Review, Explanation, Vlog, etc.)

👥 TARGET AUDIENCE
Who is this video intended for?

💬 IMPORTANT QUOTES
3-5 significant quotes or statements from the video.

🎨 VISUAL CONTENT
Describe important visual elements, demos, charts, or examples shown.

📖 DETAILED CONTENT BREAKDOWN
Provide a comprehensive paragraph-by-paragraph breakdown of everything discussed in the video. This should serve as a detailed content summary covering all major sections and ideas presented.

Format the response with clear headings and structure. Be thorough and capture all important information.`;

      console.log('[Gemini] Using direct YouTube URL analysis via fileData API...');

      const response = await model.generateContent([
        prompt,
        {
          fileData: {
            mimeType: 'video/*',
            fileUri: url,
          },
        },
      ]);

      const analysis = response.response.text();

      if (!analysis || analysis.length < 100) {
        throw new Error('Gemini returned insufficient analysis');
      }

      return analysis;
    }, 'Gemini Video Analysis');

    const elapsed = Date.now() - startTime;

    console.log(`[Gemini] ✅ Success - Comprehensive analysis (${result.length} chars) in ${elapsed}ms`);

    return {
      transcript: result, // Stores the analysis as "transcript" for compatibility
      method: 'gemini-analysis',
      language: 'auto-detected',
      videoId,
      cached: false,
      elapsed_ms: elapsed,
    };
  } catch (error) {
    console.error('[Gemini] ❌ Failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Method 5: Alternative yt-dlp API fallback (if available)
 */
export async function getYtDlpTranscript(videoId: string): Promise<TranscriptionResult | null> {
  const ytDlpApiUrl = process.env.YT_DLP_API_URL;

  if (!ytDlpApiUrl) {
    console.log('[yt-dlp API] ⏭️ Skipping - API URL not configured');
    return null;
  }

  try {
    console.log(`[yt-dlp API] Attempting extraction for ${videoId}`);

    const result = await retryWithBackoff(async () => {
      const response = await fetch(`${ytDlpApiUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          extract_audio: true,
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        throw new Error(`yt-dlp API HTTP ${response.status}`);
      }

      return response.json();
    }, 'yt-dlp API');

    if (result.audio_url && DEEPGRAM_API_KEY) {
      // Download audio from yt-dlp and send to Deepgram
      const audioResponse = await fetch(result.audio_url);
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

      const deepgram = createClient(DEEPGRAM_API_KEY);
      const audioStream = Readable.from(audioBuffer);

      const { result: dgResult, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioStream,
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
          paragraphs: true,
          language: 'multi',
          detect_language: true,
        }
      );

      if (error || !dgResult?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        throw new Error('yt-dlp + Deepgram failed');
      }

      const transcript = dgResult.results.channels[0].alternatives[0].transcript;
      console.log(`[yt-dlp API] ✅ Success - ${transcript.length} chars`);

      return {
        transcript,
        method: 'yt-dlp-deepgram',
        language: dgResult.results.channels[0].detected_language || 'unknown',
        videoId,
        cached: false,
        elapsed_ms: 0,
      };
    }

    return null;
  } catch (error) {
    console.error('[yt-dlp API] ❌ Failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Master orchestration: Try all methods in optimal sequence
 * Priority: Fast & Free → Gemini Analysis → Expensive Audio Processing
 */
export async function getRobustTranscript(
  url: string,
  videoId: string
): Promise<TranscriptionResult> {
  console.log(`\n=== ROBUST TRANSCRIPTION PIPELINE for ${videoId} ===`);

  // TIER 1: Python API (FREE, FAST - Official Captions)
  console.log('\n[Pipeline] Tier 1: Python API (Official Captions - Any Language)');
  const pythonResult = await getPythonTranscript(url);
  if (pythonResult) {
    console.log('[Pipeline] ✅ SUCCESS via Python API (FREE, ~500ms)\n');
    return pythonResult;
  }

  // TIER 2: Gemini Video Analysis (FREE, FAST - No Audio Download!)
  console.log('\n[Pipeline] Tier 2: Gemini Video Analysis (Summary & Key Points)');
  console.log('[Pipeline] 💡 Using AI to analyze video directly - faster than audio processing!');
  const geminiResult = await getGeminiAnalysis(url, videoId);
  if (geminiResult) {
    console.log('[Pipeline] ✅ SUCCESS via Gemini Analysis (FREE, ~10-15s)\n');
    return geminiResult;
  }

  // TIER 3: Deepgram Audio Transcription (PAID, SLOW - Full Transcript)
  console.log('\n[Pipeline] Tier 3: Deepgram Audio Transcription (Expensive Fallback)');
  console.log('[Pipeline] ⚠️ Downloading audio and transcribing (may take 20-30s)...');
  const deepgramResult = await getDeepgramTranscript(videoId);
  if (deepgramResult) {
    console.log('[Pipeline] ✅ SUCCESS via Deepgram ($0.0043/min, ~20s)\n');
    return deepgramResult;
  }

  // TIER 4: yt-dlp + Deepgram (PAID, VERY SLOW - Alternative Extraction)
  console.log('\n[Pipeline] Tier 4: yt-dlp + Deepgram (Final Extraction Method)');
  const ytDlpResult = await getYtDlpTranscript(videoId);
  if (ytDlpResult) {
    console.log('[Pipeline] ✅ SUCCESS via yt-dlp + Deepgram\n');
    return ytDlpResult;
  }

  // All methods failed
  console.log('[Pipeline] ❌ ALL METHODS FAILED\n');
  throw new Error('All transcription methods exhausted. Video may be inaccessible or have restricted content.');
}
