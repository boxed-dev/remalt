'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show header on auth pages
  const isAuthPage = pathname?.startsWith('/auth/');
  const isWorkflowEditor = pathname?.match(/^\/flows\/[^/]+$/);

  if (isAuthPage) {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
    router.refresh();
  };

  // Show skeleton while loading or not mounted to prevent layout shift
  if (!mounted || loading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#D4AF7F]/20">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#095D40] to-[#0a7350] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-[13px]">R</span>
            </div>
            <span className="text-[15px] font-bold text-[#095D40] tracking-tight">
              Remalt
            </span>
          </Link>
          <div className="w-24 h-8 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#D4AF7F]/20">
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={user ? '/flows' : '/'}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#095D40] to-[#0a7350] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-[13px]">R</span>
          </div>
          <span className="text-[15px] font-bold text-[#095D40] tracking-tight">
            Remalt
          </span>
        </Link>

        {/* Desktop Navigation */}
        {!isWorkflowEditor && (
          <nav className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <Link
                  href="/flows"
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                    pathname === '/flows'
                      ? 'text-[#095D40] bg-[#095D40]/10'
                      : 'text-[#6B7280] hover:text-[#095D40] hover:bg-[#D4AF7F]/10'
                  }`}
                >
                  Flows
                </Link>
                <Link
                  href="/pricing"
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                    pathname === '/pricing'
                      ? 'text-[#095D40] bg-[#095D40]/10'
                      : 'text-[#6B7280] hover:text-[#095D40] hover:bg-[#D4AF7F]/10'
                  }`}
                >
                  Pricing
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  className="px-3 py-1.5 text-[13px] font-medium text-[#6B7280] hover:text-[#095D40] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="px-3 py-1.5 text-[13px] font-medium text-[#6B7280] hover:text-[#095D40] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
                >
                  Pricing
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {user ? (
            // User Menu
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 hover:bg-[#D4AF7F]/10 rounded-lg transition-colors">
                  <div className="w-7 h-7 bg-gradient-to-br from-[#095D40] to-[#0a7350] rounded-full flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="hidden sm:inline text-[13px] font-medium text-[#333333] max-w-[120px] truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[12px]">
                  <div className="font-medium text-[#333333]">
                    {user?.user_metadata?.full_name || 'Account'}
                  </div>
                  <div className="font-normal text-[#6B7280] truncate">
                    {user?.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer text-[13px]">
                    <User className="mr-2 h-3.5 w-3.5" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 focus:text-red-600 text-[13px]"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Auth Buttons
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/auth/signin"
                className="px-3 py-1.5 text-[13px] font-medium text-[#6B7280] hover:text-[#095D40] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/flows"
                className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#095D40] hover:bg-[#0a7350] rounded-md transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          {!isWorkflowEditor && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-[#333333]" />
              ) : (
                <Menu className="h-5 w-5 text-[#333333]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && !isWorkflowEditor && (
        <div className="md:hidden border-t border-[#D4AF7F]/20 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {user ? (
              <>
                <Link
                  href="/flows"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-[14px] font-medium text-[#333333] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
                >
                  Flows
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-[14px] font-medium text-[#333333] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-[14px] font-medium text-[#333333] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
                >
                  Account Settings
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-[14px] font-medium text-[#333333] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-[14px] font-medium text-[#333333] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
                >
                  Pricing
                </Link>
                <div className="pt-2 border-t border-[#D4AF7F]/20 mt-2 space-y-1">
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-[14px] font-medium text-[#333333] hover:bg-[#D4AF7F]/10 rounded-md transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/flows"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-[14px] font-medium text-white bg-[#095D40] hover:bg-[#0a7350] rounded-md transition-colors text-center"
                  >
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
