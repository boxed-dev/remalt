import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(request: Request) {
  try {
    const { content, imageUrl } = await request.json();

    if (!content && !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Either content or imageUrl is required' },
        { status: 400 }
      );
    }

    console.log(`[LinkedIn Analyzer] Analyzing post...`);

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    let prompt = '';
    const parts: any[] = [];

    if (content) {
      prompt = `Analyze this LinkedIn post and provide:

1. **Summary**: A concise 2-3 sentence summary of the main message
2. **Key Points**: List 3-5 main takeaways or insights (bullet points)
3. **Tone & Style**: The professional tone (e.g., inspirational, informative, promotional, thought leadership)
4. **Target Audience**: Who is this post aimed at?
5. **Call to Action**: Any explicit or implicit CTAs
6. **Content Type**: Type of post (career advice, industry insights, personal story, company update, etc.)

LinkedIn Post Content:
${content}

Format your response with clear section headers.`;
    }

    if (imageUrl) {
      // Download and analyze image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

      parts.push({
        inlineData: {
          data: base64Image,
          mimeType: contentType
        }
      });

      if (content) {
        prompt = `Analyze this LinkedIn post (text + image) and provide:

1. **Summary**: A concise 2-3 sentence summary combining the text and visual content
2. **Key Points**: List 3-5 main takeaways from both text and image
3. **Visual Analysis**: Describe what's shown in the image and how it relates to the text
4. **Text Extraction (OCR)**: Extract any text visible in the image
5. **Tone & Style**: The professional tone and visual style
6. **Target Audience**: Who is this post aimed at?
7. **Call to Action**: Any CTAs in text or image

LinkedIn Post Content:
${content}

Analyze both the text above and the attached image. Format your response with clear section headers.`;
      } else {
        prompt = `Analyze this LinkedIn post image and provide:

1. **Visual Description**: What's shown in the image
2. **Text Extraction (OCR)**: Extract ALL text visible in the image
3. **Key Points**: Main messages or insights from the image
4. **Style & Design**: Visual style, colors, branding
5. **Purpose**: What is this post trying to communicate?
6. **Target Audience**: Who is this aimed at?

Format your response with clear section headers.`;
      }
    }

    parts.push(prompt);

    const result = await model.generateContent(parts);
    const analysis = result.response.text();

    console.log(`[LinkedIn Analyzer] Analysis complete (${analysis.length} chars)`);

    // Extract sections from analysis
    const summaryMatch = analysis.match(/\*\*Summary:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : analysis.substring(0, 300);

    const keyPointsMatch = analysis.match(/\*\*Key Points:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    let keyPoints: string[] = [];
    if (keyPointsMatch) {
      keyPoints = keyPointsMatch[1]
        .split('\n')
        .filter(line => line.trim().match(/^[-*\d.]/))
        .map(line => line.replace(/^[-*\d.]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 5);
    }

    const ocrMatch = analysis.match(/\*\*Text Extraction.*?:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    const ocrText = ocrMatch ? ocrMatch[1].trim() : undefined;

    return NextResponse.json({
      success: true,
      summary,
      keyPoints,
      ocrText,
      fullAnalysis: analysis,
    });

  } catch (error) {
    console.error('[LinkedIn Analyzer] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze LinkedIn post'
      },
      { status: 500 }
    );
  }
}
