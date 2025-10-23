import { Suspense } from "react";
import { FlowsClient } from "@/components/flows/flows-client";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkflowsSummary } from "@/lib/supabase/workflows";
import { redirect } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading";

// FIXED: Remove force-dynamic to prevent unnecessary refreshes on tab switching
// Data freshness is now handled by client-side Supabase realtime subscriptions
export const revalidate = 60; // Cache for 60 seconds to improve performance

async function FlowsContent() {
  // Get authenticated user and workflows in parallel
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Fetch workflow summaries (optimized query)
  const workflows = await getUserWorkflowsSummary(supabase);

  return <FlowsClient initialWorkflows={workflows} />;
}

export default function FlowsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading your flows..." />}>
      <FlowsContent />
    </Suspense>
  );
}
