import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Test 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({
        success: false,
        error: 'Auth failed',
        details: authError,
      }, { status: 401 });
    }

    // Test 2: Check if workflows table exists
    const { data: tables, error: tableError } = await supabase
      .from('workflows')
      .select('id')
      .limit(1);

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'Table query failed - schema likely not applied',
        details: tableError,
        hint: 'Run the SQL in supabase/schema.sql in your Supabase SQL Editor',
      }, { status: 500 });
    }

    // Test 3: Try to insert a test workflow
    const testWorkflow = {
      id: crypto.randomUUID(),
      user_id: user!.id,
      name: 'Test Workflow',
      description: 'Test',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      metadata: { version: '1.0.0', tags: [], isPublic: false },
    };

    const { data: insertData, error: insertError } = await supabase
      .from('workflows')
      .upsert(testWorkflow)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Insert failed - RLS or permissions issue',
        details: insertError,
        user: user?.id,
      }, { status: 500 });
    }

    // Clean up test workflow
    await supabase.from('workflows').delete().eq('id', testWorkflow.id);

    return NextResponse.json({
      success: true,
      message: 'All tests passed! Database is working correctly.',
      user: {
        id: user!.id,
        email: user!.email,
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
    }, { status: 500 });
  }
}
