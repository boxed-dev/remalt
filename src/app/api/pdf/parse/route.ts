import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';

export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to parse PDFs');
  }

  try {
    const { pdfData, pdfUrl } = await req.json();

    if (!pdfData && !pdfUrl) {
      return NextResponse.json(
        { error: 'PDF data or URL is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('\n=== PDF Parsing Request ===');
    console.log('User ID:', user.id);
    console.log('Source:', pdfUrl ? 'URL' : 'Base64 data');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare PDF part
    let pdfPart;
    if (pdfUrl) {
      // Fetch PDF from URL
      const pdfResponse = await fetch(pdfUrl);
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

      pdfPart = {
        inlineData: {
          data: base64Pdf,
          mimeType: 'application/pdf',
        },
      };
    } else {
      // Use provided base64 data
      pdfPart = {
        inlineData: {
          data: pdfData,
          mimeType: 'application/pdf',
        },
      };
    }

    const prompt = `Extract all text from this PDF document with structure preservation. Organize the content as follows:

1. **Full Text**: Complete text extraction
2. **Segments**: Break content into logical sections with headings
3. **Page Count**: Total number of pages

Format your response as JSON:
{
  "parsedText": "complete text here",
  "segments": [
    {
      "heading": "Section Title",
      "content": "section content",
      "page": 1
    }
  ],
  "pageCount": 10
}

Important:
- Preserve paragraph structure
- Identify and label headings/sections
- Maintain logical reading order
- Include all text, tables, and captions`;

    const result = await model.generateContent([prompt, pdfPart]);
    const responseText = result.response.text();

    console.log('[Gemini] Parsing complete:', responseText.length, 'chars');

    // Try to parse JSON response
    let parseData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parseData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback: use raw response as parsed text
      parseData = {
        parsedText: responseText,
        segments: [
          {
            heading: 'Document Content',
            content: responseText,
            page: 1
          }
        ],
        pageCount: 1
      };
    }

    console.log('[Result] ✅ Success');
    console.log('  Parsed text length:', parseData.parsedText?.length || 0, 'chars');
    console.log('  Segments:', parseData.segments?.length || 0);
    console.log('  Pages:', parseData.pageCount || 0);
    console.log('===================\n');

    return NextResponse.json({
      parsedText: parseData.parsedText || '',
      segments: parseData.segments || [],
      pageCount: parseData.pageCount || 1,
      status: 'success',
    });

  } catch (error) {
    console.error('PDF Parsing Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse PDF';

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
      },
      { status: 500 }
    );
  }
}
