import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Authentication result for API routes
 */
export interface AuthResult {
  user: User | null;
  error: string | null;
}

/**
 * Require authentication for API routes
 *
 * Usage:
 * ```typescript
 * const { user, error } = await requireAuth(req);
 * if (error) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[API Auth] Authentication error:', {
        error: authError.message,
        path: req.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
      return {
        user: null,
        error: 'Authentication failed',
      };
    }

    if (!user) {
      console.warn('[API Auth] No authenticated user:', {
        path: req.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
      return {
        user: null,
        error: 'No authenticated user',
      };
    }

    // Success - user is authenticated
    return {
      user,
      error: null,
    };
  } catch (error) {
    console.error('[API Auth] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });
    return {
      user: null,
      error: 'Authentication check failed',
    };
  }
}

/**
 * Create a standardized 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  );
}
