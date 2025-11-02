import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { recordAIMetadata, withAISpan } from '@/lib/sentry/ai';

async function postHandler(req: NextRequest) {
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

    const sourceType = imageUrl ? 'url' : 'base64';
    let downloadOccurred = false;

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

    // Prepare image content for OpenAI
    let imageContent: string;

    if (imageUrl) {
      // Check if it's an Uploadcare URL or external URL
      const isUploadcareUrl = imageUrl.includes('ucarecdn.net') || imageUrl.includes('uploadcare.com');

      if (isUploadcareUrl) {
        // For Uploadcare URLs, download and convert to base64 to avoid OpenAI timeout
        console.log('[Uploadcare] Downloading image from CDN...');
        try {
          // Add format transformation to ensure proper file type
          const transformedUrl = imageUrl.endsWith('/')
            ? `${imageUrl}-/format/auto/-/quality/smart/`
            : `${imageUrl}/-/format/auto/-/quality/smart/`;

          const imageResponse = await fetch(transformedUrl, {
            headers: {
              'User-Agent': 'Remalt/1.0',
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });

          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
          }

          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');

          // Detect mime type from response
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          imageContent = `data:${contentType};base64,${base64}`;

          console.log('[Uploadcare] ✅ Image downloaded and converted to base64');
          downloadOccurred = true;
        } catch (fetchError) {
          console.error('[Uploadcare] Failed to download:', fetchError);
          // Fallback to direct URL
          imageContent = imageUrl;
        }
      } else {
        // For external URLs, pass directly
        imageContent = imageUrl;
      }
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

    recordAIMetadata({
      userId: user.id,
      operation: 'image.analyze',
      sourceType,
      downloadOccurred,
      promptLength: prompt.length,
    });

    const { responseText } = await withAISpan(
      {
        name: 'ai.image.analyze',
        op: 'ai.vision',
        metadata: {
          sourceType,
          downloadOccurred,
          hasInlineData: Boolean(imageData),
        },
      },
      async (span) => {
        span.setData('prompt_characters', prompt.length);

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

        const text = response.choices[0]?.message?.content || '';
        span.setData('response_characters', text.length);

        if (response.usage) {
          span.setData('token_usage', {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          });
        }

        return { responseText: text };
      }
    );

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

export const POST = postHandler;
