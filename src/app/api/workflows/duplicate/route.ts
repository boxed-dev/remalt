import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { duplicateWorkflow } from '@/lib/supabase/workflows';

/**
 * POST /api/workflows/duplicate
 * Duplicate a workflow (can be used for templates or user workflows)
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Authentication required',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { workflowId, newName } = body;

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request: workflowId is required',
        },
        { status: 400 }
      );
    }

    // Duplicate the workflow
    const duplicatedWorkflow = await duplicateWorkflow(
      supabase,
      workflowId,
      user.id,
      newName
    );

    return NextResponse.json(
      {
        success: true,
        workflow: duplicatedWorkflow,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error duplicating workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate workflow',
      },
      { status: 500 }
    );
  }
}
