"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
    // FIXED: Remove router.refresh() - Next.js will handle this automatically
    // Prevents jarring refresh when switching tabs after sign out
  };

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[#E8ECEF] bg-white/80 backdrop-blur-xl"
      style={{
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.03)",
      }}
    >
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/flows"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#0051D5] rounded-lg">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
              <polyline points="7.5 19.79 7.5 14.6 3 12" />
              <polyline points="21 12 16.5 14.6 16.5 19.79" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <span
            className="text-[17px] font-semibold text-[#1A1D21]"
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif',
              letterSpacing: "-0.02em",
            }}
          >
            Remalt
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/flows"
            className="px-4 py-2 text-[14px] font-medium text-[#1A1D21] hover:bg-[#F5F5F7] rounded-lg transition-all"
          >
            Flows
          </Link>
          <Link
            href="/pricing"
            className="px-4 py-2 text-[14px] font-medium text-[#6B7280] hover:text-[#1A1D21] hover:bg-[#F5F5F7] rounded-lg transition-all"
          >
            Pricing
          </Link>
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F5F7] rounded-lg transition-all"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif',
                }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[#007AFF] to-[#0051D5] rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[13px] font-medium text-[#1A1D21]">
                    {user?.user_metadata?.full_name ||
                      user?.email?.split("@")[0] ||
                      "User"}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF]">
                    {user?.email}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
