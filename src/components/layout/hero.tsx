import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 lg:pt-32 lg:pb-24">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-8">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800">
                ✨ New: AI Workflow Automation Platform
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="mx-auto max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 mb-6">
              Build AI Workflows
              <br />
              <span className="bg-gradient-to-r from-[#095D40] to-[#D4AF7F] bg-clip-text text-transparent">
                That Actually Work
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed">
              Create, automate, and optimize AI-powered workflows with our intuitive
              drag-and-drop interface. From content creation to data analysis.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button asChild size="lg" className="apple-button w-full sm:w-auto">
                <Link href="/get-started">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto text-gray-600 hover:text-gray-900"
                asChild
              >
                <Link href="/demo">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Link>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-8">
                Trusted by teams at innovative companies
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
                <div className="text-lg font-semibold text-gray-400">Company</div>
                <div className="text-lg font-semibold text-gray-400">StartupXYZ</div>
                <div className="text-lg font-semibold text-gray-400">TechCorp</div>
                <div className="text-lg font-semibold text-gray-400">Innovation Labs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-[800px] h-[800px] bg-gradient-to-r from-[#095D40]/10 to-[#D4AF7F]/20 rounded-full blur-3xl"></div>
        </div>
      </div>
    </section>
  );
}