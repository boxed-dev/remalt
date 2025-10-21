import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { FlowsClient } from "@/components/flows/flows-client";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkflowsSummary } from "@/lib/supabase/workflows";
import { redirect } from "next/navigation";

// FIXED: Remove force-dynamic to prevent unnecessary refreshes on tab switching
// Data freshness is now handled by client-side Supabase realtime subscriptions
export const revalidate = 60; // Cache for 60 seconds to improve performance

async function FlowsContent() {
  // Get authenticated user and workflows in parallel
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch workflow summaries (optimized query)
  const workflows = await getUserWorkflowsSummary(supabase);

  return <FlowsClient initialWorkflows={workflows} />;
}

function LoadingState() {
  return (
    <div className="h-screen bg-[#FAFBFC] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF] mx-auto mb-4" />
        <p className="text-[14px] text-[#6B7280]">Loading your flows...</p>
      </div>
    </div>
  );
}

export default function FlowsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FlowsContent />
    </Suspense>
  );
}
