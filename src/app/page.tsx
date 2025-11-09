'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Hero } from "@/components/layout/hero";
import { Features } from "@/components/layout/features";
import { WorkflowPreview } from "@/components/layout/workflow-preview";
import { Testimonials } from "@/components/layout/testimonials";
import { FinalCTA } from "@/components/layout/final-cta";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check for OAuth errors in URL hash or query params
    const checkOAuthError = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.substring(1));

      const error = params.get('error') || hash.get('error');
      const errorDescription = params.get('error_description') || hash.get('error_description');

      if (error) {
        console.error('[Home] OAuth error detected:', { error, errorDescription });
        const errorMsg = errorDescription || error;
        router.replace(`/auth/signin?error=${encodeURIComponent(errorMsg)}`);
      }
    };

    checkOAuthError();
  }, [router]);

  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <WorkflowPreview />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}
