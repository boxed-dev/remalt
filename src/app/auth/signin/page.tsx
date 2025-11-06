'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom');
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(urlError || '');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('[SignIn] Error:', signInError);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      console.log('[SignIn] Success:', { user: data.user?.id, session: !!data.session });

      // Redirect to intended page or canvas
      const redirectTo = redirectedFrom || '/flows';

      // Force a hard navigation to ensure cookies are set
      window.location.href = redirectTo;
    } catch (err: any) {
      console.error('[SignIn] Exception:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      console.log('[Google SignIn] Starting OAuth flow...');

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (signInError) {
        console.error('[Google SignIn] OAuth error:', signInError);
        setError(signInError.message);
        setLoading(false);
      } else {
        console.log('[Google SignIn] OAuth initiated successfully');
      }
    } catch (err: any) {
      console.error('[Google SignIn] Exception:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold text-[#1A1D21] mb-2">Welcome back</h1>
          <p className="text-[15px] text-[#6B7280]">Sign in to your Remalt account</p>
        </div>

        {/* Sign In Form */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-[#1A1D21] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-[14px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#095D40] focus:border-transparent transition-all disabled:bg-[#F5F5F7] disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-[#1A1D21] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                className="w-full px-4 py-3 text-[14px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#095D40] focus:border-transparent transition-all disabled:bg-[#F5F5F7] disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#095D40] text-white rounded-lg font-medium text-[14px] hover:bg-[#074730] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8ECEF]"></div>
            </div>
            <div className="relative flex justify-center text-[12px]">
              <span className="px-4 bg-white text-[#9CA3AF]">Or continue with</span>
            </div>
          </div>

          {/* OAuth Providers */}
          <div className="space-y-3">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white border border-[#E8ECEF] text-[#1A1D21] rounded-lg font-medium text-[14px] hover:bg-[#FAFBFC] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-[13px] text-[#6B7280]">
            Don't have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-[#095D40] hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
        <Loader2 className="h-8 w-8 animate-spin text-[#095D40]" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
