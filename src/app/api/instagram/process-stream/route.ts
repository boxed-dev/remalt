import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

export const runtime = 'edge';
export const maxDuration = 60;

async function postHandler(request: Request) {
  try {
    const { videoUrl, reelCode } = await request.json();

    if (!videoUrl || !reelCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing videoUrl or reelCode' }),
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

          // Download video with progress tracking
          const startDownload = Date.now();
          const videoResponse = await fetch(videoUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.instagram.com/',
              'Accept': 'video/mp4,video/*;q=0.8,*/*;q=0.5',
            },
          });

          if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
          }

          const videoBuffer = await videoResponse.arrayBuffer();
          const downloadTime = Date.now() - startDownload;
          const videoSizeMB = (videoBuffer.byteLength / (1024 * 1024)).toFixed(2);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'analyzing',
                progress: 30,
                downloadTime,
                videoSizeMB,
              })}\n\n`
            )
          );

          // Initialize Gemini model
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
          });

          // Convert video buffer to base64
          const base64Video = btoa(
            String.fromCharCode(...new Uint8Array(videoBuffer))
          );

          const prompt = `You are analyzing an Instagram reel/video. Please provide an extremely detailed and comprehensive analysis including:

1. **Transcript**: A complete word-for-word transcription of ALL spoken content in the video. Include every word of dialogue, narration, speech, and any text-to-speech. Capture everything spoken.

2. **Visual Description**:
   - Scene-by-scene breakdown of what's happening visually
   - People/characters and their actions
   - Objects, props, and products shown
   - Text overlays, captions, and on-screen text
   - Graphics, animations, and visual effects
   - Camera movements and transitions
   - Settings and locations

3. **Color Scheme & Visual Style**:
   - Dominant colors used in the video
   - Color palette and mood (warm/cool tones, vibrant/muted, etc.)
   - Lighting quality (bright, moody, natural, studio, etc.)
   - Visual filters or effects applied
   - Overall aesthetic (minimalist, maximalist, vintage, modern, etc.)

4. **Audio Analysis**:
   - Background music genre, mood, and tempo
   - Sound effects used
   - Voice characteristics (pitch, energy, accent)
   - Audio quality and recording environment

5. **Production Quality**:
   - Camera quality (professional, smartphone, etc.)
   - Editing style (cuts, transitions, pacing)
   - Stabilization and framing
   - Overall production value rating

6. **Summary**: A concise 2-3 sentence summary of the main message or purpose of the video.

7. **Key Points**: List the main points, topics, or takeaways from the video (bullet points).

8. **Content Type**: Identify the type of content (e.g., educational, promotional, entertainment, tutorial, testimonial, product demo, etc.).

9. **Tone and Style**:
   - Overall emotional tone (professional, casual, humorous, serious, inspirational, etc.)
   - Pacing (fast-paced, slow, moderate)
   - Energy level (high, low, moderate)

10. **Target Audience**: Who is this video aimed at?

11. **Hook & Engagement**:
    - How does the video capture attention in the first 3 seconds?
    - Engagement tactics used

12. **Call to Action**: Any explicit or implicit calls to action

Format your response in clear sections with headers. Be extremely thorough and detailed.`;

          // Stream the response
          const result = await model.generateContentStream([
            {
              inlineData: {
                data: base64Video,
                mimeType: 'video/mp4',
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
                  progress: Math.min(90, 30 + chunkCount * 2),
                })}\n\n`
              )
            );
          }

          // Extract transcript and summary
          let transcript = '';
          const transcriptMatch = fullAnalysis.match(
            /\*\*Transcript:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i
          );
          if (transcriptMatch) {
            transcript = transcriptMatch[1].trim();
          }

          let summary = '';
          const summaryMatch = fullAnalysis.match(
            /\*\*Summary:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i
          );
          if (summaryMatch) {
            summary = summaryMatch[1].trim();
          }

          // Send final complete data
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'complete',
                progress: 100,
                success: true,
                storedVideoUrl: videoUrl,
                transcript: transcript || fullAnalysis,
                summary: summary || fullAnalysis.substring(0, 500),
                fullAnalysis,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error('[Instagram Stream] Error:', error);
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
