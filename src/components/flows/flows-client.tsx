"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { FlowCard } from "@/components/flows/flow-card";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteWorkflow, type WorkflowSummary } from "@/lib/supabase/workflows";
import { toast } from "sonner";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canPublishTemplates } from "@/lib/permissions/template-permissions";
import { PublishTemplateDialog } from "@/components/flows/publish-template-dialog";

interface FlowsClientProps {
  initialWorkflows: WorkflowSummary[];
}

export function FlowsClient({ initialWorkflows }: FlowsClientProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [workflows, setWorkflows] =
    useState<WorkflowSummary[]>(initialWorkflows);
  const [searchQuery, setSearchQuery] = useState("");
  const isPageVisible = usePageVisibility();
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowSummary | null>(null);

  const isTemplateAdmin = canPublishTemplates(user?.email);

  const filteredFlows = useMemo(() => {
    let filtered = workflows;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (flow) =>
          flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          flow.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [workflows, searchQuery]);

  const handleFlowClick = (flowId: string) => {
    router.push(`/flows/${flowId}`);
  };

  const handleNewFlow = () => {
    router.push(`/flows/new`);
  };

  const handleDeleteFlow = async (flowId: string) => {
    try {
      const supabase = createClient();
      await deleteWorkflow(supabase, flowId);

      // Remove from local state (optimistic update)
      setWorkflows(workflows.filter((w) => w.id !== flowId));
      toast.success("Workflow deleted successfully");

      // FIXED: Remove router.refresh() to prevent unnecessary page reload
      // Local state update is sufficient for immediate UI feedback
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast.error("Failed to delete workflow. Please try again.");
    }
  };

  const handleOpenPublishDialog = (workflow: WorkflowSummary) => {
    setSelectedWorkflow(workflow);
    setPublishDialogOpen(true);
  };

  const handlePublish = async (category: string, tags: string[]) => {
    if (!selectedWorkflow) return;

    try {
      const response = await fetch("/api/templates/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: selectedWorkflow.id,
          category,
          tags,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to publish template");
      }

      // Update local state
      setWorkflows(
        workflows.map((w) =>
          w.id === selectedWorkflow.id
            ? {
                ...w,
                metadata: {
                  ...w.metadata,
                  isPublic: true,
                  category,
                  tags,
                },
              }
            : w
        )
      );

      toast.success("Template published successfully");
    } catch (error) {
      console.error("Failed to publish template:", error);
      toast.error("Failed to publish template. Please try again.");
      throw error;
    }
  };

  const handleUnpublish = async () => {
    if (!selectedWorkflow) return;

    try {
      const response = await fetch("/api/templates/publish", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: selectedWorkflow.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to unpublish template");
      }

      // Update local state
      setWorkflows(
        workflows.map((w) =>
          w.id === selectedWorkflow.id
            ? {
                ...w,
                metadata: {
                  ...w.metadata,
                  isPublic: false,
                },
              }
            : w
        )
      );

      toast.success("Template unpublished successfully");
    } catch (error) {
      console.error("Failed to unpublish template:", error);
      toast.error("Failed to unpublish template. Please try again.");
      throw error;
    }
  };

  // PROFESSIONAL: Subscribe to real-time workflow changes
  // This ensures data stays fresh without manual refreshes
  useEffect(() => {
    const supabase = createClient();

    // Only subscribe when page is visible to save resources
    if (!isPageVisible) return;

    const channel = supabase
      .channel("workflows-list-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflows",
        },
        async (payload) => {
          console.log("📡 Workflow change detected:", payload.eventType);

          // Refetch workflows to get updated list
          const supabase = createClient();
          const { data: updatedWorkflows } = await supabase
            .from("workflows")
            .select(
              `
              id,
              name,
              description,
              nodes,
              created_at,
              updated_at,
              metadata
            `
            )
            .order("updated_at", { ascending: false });

          if (updatedWorkflows) {
            // Transform to WorkflowSummary format
            const summaries: WorkflowSummary[] = updatedWorkflows.map((w) => ({
              id: w.id,
              name: w.name,
              description: w.description || undefined,
              nodeCount: Array.isArray(w.nodes) ? w.nodes.length : 0,
              createdAt: w.created_at,
              updatedAt: w.updated_at,
              metadata: w.metadata || undefined,
            }));
            setWorkflows(summaries);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPageVisible]);

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6]" data-testid="flows-list">
      {/* Main Content */}
      <main className="min-h-screen">
        <div className="w-full px-8 lg:px-12 py-10">
          {/* Header with Search and New Flow Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search canvas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#095D40] focus:border-transparent text-[15px] bg-white transition-all duration-200 shadow-sm"
                data-testid="search-input"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif',
                }}
              />
            </div>
            <Button
              onClick={handleNewFlow}
              className="bg-[#095D40] text-white hover:bg-[#074030] transition-all duration-200 rounded-xl px-7 py-3.5 h-auto font-semibold text-[15px] shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Canvas
            </Button>
          </div>

          {/* Flow Grid */}
          {workflows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* New Flow Card */}
              <button
                onClick={handleNewFlow}
                className="group cursor-pointer border-2 border-dashed border-[#E5E7EB] rounded-xl p-6 hover:border-[#095D40] hover:bg-white transition-all duration-200 aspect-[4/3] flex flex-col items-center justify-center gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-[#F3F4F6] flex items-center justify-center group-hover:bg-[#095D40] transition-all duration-200">
                  <Plus className="h-6 w-6 text-[#9CA3AF] group-hover:text-white transition-all duration-200" />
                </div>
                <span className="text-[14px] font-medium text-[#6B7280] group-hover:text-[#095D40] transition-all duration-200">
                  New Canvas
                </span>
              </button>

              {/* Flow Cards */}
              {filteredFlows.map((flow) => (
                <FlowCard
                  key={flow.id}
                  flow={{
                    id: flow.id,
                    name: flow.name,
                    description: flow.description || "",
                    nodeCount: flow.nodeCount,
                    lastEdited: new Date(flow.updatedAt),
                    tags:
                      flow.metadata?.tags?.map((tag) => ({
                        name: tag as any,
                        color: "#D4AF7F",
                        count: 0,
                      })) || [],
                    isPublic: flow.metadata?.isPublic || false,
                    category: flow.metadata?.category,
                  }}
                  onClick={() => handleFlowClick(flow.id)}
                  onDelete={() => handleDeleteFlow(flow.id)}
                  onPublish={isTemplateAdmin ? () => handleOpenPublishDialog(flow) : undefined}
                  isTemplateAdmin={isTemplateAdmin}
                />
              ))}
            </div>
          ) : (
            /* Empty State - No Workflows */
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-[#E5E7EB]">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#095D40] to-[#074030] flex items-center justify-center shadow-lg">
                <svg
                  className="h-12 w-12 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-[28px] font-bold text-[#1A1D21] mb-3">
                Create your first canvas
              </h2>
              <p className="text-[16px] text-[#6B7280] mb-8 max-w-lg text-center leading-relaxed">
                Build AI-powered canvas with drag-and-drop nodes. Connect
                YouTube videos, PDFs, images, and more.
              </p>
              <Button
                onClick={handleNewFlow}
                className="bg-[#095D40] text-white hover:bg-[#074030] transition-all duration-200 rounded-xl px-8 py-4 h-auto text-[16px] font-semibold shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Canvas
              </Button>
            </div>
          )}

          {/* Empty Search Results */}
          {workflows.length > 0 && filteredFlows.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-[#E5E7EB]">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#F3F4F6] flex items-center justify-center">
                  <Search className="h-10 w-10 text-[#9CA3AF]" />
                </div>
                <h3 className="text-[22px] font-bold text-[#1A1D21] mb-3">
                  No canvas found
                </h3>
                <p className="text-[15px] text-[#6B7280] mb-6">
                  Try adjusting your search or create a new flow to get started
                </p>
                <Button
                  onClick={handleNewFlow}
                  className="bg-[#095D40] text-white hover:bg-[#074030] transition-all duration-200 rounded-xl px-6 py-3 h-auto font-semibold shadow-lg hover:shadow-xl"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Canvas
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Publish Template Dialog */}
      {selectedWorkflow && (
        <PublishTemplateDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          workflowId={selectedWorkflow.id}
          workflowName={selectedWorkflow.name}
          currentCategory={selectedWorkflow.metadata?.category}
          currentTags={selectedWorkflow.metadata?.tags}
          isPublished={selectedWorkflow.metadata?.isPublic}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />
      )}
    </div>
  );
}
