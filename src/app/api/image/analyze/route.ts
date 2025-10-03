import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to analyze images');
  }

  try {
    const { imageUrl, imageData } = await req.json();

    if (!imageUrl && !imageData) {
      return NextResponse.json(
        { error: 'Image URL or data is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    console.log('\n=== Image Analysis Request ===');
    console.log('User ID:', user.id);
    console.log('Source:', imageUrl ? 'URL' : 'Base64 data');

    // Prepare image URL for OpenAI
    let imageContent: string;
    if (imageUrl) {
      imageContent = imageUrl;
    } else {
      // Detect mime type from base64 data
      const mimeType = imageData.startsWith('/9j/') ? 'image/jpeg' :
                      imageData.startsWith('iVBOR') ? 'image/png' :
                      imageData.startsWith('R0lGOD') ? 'image/gif' :
                      imageData.startsWith('UklGR') ? 'image/webp' :
                      'image/jpeg';

      imageContent = `data:${mimeType};base64,${imageData}`;
    }

    // Analyze image with GPT-4o-mini Vision
    const prompt = `Analyze this image thoroughly and provide:

1. **OCR Text**: Extract ALL visible text from the image (signs, labels, captions, watermarks, etc.)
2. **Description**: A detailed description of what you see in the image
3. **Objects/Tags**: List key objects, people, places, or concepts visible
4. **Colors/Theme**: Primary colors and overall visual theme

Format your response as JSON:
{
  "ocrText": "all extracted text here",
  "description": "detailed description",
  "tags": ["tag1", "tag2", "tag3"],
  "colors": ["#hex1", "#hex2"],
  "theme": "visual theme description"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageContent,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const responseText = response.choices[0]?.message?.content || '';

    console.log('[OpenAI] Analysis complete:', responseText.length, 'chars');

    // Try to parse JSON response
    let analysisData;
    try {
      // Extract JSON from response (GPT might wrap it in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback: structure the response manually
      analysisData = {
        ocrText: '',
        description: responseText,
        tags: [],
        colors: [],
        theme: 'Unable to parse structured data'
      };
    }

    console.log('[Result] ✅ Success');
    console.log('  OCR Text:', analysisData.ocrText?.substring(0, 100) || 'None');
    console.log('  Tags:', analysisData.tags?.join(', ') || 'None');
    console.log('===================\n');

    return NextResponse.json({
      ocrText: analysisData.ocrText || '',
      description: analysisData.description || '',
      tags: analysisData.tags || [],
      colors: analysisData.colors || [],
      theme: analysisData.theme,
      status: 'success',
    });

  } catch (error) {
    console.error('Image Analysis Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
      },
      { status: 500 }
    );
  }
}
