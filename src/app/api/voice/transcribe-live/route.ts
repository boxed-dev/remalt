import { NextResponse } from 'next/server';

/**
 * API endpoint to provide Deepgram API key for client-side WebSocket
 * Uses Node.js runtime for full environment variable access
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getHandler() {
  try {
    // Verify Deepgram API key exists
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

    if (!deepgramApiKey) {
      console.error('[Deepgram Key API] DEEPGRAM_API_KEY not found in environment');
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }

    console.log('[Deepgram Key API] Providing API key for browser WebSocket');

    // Return the API key for client-side use
    return NextResponse.json({
      apiKey: deepgramApiKey,
    });

  } catch (error) {
    console.error('[Deepgram Key API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get API key' },
      { status: 500 }
    );
  }
}

export const GET = getHandler;
