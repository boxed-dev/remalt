"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

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
          </nav>

          {/* Desktop CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Button asChild className="apple-button">
              <Link href="/flows">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col space-y-6 mt-6">
                <Link
                  href="/browse"
                  className="text-lg font-medium hover:text-gray-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Browse
                </Link>
                <Link
                  href="/docs"
                  className="text-lg font-medium hover:text-gray-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Docs
                </Link>
                <div className="flex flex-col space-y-4 pt-6 border-t">
                  <Button asChild className="apple-button">
                    <Link href="/flows" onClick={() => setIsOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}