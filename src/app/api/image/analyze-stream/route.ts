import { GoogleGenAI, FinishReason } from '@google/genai/web';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

export const runtime = 'edge';
export const maxDuration = 30;

async function postHandler(request: Request) {
  try {
    const { imageUrl, imageData, mimeType: providedMimeType } = await request.json();

    if (!imageUrl && !imageData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either imageUrl or imageData is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let base64Image: string;
          let mimeType: string = providedMimeType || 'image/jpeg';

          if (imageData) {
            // Image data is already base64
            base64Image = imageData;
            mimeType = providedMimeType || 'image/jpeg';

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ status: 'analyzing', progress: 10 })}\n\n`)
            );
          } else if (imageUrl) {
            // Download image
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ status: 'downloading', progress: 0 })}\n\n`)
            );

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image: ${imageResponse.statusText}`);
            }

            const imageBuffer = await imageResponse.arrayBuffer();

            // Convert ArrayBuffer to base64 using chunked processing to avoid stack overflow
            const bytes = new Uint8Array(imageBuffer);
            const CHUNK_SIZE = 8192;
            let binary = '';

            for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
              const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
              binary += String.fromCharCode(...chunk);
            }

            base64Image = btoa(binary);
            const downloadedMimeType = imageResponse.headers.get('content-type');
            mimeType = downloadedMimeType || providedMimeType || 'image/jpeg';

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ status: 'analyzing', progress: 20 })}\n\n`)
            );
          } else {
            throw new Error('No image data provided');
          }

          const prompt = `Analyze this image comprehensively and provide:

1. **Description**: A detailed description of what's in the image, including objects, people, scenery, and context.

2. **OCR Text**: Extract ALL visible text in the image (if any). Include labels, signs, watermarks, captions, etc.

3. **Tags**: List relevant tags/keywords that describe the image content.

4. **Colors**: Identify the dominant colors and overall color palette.

5. **Analysis**: What is the purpose, mood, or story this image conveys?

Format your response in clear sections.`;

          // Notify client that Gemini request has started
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status: 'analyzing', progress: 35 })}\n\n`)
          );

          const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: base64Image,
                      mimeType,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
          });

          const primaryCandidate = response.candidates?.[0];

          if (!primaryCandidate) {
            throw new Error('Gemini returned no analysis candidates');
          }

          if (primaryCandidate.finishReason && primaryCandidate.finishReason !== FinishReason.STOP) {
            throw new Error(`Gemini response ended early: ${primaryCandidate.finishReason}`);
          }

          if (primaryCandidate.content === undefined && !response.text) {
            throw new Error('Gemini response was empty');
          }

          const combinedText =
            response.text ??
            primaryCandidate.content?.parts
              ?.map((part) => {
                if ('text' in part && part.text) {
                  return part.text;
                }

                return '';
              })
              .join('') ??
            '';

          const fullAnalysis = combinedText.trim();

          if (!fullAnalysis) {
            throw new Error('Gemini returned empty analysis');
          }

          // Extract sections
          let description = '';
          const descMatch = fullAnalysis.match(/\*\*Description:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
          if (descMatch) {
            description = descMatch[1].trim();
          }

          let ocrText = '';
          const ocrMatch = fullAnalysis.match(/\*\*OCR Text:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
          if (ocrMatch) {
            ocrText = ocrMatch[1].trim();
          }

          let tags: string[] = [];
          const tagsMatch = fullAnalysis.match(/\*\*Tags:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
          if (tagsMatch) {
            const tagsText = tagsMatch[1].trim();
            tags = tagsText.split(/[,\n]/).map(t => t.trim()).filter(t => t);
          }

          let colors: string[] = [];
          const colorsMatch = fullAnalysis.match(/\*\*Colors:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
          if (colorsMatch) {
            const colorsText = colorsMatch[1].trim();
            colors = colorsText.split(/[,\n]/).map(c => c.trim()).filter(c => c);
          }

          // Send final complete data
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'complete',
                progress: 100,
                success: true,
                description: description || fullAnalysis.substring(0, 500),
                ocrText,
                tags,
                colors,
                fullAnalysis,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error('[Image Analysis Stream] Error:', error);
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
