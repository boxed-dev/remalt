import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

export async function processInstagramImage(imageUrl: string, postCode: string, caption?: string) {
  const startTime = Date.now();
  console.log(`[Instagram Processor] Starting image processing for post: ${postCode}`);

  try {
    // 1. Download image
    console.log(`[Instagram Processor] Step 1: Downloading image from Instagram CDN...`);
    const downloadStart = Date.now();
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageSizeKB = (imageBuffer.byteLength / 1024).toFixed(2);
    console.log(`[Instagram Processor] ✓ Image downloaded: ${imageSizeKB}KB in ${Date.now() - downloadStart}ms`);

    // 2. Send image to Gemini Vision for analysis
    console.log(`[Instagram Processor] Step 2: Sending image to Gemini Vision for analysis...`);
    const geminiStart = Date.now();

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
    });

    // Convert image buffer to base64 for Gemini
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Determine mime type from response headers or URL
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const prompt = `You are analyzing an Instagram post image${caption ? ` with the caption: "${caption}"` : ''}. Please provide a comprehensive visual analysis including:

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

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: contentType
        }
      },
      prompt
    ]);

    const response = result.response;
    const analysis = response.text();

    const geminiTime = Date.now() - geminiStart;
    const analysisLength = analysis.length;

    console.log(`[Instagram Processor] ✓ Gemini Vision analysis completed in ${geminiTime}ms`);
    console.log(`[Instagram Processor]   - Analysis length: ${analysisLength} characters`);
    console.log(`[Instagram Processor]   - Preview: ${analysis.substring(0, 200)}...`);

    // Extract OCR text section
    let ocrText = '';
    const ocrMatch = analysis.match(/\*\*Text Extraction.*?:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    if (ocrMatch) {
      ocrText = ocrMatch[1].trim();
    }

    // Extract visual description for summary
    let summary = '';
    const descMatch = analysis.match(/\*\*Visual Description:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    if (descMatch) {
      summary = descMatch[1].trim();
      // Take first 2-3 sentences as summary
      const sentences = summary.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        summary = sentences.slice(0, 2).join(' ').trim();
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Instagram Processor] ✅ Image processing complete for ${postCode} in ${totalTime}ms`);

    return {
      ocrText: ocrText || undefined,
      summary: summary || analysis.substring(0, 300), // Fallback to first 300 chars
      fullAnalysis: analysis, // Return complete Gemini analysis
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[Instagram Processor] ❌ Image processing failed for ${postCode} after ${totalTime}ms:`, error);
    throw error;
  }
}

export async function processInstagramVideo(videoUrl: string, reelCode: string) {
  const startTime = Date.now();
  console.log(`[Instagram Processor] Starting processing for reel: ${reelCode}`);

  try {
    // 1. Download video
    console.log(`[Instagram Processor] Step 1: Downloading video from Instagram CDN...`);
    const downloadStart = Date.now();
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const videoBuffer = await videoResponse.arrayBuffer();
    const videoSizeMB = (videoBuffer.byteLength / (1024 * 1024)).toFixed(2);
    console.log(`[Instagram Processor] ✓ Video downloaded: ${videoSizeMB}MB in ${Date.now() - downloadStart}ms`);

    // 2. Send video directly to Gemini Flash for analysis
    console.log(`[Instagram Processor] Step 2: Sending video to Gemini Flash for analysis...`);
    const geminiStart = Date.now();

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
    });

    // Convert video buffer to base64 for Gemini
    const base64Video = Buffer.from(videoBuffer).toString('base64');

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
   - Silence/pauses and their timing

5. **Production Quality**:
   - Camera quality (professional, smartphone, etc.)
   - Editing style (cuts, transitions, pacing)
   - Stabilization and framing
   - Overall production value rating

6. **Summary**: A concise 2-3 sentence summary of the main message or purpose of the video.

7. **Key Points**: List the main points, topics, or takeaways from the video (bullet points).

8. **Content Type**: Identify the type of content (e.g., educational, promotional, entertainment, tutorial, testimonial, product demo, behind-the-scenes, etc.).

9. **Tone and Style**:
   - Overall emotional tone (professional, casual, humorous, serious, inspirational, etc.)
   - Pacing (fast-paced, slow, moderate)
   - Energy level (high, low, moderate)

10. **Target Audience**: Who is this video aimed at? (demographics, interests, pain points)

11. **Hook & Engagement**:
    - How does the video capture attention in the first 3 seconds?
    - Engagement tactics used (questions, shocking statements, curiosity gaps)

12. **Call to Action**: Any explicit or implicit calls to action (comment, share, follow, buy, link in bio, etc.)

13. **Timestamp Breakdown** (if applicable): Key moments with timestamps

Format your response in clear sections with headers. Be extremely thorough and detailed - capture EVERYTHING you can observe and analyze.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Video,
          mimeType: 'video/mp4'
        }
      },
      prompt
    ]);

    const response = result.response;
    const analysis = response.text();

    const geminiTime = Date.now() - geminiStart;
    const analysisLength = analysis.length;

    console.log(`[Instagram Processor] ✓ Gemini Flash analysis completed in ${geminiTime}ms`);
    console.log(`[Instagram Processor]   - Analysis length: ${analysisLength} characters`);
    console.log(`[Instagram Processor]   - Preview: ${analysis.substring(0, 200)}...`);

    // Extract transcript section (between "Transcript:" and next section header)
    let transcript = '';
    const transcriptMatch = analysis.match(/\*\*Transcript:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    if (transcriptMatch) {
      transcript = transcriptMatch[1].trim();
    }

    // Extract summary section
    let summary = '';
    const summaryMatch = analysis.match(/\*\*Summary:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Instagram Processor] ✅ Processing complete for ${reelCode} in ${totalTime}ms`);

    return {
      storedVideoUrl: videoUrl, // Return original URL since we're not storing
      transcript: transcript || analysis, // Fallback to full analysis if transcript extraction fails
      summary: summary || analysis.substring(0, 500), // Fallback to first 500 chars
      fullAnalysis: analysis, // Return complete Gemini analysis
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[Instagram Processor] ❌ Processing failed for ${reelCode} after ${totalTime}ms:`, error);
    throw error;
  }
}
