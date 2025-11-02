import { type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { updateSession } from '@/lib/supabase/middleware';

export const middleware = Sentry.wrapMiddlewareWithSentry(async (request: NextRequest) => {
  return await updateSession(request);
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
