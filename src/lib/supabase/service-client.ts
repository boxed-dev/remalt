import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with SERVICE ROLE key
 *
 * ⚠️ WARNING: This bypasses Row Level Security (RLS)
 * Only use for:
 * - Admin operations
 * - Background jobs
 * - Server-side operations that need full database access
 *
 * NEVER use in client-side code or expose to users
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
