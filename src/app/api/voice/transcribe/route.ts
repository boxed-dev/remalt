import { createClient } from '@deepgram/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to transcribe audio');
  }

  try {
    const { audioData, audioUrl } = await req.json();

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
      const { result } = await deepgram.listen.prerecorded.transcribeUrl(
        { url: audioUrl },
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
          paragraphs: true,
          language: 'en',
        }
      );
      transcriptionResult = result;
    } else {
      // Transcribe from base64 audio data
      const audioBuffer = Buffer.from(audioData, 'base64');

      const { result } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          smart_format: true,
          punctuate: true,
          paragraphs: true,
          language: 'en',
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

    return NextResponse.json({
      transcript,
      language,
      confidence,
      duration,
      status: 'success',
    });

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
