import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

/**
 * POST /api/image/generate
 *
 * Generate images from text prompts using Gemini 2.5 Flash Image (Nano Banana)
 *
 * @body {
 *   prompt: string - The text description of the image to generate
 *   aspectRatio?: string - The aspect ratio (default: "16:9")
 * }
 *
 * @returns {
 *   success: boolean
 *   imageBase64?: string - The generated image in base64 format
 *   error?: string
 * }
 */
async function postHandler(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to generate images');
  }

  try {
    const body = await req.json();
    const { prompt, aspectRatio = '16:9' } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Image Generation] GEMINI_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Image generation service not configured' },
        { status: 500 }
      );
    }

    console.log(`[Image Generation] Generating image with prompt: "${prompt.slice(0, 50)}..." (aspect: ${aspectRatio})`);

    // Call Gemini 2.5 Flash Image API (Nano Banana)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['Image'],
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Image Generation] API error:', errorText);

      // Try to parse error details
      let errorMessage = 'Failed to generate image';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // If parsing fails, use generic message
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract the base64 image from the response
    // Response structure: { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const inlineData = part?.inlineData;

    if (!inlineData || !inlineData.data) {
      console.error('[Image Generation] No image data in response:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { success: false, error: 'No image data received from API' },
        { status: 500 }
      );
    }

    const imageBase64 = inlineData.data;
    const mimeType = inlineData.mimeType || 'image/png';

    console.log(`[Image Generation] ✅ Successfully generated image (${mimeType})`);

    return NextResponse.json({
      success: true,
      imageBase64,
      mimeType,
    });
  } catch (error) {
    console.error('[Image Generation] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export { postHandler as POST };
