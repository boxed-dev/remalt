import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/api/auth-middleware';
import { createClient } from '@supabase/supabase-js';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Initialize Supabase client with service role key for storage operations
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: NextRequest) {
  // Require authentication
  const { user, error: authError } = await requireAuth(req);
  if (authError || !user) {
    return unauthorizedResponse('You must be signed in to upload PDFs');
  }

  try {
    // Get file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { 
          error: `File too large (${sizeMB}MB). Maximum size is 50MB.`,
          code: 'FILE_TOO_LARGE'
        },
        { status: 413 }
      );
    }

    console.log('\n=== PDF Upload Request ===');
    console.log('User ID:', user.id);
    console.log('File name:', file.name);
    console.log('File size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');

    // Generate unique file path: userId/timestamp-filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${timestamp}-${sanitizedFileName}`;

    // Upload to Supabase Storage
    const supabase = getSupabaseClient();
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage' },
        { status: 500 }
      );
    }

    console.log('[Upload] ✅ Success');
    console.log('  Storage path:', filePath);
    console.log('===================\n');

    // Get public URL (for signed URLs, we'll generate on-demand in the component)
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      storagePath: filePath,
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
      uploadedAt: new Date().toISOString(),
      // Note: publicUrl is not directly accessible due to RLS, 
      // use signed URL for access
      path: uploadData.path,
    });

  } catch (error) {
    console.error('PDF Upload Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload PDF';

    return NextResponse.json(
      {
        error: errorMessage,
        status: 'error',
      },
      { status: 500 }
    );
  }
}


