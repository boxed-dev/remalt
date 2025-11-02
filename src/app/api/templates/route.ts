import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublicTemplates, getPublicTemplatesByCategory } from '@/lib/supabase/workflows';

/**
 * GET /api/templates
 * Fetch public templates (no authentication required)
 * Query params:
 * - category: Filter by category (optional)
 * - search: Search by name/description (optional)
 */
async function getHandler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Fetch templates based on filters
    let templates = category
      ? await getPublicTemplatesByCategory(supabase, category)
      : await getPublicTemplates(supabase);

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower) ||
          t.metadata.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: templates,
        count: templates.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching public templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
      },
      { status: 500 }
    );
  }
}

export const GET = getHandler;
