import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { createClient } from '@/lib/supabase/server';

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 hours

async function postHandler(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to access recordings');
  }

  try {
    const { path } = await req.json();

    if (typeof path !== 'string' || path.length === 0) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Not authorized to access this recording' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data, error: signedError } = await supabase.storage
      .from('media')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (signedError || !data) {
      console.error('[Voice Signed URL] Failed to create signed URL:', signedError);
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

    return NextResponse.json({ signedUrl: data.signedUrl, expiresAt });
  } catch (error) {
    console.error('[Voice Signed URL] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create signed URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = postHandler;
