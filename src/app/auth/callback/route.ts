import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/flows';

  // Check for OAuth provider errors first (passed as query params)
  const oauthError = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (oauthError) {
    console.error('[OAuth Callback] Provider error:', {
      error: oauthError,
      description: errorDescription,
      timestamp: new Date().toISOString(),
    });

    const errorMessage = errorDescription || oauthError;
    return NextResponse.redirect(
      `${origin}/auth/signin?error=${encodeURIComponent(errorMessage)}`
    );
  }

  // Missing code parameter
  if (!code) {
    console.error('[OAuth Callback] Missing code parameter:', {
      timestamp: new Date().toISOString(),
      searchParams: Object.fromEntries(searchParams.entries()),
    });

    return NextResponse.redirect(
      `${origin}/auth/signin?error=${encodeURIComponent('Authentication failed: No code provided')}`
    );
  }

  // Exchange code for session
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[OAuth Callback] Session exchange failed:', {
        error: error.message,
        code: error.code,
        status: error.status,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.redirect(
        `${origin}/auth/signin?error=${encodeURIComponent(error.message)}`
      );
    }

    // Success! Log and redirect
    console.log('[OAuth Callback] Success:', {
      userId: data.user?.id,
      email: data.user?.email,
      timestamp: new Date().toISOString(),
    });

    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';

    if (isLocalEnv) {
      // Local development
      return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
      // Production
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.redirect(
      `${origin}/auth/signin?error=${encodeURIComponent('An unexpected error occurred during authentication')}`
    );
  }
}
