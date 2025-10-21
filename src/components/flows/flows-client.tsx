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

interface FlowsClientProps {
  initialWorkflows: WorkflowSummary[];
}

export function FlowsClient({ initialWorkflows }: FlowsClientProps) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>(initialWorkflows);
  const [searchQuery, setSearchQuery] = useState("");
  const isPageVisible = usePageVisibility();

  const filteredFlows = useMemo(() => {
    let filtered = workflows;

    if (searchQuery.trim()) {
      filtered = filtered.filter((flow) =>
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
      setWorkflows(workflows.filter(w => w.id !== flowId));
      toast.success('Workflow deleted successfully');

      // FIXED: Remove router.refresh() to prevent unnecessary page reload
      // Local state update is sufficient for immediate UI feedback
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow. Please try again.');
    }
  };

  // PROFESSIONAL: Subscribe to real-time workflow changes
  // This ensures data stays fresh without manual refreshes
  useEffect(() => {
    const supabase = createClient();

    // Only subscribe when page is visible to save resources
    if (!isPageVisible) return;

    const channel = supabase
      .channel('workflows-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflows',
        },
        async (payload) => {
          console.log('📡 Workflow change detected:', payload.eventType);

          // Refetch workflows to get updated list
          const supabase = createClient();
          const { data: updatedWorkflows } = await supabase
            .from('workflows')
            .select(`
              id,
              name,
              description,
              nodes,
              created_at,
              updated_at,
              metadata
            `)
            .order('updated_at', { ascending: false });

          if (updatedWorkflows) {
            // Transform to WorkflowSummary format
            const summaries: WorkflowSummary[] = updatedWorkflows.map(w => ({
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
    <div className="min-h-screen bg-[#FAFBFC]" data-testid="flows-list">
      {/* Main Content */}
      <main className="min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Header with Search and New Flow Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search flows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#1A1D21] text-sm bg-white transition-all duration-150"
                data-testid="search-input"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif'
                }}
              />
            </div>
            <Button
              onClick={handleNewFlow}
              className="bg-[#007AFF] text-white hover:bg-[#0051D5] transition-all duration-150 rounded-lg px-6 py-2.5 h-auto font-medium"
              style={{
                boxShadow: '0 1px 3px rgba(0, 122, 255, 0.3)'
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Flow
            </Button>
          </div>

          {/* Flow Grid */}
          {workflows.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* New Flow Card */}
              <button
                onClick={handleNewFlow}
                className="group cursor-pointer border-2 border-dashed border-[#E8ECEF] rounded-xl p-6 hover:border-[#1A1D21] hover:bg-[#FAFBFC] transition-all duration-200 aspect-[4/3] flex flex-col items-center justify-center gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#1A1D21] transition-all duration-200">
                  <Plus className="h-6 w-6 text-[#9CA3AF] group-hover:text-white transition-all duration-200" />
                </div>
                <span className="text-[14px] font-medium text-[#6B7280] group-hover:text-[#1A1D21] transition-all duration-200">New Flow</span>
              </button>

              {/* Flow Cards */}
              {filteredFlows.map((flow) => (
                <FlowCard
                  key={flow.id}
                  flow={{
                    id: flow.id,
                    name: flow.name,
                    description: flow.description || '',
                    nodeCount: flow.nodeCount,
                    lastEdited: new Date(flow.updatedAt),
                    tags: flow.metadata?.tags?.map(tag => ({ name: tag as any, color: '#007AFF', count: 0 })) || []
                  }}
                  onClick={() => handleFlowClick(flow.id)}
                  onDelete={() => handleDeleteFlow(flow.id)}
                />
              ))}
            </div>
          ) : (
            /* Empty State - No Workflows */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#F5F5F7] flex items-center justify-center">
                <svg className="h-10 w-10 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-[24px] font-bold text-[#1A1D21] mb-2">Create your first workflow</h2>
              <p className="text-[15px] text-[#6B7280] mb-6 max-w-md text-center">
                Build AI-powered workflows with drag-and-drop nodes. Connect YouTube videos, PDFs, images, and more.
              </p>
              <Button
                onClick={handleNewFlow}
                className="bg-[#007AFF] text-white hover:bg-[#0051D5] transition-all duration-150 rounded-lg px-8 py-3 h-auto text-[15px] font-medium"
                style={{
                  boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)'
                }}
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Workflow
              </Button>
            </div>
          )}

          {/* Empty Search Results */}
          {workflows.length > 0 && filteredFlows.length === 0 && (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                  <Search className="h-8 w-8 text-[#9CA3AF]" />
                </div>
                <h3 className="text-[18px] font-semibold text-[#1A1D21] mb-2">No flows found</h3>
                <p className="text-[14px] text-[#6B7280] mb-6">
                  Try adjusting your search or create a new flow to get started
                </p>
                <Button
                  onClick={handleNewFlow}
                  className="bg-[#007AFF] text-white hover:bg-[#0051D5] transition-all duration-150 rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create New Flow
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
