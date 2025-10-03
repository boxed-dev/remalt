import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import Firecrawl from '@mendable/firecrawl-js';

const FIRECRAWL_API_KEY = 'fc-64322bfbcefd4930921a785b8bd464a7';

export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to analyze webpages');
  }

  try {
    let body;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { error: 'Request body is empty' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log('\n=== Webpage Analysis Request (Firecrawl) ===');
    console.log('User ID:', user.id);
    console.log('URL:', url);

    // Initialize Firecrawl
    const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

    // Define extraction schema
    const schema = {
      type: 'object',
      properties: {
        pageTitle: { type: 'string' },
        pageContent: { type: 'string' },
        summary: { type: 'string' },
        keyPoints: {
          type: 'array',
          items: { type: 'string' }
        },
        metadata: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            keywords: {
              type: 'array',
              items: { type: 'string' }
            },
            author: { type: 'string' }
          }
        }
      },
      required: ['pageTitle', 'pageContent', 'summary']
    };

    // Use Firecrawl extract to analyze and extract structured data
    const result = await firecrawl.extract({
      urls: [url],
      prompt: `Analyze this webpage and extract:
1. **Page Title**: The main title of the page
2. **Main Content**: Extract the primary text content, removing navigation, ads, and boilerplate
3. **Summary**: A concise 2-3 sentence summary of the page
4. **Key Points**: List 3-5 key points or takeaways
5. **Metadata**: Extract meta description, keywords, and author information if available`,
      schema,
      scrapeOptions: {
        formats: [{ type: 'json', prompt: 'Extract structured content from the webpage', schema }]
      }
    });

    console.log('[Firecrawl] Extraction status:', result.status || result.success);

    if (!result.success && !result.data) {
      throw new Error('Failed to extract webpage data');
    }

    // Extract the data from the result
    const extractedData: any = Array.isArray(result.data) ? result.data[0] : result.data || {};
    const pageTitle = (extractedData.pageTitle as string) || url;
    const pageContent = (extractedData.pageContent as string) || '';
    const summary = (extractedData.summary as string) || '';
    const keyPoints = (extractedData.keyPoints as string[]) || [];
    const metadata = (extractedData.metadata as Record<string, unknown>) || {};

    console.log('[Result] ✅ Success');
    console.log('  Page Title:', pageTitle);
    console.log('  Content length:', pageContent.length, 'chars');
    console.log('  Key points:', keyPoints.length);
    console.log('===================\n');

    return NextResponse.json({
      url,
      pageTitle,
      pageContent,
      summary,
      keyPoints,
      metadata,
      status: 'success',
    });

  } catch (error) {
    console.error('Webpage Analysis Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze webpage';

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
      },
      { status: 500 }
    );
  }
}
