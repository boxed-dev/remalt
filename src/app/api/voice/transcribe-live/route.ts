import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * API endpoint to provide Deepgram API key for client-side WebSocket
 * This approach is safer than exposing the key directly in the browser
 * Returns a temporary API key or the main key (depending on your Deepgram plan)
 */
export async function GET() {
  try {
    // Verify Deepgram API key exists
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return Response.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }

    // Return the API key for client-side use
    // Note: In production, you might want to:
    // 1. Create temporary API keys via Deepgram's API
    // 2. Implement rate limiting
    // 3. Add authentication/authorization
    return Response.json({
      apiKey: deepgramApiKey,
    });

  } catch (error) {
    console.error('[API] Failed to get Deepgram key:', error);
    return Response.json(
      { error: 'Failed to get API key' },
      { status: 500 }
    );
  }
}
