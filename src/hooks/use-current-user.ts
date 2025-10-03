import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    console.log('[useCurrentUser] Getting session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[useCurrentUser] Session:', session ? 'found' : 'not found');
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[useCurrentUser] Auth change:', _event, session ? 'has session' : 'no session');
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array - only run once on mount

  return { user, loading };
}
