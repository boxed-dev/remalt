import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publishWorkflow, unpublishWorkflow } from '@/lib/supabase/workflows';
import { canPublishTemplates } from '@/lib/permissions/template-permissions';

/**
 * POST /api/templates/publish
 * Publish a workflow as a public template
 * Requires authentication and admin permissions (ackash@remalt.com)
 */
async function postHandler(request: NextRequest) {
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

    // Check publishing permissions
    if (!canPublishTemplates(user.email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You do not have permission to publish templates',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { workflowId, category, tags } = body;

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request: workflowId is required',
        },
        { status: 400 }
      );
    }

    // Get user profile for author info
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Publish the workflow
    await publishWorkflow(supabase, workflowId, user.id, {
      category: category || undefined,
      tags: tags || [],
      authorEmail: profile?.email || user.email!,
      authorName: profile?.full_name || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Workflow published as template successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error publishing workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish workflow',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/publish
 * Unpublish a template (set isPublic to false)
 * Requires authentication and admin permissions (ackash@remalt.com)
 */
async function deleteHandler(request: NextRequest) {
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

    // Check publishing permissions
    if (!canPublishTemplates(user.email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You do not have permission to unpublish templates',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request: workflowId is required',
        },
        { status: 400 }
      );
    }

    // Unpublish the workflow
    await unpublishWorkflow(supabase, workflowId, user.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Template unpublished successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error unpublishing workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpublish workflow',
      },
      { status: 500 }
    );
  }
}

export const POST = postHandler;
export const DELETE = deleteHandler;
