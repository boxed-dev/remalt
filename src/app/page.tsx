import { Header } from "@/components/layout/header";
import { Hero } from "@/components/layout/hero";
import { Features } from "@/components/layout/features";
import { WorkflowPreview } from "@/components/layout/workflow-preview";
import { Pricing } from "@/components/layout/pricing";
import { FinalCTA } from "@/components/layout/final-cta";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Features />
        <WorkflowPreview />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
