'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function FinalCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 bg-gradient-to-br from-[#095D40] to-[#074030] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4AF7F] rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className={`mb-8 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Sparkles className="w-4 h-4 text-[#D4AF7F]" />
              <span className="text-sm font-medium text-white">
                No credit card required
              </span>
            </div>
          </div>

          {/* Headline */}
          <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
            Ready to revolutionize
            <br />
            <span className="text-[#D4AF7F]">your workflow?</span>
          </h2>

          {/* Subheadline */}
          <p className={`text-xl sm:text-2xl text-white/90 mb-12 max-w-2xl mx-auto ${isVisible ? 'animate-slide-up-delay' : 'opacity-0'}`}>
            Join thousands who've already transformed their work with AI.
            Start building in seconds.
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${isVisible ? 'animate-slide-up-delay-2' : 'opacity-0'}`}>
            <Button asChild size="lg" className="bg-white text-[#095D40] hover:bg-white/90 px-8 py-6 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 w-full sm:w-auto">
              <Link href="/flows/new">
                Start Building Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white border-2 border-white/30 hover:bg-white/10 px-8 py-6 text-lg font-medium rounded-xl w-full sm:w-auto"
              asChild
            >
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>

          {/* Trust text */}
          <p className={`text-white/70 text-sm mt-8 ${isVisible ? 'animate-fade-in-delay' : 'opacity-0'}`}>
            Free forever for personal use. Upgrade anytime.
          </p>
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
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-fade-in-delay {
          animation: fade-in 1s ease-out 0.6s forwards;
          opacity: 0;
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
      `}</style>
    </section>
  );
}