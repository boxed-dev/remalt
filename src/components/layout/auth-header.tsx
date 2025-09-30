import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function AuthHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full glass border-b backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-semibold">Remalt</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/browse"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/docs"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/account">Account</Link>
                </Button>
                <form action="/auth/signout" method="POST">
                  <Button variant="outline" type="submit">
                    Sign Out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild className="apple-button">
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}