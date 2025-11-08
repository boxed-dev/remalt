import { createClient } from '@deepgram/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { generateNodeTitle } from '@/lib/ai/title-generator';

async function postHandler(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to transcribe audio');
  }

  try {
    // Check if this is FormData (file upload) or JSON (URL/base64)
    const contentType = req.headers.get('content-type') || '';
    let audioData: string | undefined;
    let audioUrl: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload via FormData
      const formData = await req.formData();
      const file = formData.get('audio') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No audio file provided' },
          { status: 400 }
        );
      }

      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      audioData = buffer.toString('base64');
    } else {
      // Handle JSON payload
      const body = await req.json();
      audioData = body.audioData;
      audioUrl = body.audioUrl;
    }

    if (!audioData && !audioUrl) {
      return NextResponse.json(
        { error: 'Audio data or URL is required' },
        { status: 400 }
      );
    }

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return NextResponse.json(
        { error: 'DEEPGRAM_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('\n=== Voice Transcription Request ===');
    console.log('User ID:', user.id);
    console.log('Source:', audioUrl ? 'URL' : 'Base64 data');

    const deepgram = createClient(deepgramApiKey);

    let transcriptionResult;

    if (audioUrl) {
      // Transcribe from URL
      // Using nova-3: Most accurate model (5.26% WER for batch, 47.4% better than competitors)
      const { result } = await deepgram.listen.prerecorded.transcribeUrl(
        { url: audioUrl },
        {
          model: 'nova-3',
          detect_language: true,  // Auto-detect language for multilingual support
          smart_format: true,     // Format numbers, currency, emails
          punctuate: true,        // Auto-punctuation
          paragraphs: true,       // Add paragraph breaks
          diarize: false,         // Speaker diarization (disabled for performance)
        }
      );
      transcriptionResult = result;
    } else {
      // Transcribe from base64 audio data
      const audioBuffer = Buffer.from(audioData, 'base64');

      const { result } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-3',
          detect_language: true,  // Auto-detect language for multilingual support
          smart_format: true,     // Format numbers, currency, emails
          punctuate: true,        // Auto-punctuation
          paragraphs: true,       // Add paragraph breaks
          diarize: false,         // Speaker diarization (disabled for performance)
        }
      );
      transcriptionResult = result;
    }

    // Extract transcript from Deepgram response
    const transcript = transcriptionResult?.results?.channels[0]?.alternatives[0]?.transcript || '';
    const confidence = transcriptionResult?.results?.channels[0]?.alternatives[0]?.confidence || 0;
    const duration = transcriptionResult?.metadata?.duration || 0;
    const language = transcriptionResult?.results?.channels[0]?.detected_language || 'en';

    console.log('[Deepgram] Transcription complete');
    console.log('  Transcript length:', transcript.length, 'chars');
    console.log('  Confidence:', (confidence * 100).toFixed(1) + '%');
    console.log('  Duration:', duration.toFixed(1) + 's');
    console.log('  Language:', language);
    console.log('===================\n');

    // Generate AI title in parallel
    const titlePromise = generateNodeTitle({
      nodeType: 'voice',
      content: transcript,
      metadata: {
        duration,
      },
    }).then(title => {
      if (title) {
        console.log('[Title Generator] ✅ Generated title:', title);
      }
      return title;
    }).catch(error => {
      console.error('[Title Generator] Error:', error);
      return null;
    });

    // Prepare response data
    const responseData = {
      transcript,
      language,
      confidence,
      duration,
      status: 'success',
    };

    // Wait for title generation to complete
    const generatedTitle = await titlePromise;
    if (generatedTitle) {
      return NextResponse.json({
        ...responseData,
        suggestedTitle: generatedTitle,
      });
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Voice Transcription Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
      },
      { status: 500 }
    );
  }
}

export const POST = postHandler;
