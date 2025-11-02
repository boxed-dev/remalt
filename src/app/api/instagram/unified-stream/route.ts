import { GoogleGenerativeAI } from '@google/generative-ai';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const APIFY_ACTOR_ENDPOINT = 'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items';

export const runtime = 'edge';
export const maxDuration = 60;

async function postHandler(request: Request) {
  if (!APIFY_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'APIFY_API_TOKEN not configured' }),
      { status: 500 }
    );
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      { status: 500 }
    );
  }

  try {
    const { url } = await request.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Fetch Instagram data from Apify
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status: 'fetching', progress: 10, message: 'Fetching Instagram post...' })}\n\n`)
          );

          const apifyResponse = await fetch(APIFY_ACTOR_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${APIFY_TOKEN}`,
            },
            body: JSON.stringify({
              directUrls: [url],
              resultsLimit: 1,
            }),
          });

          if (!apifyResponse.ok) {
            throw new Error(`Apify API error: ${apifyResponse.statusText}`);
          }

          const apifyData = await apifyResponse.json();

          if (!apifyData || apifyData.length === 0) {
            throw new Error('No data returned from Instagram');
          }

          const item = apifyData[0];
          const videoUrl = item.videoUrl || item.videoUrls?.[0];
          const isVideo = item.isVideo || item.type === 'Video' || !!videoUrl;
          const caption = item.caption || '';

          // Extract images for carousel posts
          const images = item.images
            ? item.images.map((img: any) =>
                typeof img === 'string' ? img : img.url
              )
            : [];

          const thumbnail = item.displayUrl || item.thumbnailUrl || item.thumbnail || item.imageUrl || images[0];

          // Step 2: Send basic data immediately
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'fetched',
                progress: 25,
                data: {
                  videoUrl,
                  thumbnail,
                  images,
                  caption,
                  isVideo,
                  author: {
                    username: item.ownerUsername,
                    fullName: item.ownerFullName,
                    profilePicUrl: item.ownerProfilePicUrl || item.owner?.profile_pic_url,
                  },
                  likes: item.likesCount || 0,
                  views: item.videoViewCount || item.videoPlayCount || 0,
                  comments: item.commentsCount || 0,
                  postType: item.type,
                },
              })}\n\n`
            )
          );

          // Step 3: Download and analyze media in parallel with status updates
          const mediaUrl = isVideo ? videoUrl : (images[0] || thumbnail);

          if (!mediaUrl) {
            throw new Error('No media URL found');
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'downloading',
                progress: 30,
                message: `Downloading ${isVideo ? 'video' : 'image'}...`,
              })}\n\n`
            )
          );

          // Download media
          const mediaResponse = await fetch(mediaUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.instagram.com/',
            },
          });

          if (!mediaResponse.ok) {
            throw new Error(`Failed to download media: ${mediaResponse.statusText}`);
          }

          const mediaBuffer = await mediaResponse.arrayBuffer();
          const sizeMB = (mediaBuffer.byteLength / (1024 * 1024)).toFixed(2);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'analyzing',
                progress: 40,
                message: 'Analyzing with Gemini AI...',
                sizeMB,
              })}\n\n`
            )
          );

          // Initialize Gemini model
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
          });

          const base64Media = btoa(String.fromCharCode(...new Uint8Array(mediaBuffer)));
          const mimeType = isVideo ? 'video/mp4' : (mediaResponse.headers.get('content-type') || 'image/jpeg');

          const prompt = isVideo
            ? `Analyze this Instagram reel/video comprehensively. Extract transcript, describe visuals, identify key points, and provide a summary.`
            : `Analyze this Instagram image${caption ? ` with caption: "${caption}"` : ''}. Extract all visible text, describe the image, identify colors and style.`;

          // Stream Gemini analysis
          const result = await model.generateContentStream([
            {
              inlineData: {
                data: base64Media,
                mimeType,
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

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  status: 'streaming',
                  progress: Math.min(95, 40 + chunkCount * 2),
                  chunk: text,
                })}\n\n`
              )
            );
          }

          // Extract structured data from analysis
          let transcript = '';
          let summary = '';
          let ocrText = '';

          if (isVideo) {
            const transcriptMatch = fullAnalysis.match(/\*\*Transcript:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
            if (transcriptMatch) {
              transcript = transcriptMatch[1].trim();
            }
            const summaryMatch = fullAnalysis.match(/\*\*Summary:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
            if (summaryMatch) {
              summary = summaryMatch[1].trim();
            }
          } else {
            const ocrMatch = fullAnalysis.match(/\*\*Text Extraction.*?:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
            if (ocrMatch) {
              ocrText = ocrMatch[1].trim();
            }
            const descMatch = fullAnalysis.match(/\*\*Visual Description:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
            if (descMatch) {
              summary = descMatch[1].trim();
            }
          }

          // Send final complete data
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'complete',
                progress: 100,
                success: true,
                analysis: {
                  fullAnalysis,
                  transcript: transcript || undefined,
                  summary: summary || fullAnalysis.substring(0, 500),
                  ocrText: ocrText || undefined,
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error('[Instagram Unified Stream] Error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                status: 'error',
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
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}

export const POST = postHandler;
