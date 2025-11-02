import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit per recording
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function sanitizeFileName(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return normalized.replace(/-+/g, '-');
}

function resolveExtension(name: string, mimeType: string): string {
  const extFromName = name.includes('.') ? name.split('.').pop() ?? '' : '';
  if (extFromName) {
    return extFromName;
  }

  switch (mimeType) {
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/wav':
      return 'wav';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/webm':
    default:
      return 'webm';
  }
}

async function postHandler(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to upload recordings');
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
    }

    const workflowId = (formData.get('workflowId') || '').toString().trim();
    const nodeId = (formData.get('nodeId') || '').toString().trim();
    const recordingId = (formData.get('recordingId') || randomUUID()).toString();

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Recording exceeds 25MB upload limit' }, { status: 413 });
    }

    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'audio/webm';

    const sanitizedName = sanitizeFileName(file.name || `${nodeId}.webm`);
    const extension = resolveExtension(sanitizedName, mimeType);
    const objectName = `${user.id}/${workflowId}/${recordingId}.${extension}`;

    const supabase = await createClient();

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(objectName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Voice Upload] Storage upload failed:', uploadError);
      return NextResponse.json({ error: 'Failed to store recording' }, { status: 500 });
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from('media')
      .createSignedUrl(objectName, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signedData) {
      console.error('[Voice Upload] Failed to create signed URL:', signedError);
      return NextResponse.json({ error: 'Failed to create access URL' }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

    return NextResponse.json({
      path: objectName,
      signedUrl: signedData.signedUrl,
      expiresAt,
    });
  } catch (error) {
    console.error('[Voice Upload] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload recording';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = postHandler;
