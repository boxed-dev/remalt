import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-r from-[#095D40] to-[#D4AF7F]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <Sparkles className="w-16 h-16 text-white/80 mx-auto mb-6" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-6">
            Ready to transform your
            <br />
            workflow with AI?
          </h2>

          <p className="text-lg sm:text-xl text-white/90 mb-10 leading-relaxed max-w-2xl mx-auto">
            Join thousands of professionals who are already building powerful
            AI workflows. Start for free, no credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button
              asChild
              size="lg"
              className="bg-white text-[#095D40] hover:bg-gray-100 w-full sm:w-auto font-semibold px-8"
            >
              <Link href="/get-started">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white hover:bg-white/10 w-full sm:w-auto border border-white/20 hover:border-white/40"
              asChild
            >
              <Link href="/book-demo">Schedule a Demo</Link>
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
}