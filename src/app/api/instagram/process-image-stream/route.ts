import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

export const runtime = 'edge';
export const maxDuration = 30;

async function postHandler(request: Request) {
  try {
    const { imageUrl, postCode, caption } = await request.json();

    if (!imageUrl || !postCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing imageUrl or postCode' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status: 'downloading', progress: 0 })}\n\n`)
          );

          // Download image
          const imageResponse = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.instagram.com/',
              'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            },
          });

          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`);
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const imageSizeKB = (imageBuffer.byteLength / 1024).toFixed(2);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'analyzing',
                progress: 25,
                imageSizeKB,
              })}\n\n`
            )
          );

          // Initialize Gemini model
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
          });

          // Convert image buffer to base64
          const base64Image = btoa(
            String.fromCharCode(...new Uint8Array(imageBuffer))
          );

          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

          const prompt = `You are analyzing an Instagram post image${
            caption ? ` with the caption: "${caption}"` : ''
          }. Please provide a comprehensive visual analysis including:

1. **Visual Description**:
   - Main subject and composition
   - People, objects, and their relationships
   - Setting and environment
   - Text overlays or captions visible in the image
   - Graphics, logos, or branding elements

2. **Text Extraction (OCR)**:
   - Extract ALL visible text in the image (headlines, captions, labels, watermarks, etc.)
   - Include any hashtags or mentions visible in the image itself

3. **Color Analysis**:
   - Dominant colors and color palette
   - Color mood (warm/cool, vibrant/muted, monochromatic/varied)
   - Lighting quality and atmosphere

4. **Style & Aesthetics**:
   - Photography/design style (professional, casual, minimalist, etc.)
   - Filters or effects applied
   - Overall aesthetic and mood

5. **Content Type**:
   - Identify the type of content (product photo, lifestyle, meme, infographic, quote, selfie, food, travel, etc.)
   - Purpose or intent of the post

6. **Key Elements**:
   - What draws attention first?
   - Notable features or focal points
   - Composition techniques used

7. **Context & Meaning**:
   - What message or story does this image convey?
   - Emotional tone (inspirational, humorous, serious, promotional, etc.)
   - Target audience

Format your response in clear sections with headers. Be thorough and capture all visual information.`;

          // Stream the response
          const result = await model.generateContentStream([
            {
              inlineData: {
                data: base64Image,
                mimeType: contentType,
              },
            },
            prompt,
          ]);

          let fullAnalysis = '';
          let chunkCount = 0;

          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullAnalysis += text;
            chunkCount++;

            // Stream each chunk to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  status: 'streaming',
                  chunk: text,
                  progress: Math.min(90, 25 + chunkCount * 3),
                })}\n\n`
              )
            );
          }

          // Extract OCR text
          let ocrText = '';
          const ocrMatch = fullAnalysis.match(
            /\*\*Text Extraction.*?:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i
          );
          if (ocrMatch) {
            ocrText = ocrMatch[1].trim();
          }

          // Extract visual description for summary
          let summary = '';
          const descMatch = fullAnalysis.match(
            /\*\*Visual Description:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i
          );
          if (descMatch) {
            summary = descMatch[1].trim();
            const sentences = summary.match(/[^.!?]+[.!?]+/g);
            if (sentences && sentences.length > 0) {
              summary = sentences.slice(0, 2).join(' ').trim();
            }
          }

          // Send final complete data
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'complete',
                progress: 100,
                success: true,
                ocrText: ocrText || undefined,
                summary: summary || fullAnalysis.substring(0, 300),
                fullAnalysis,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error('[Instagram Image Stream] Error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'error',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const POST = postHandler;
