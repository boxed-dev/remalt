import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to provide Deepgram API key for client-side WebSocket
 * Uses Node.js runtime for full environment variable access
 */
export async function GET() {
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
