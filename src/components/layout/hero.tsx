'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-white">
      {/* Gradient Orb - Subtle and elegant */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#D4AF7F]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-[#095D40]/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-4xl text-center">
          {/* New Badge - Simplified */}
          <div className={`mb-8 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#095D40]/10 border border-[#095D40]/20">
              <Sparkles className="w-4 h-4 text-[#095D40]" />
              <span className="text-sm font-medium text-[#095D40]">
                The AI Canvas is Here
              </span>
            </div>
          </div>

          {/* Main Headline - Powerful and Simple */}
          <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#333333] mb-6 leading-[1.1] ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
            Your Ideas.
            <br />
            <span className="text-[#095D40]">Amplified by AI.</span>
          </h1>

          {/* Subheadline - Clear value proposition */}
          <p className={`mx-auto max-w-2xl text-xl sm:text-2xl text-[#6B7280] mb-12 leading-relaxed ${mounted ? 'animate-slide-up-delay' : 'opacity-0'}`}>
            Drag. Drop. Create. The simplest way to build AI workflows that transform how you work.
          </p>

          {/* CTA Buttons - Clear hierarchy */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 ${mounted ? 'animate-slide-up-delay-2' : 'opacity-0'}`}>
            <Button asChild size="lg" className="bg-[#095D40] hover:bg-[#074030] text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto">
              <Link href="/flows/new">
                Start Building Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-[#095D40] hover:text-[#074030] hover:bg-[#095D40]/10 px-8 py-6 text-lg font-medium rounded-xl w-full sm:w-auto"
              asChild
            >
              <Link href="#demo">
                See it in Action
                <Zap className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Trust Indicators - Numbers speak */}
          <div className={`grid grid-cols-3 gap-8 max-w-3xl mx-auto ${mounted ? 'animate-fade-in-delay' : 'opacity-0'}`}>
            <div>
              <div className="text-3xl font-bold text-[#095D40]">10k+</div>
              <div className="text-sm text-[#6B7280] mt-1">Workflows Created</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#095D40]">50M+</div>
              <div className="text-sm text-[#6B7280] mt-1">AI Operations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#095D40]">5min</div>
              <div className="text-sm text-[#6B7280] mt-1">To First Workflow</div>
            </div>
          </div>
        </div>
      </div>


      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
        }

        .animate-slide-up-delay {
          animation: slide-up 0.8s ease-out 0.1s forwards;
          opacity: 0;
        }

        .animate-slide-up-delay-2 {
          animation: slide-up 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }

        .animate-fade-in-delay {
          animation: fade-in 1s ease-out 0.4s forwards;
          opacity: 0;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </section>
  );
}