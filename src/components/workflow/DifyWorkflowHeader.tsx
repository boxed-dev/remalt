"use client";

import { ChevronLeft, MoreHorizontal, Pencil, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import { useState, useRef, useEffect } from "react";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canPublishTemplates } from "@/lib/permissions/template-permissions";
import { PublishTemplateDialog } from "@/components/flows/publish-template-dialog";
import { Badge } from "@/components/ui/badge";

export function DifyWorkflowHeader() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateWorkflowMetadata = useWorkflowStore(
    (state) => state.updateWorkflowMetadata
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const workflowName = workflow?.name || "New workflow";
  const isTemplateAdmin = canPublishTemplates(user?.email);
  const isPublished = workflow?.metadata?.isPublic || false;

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleStartEdit = () => {
    setEditedName(workflowName);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    const trimmedName = editedName.trim();

    // FIXED: Validate workflow name
    if (!trimmedName) {
      toast.error("Workflow name cannot be empty");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Workflow name is too long (max 100 characters)");
      return;
    }

    if (trimmedName !== workflowName) {
      updateWorkflowMetadata({ name: trimmedName });
      toast.success("Workflow name updated");
    }

    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handlePublish = async (category: string, tags: string[]) => {
    if (!workflow?.id) return;

    try {
      const response = await fetch("/api/templates/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
          category,
          tags,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to publish template");
      }

      // Update local state
      updateWorkflowMetadata({
        ...workflow.metadata,
        isPublic: true,
        category,
        tags,
      });

      toast.success("Template published successfully");
    } catch (error) {
      console.error("Failed to publish template:", error);
      toast.error("Failed to publish template. Please try again.");
      throw error;
    }
  };

  const handleUnpublish = async () => {
    if (!workflow?.id) return;

    try {
      const response = await fetch("/api/templates/publish", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to unpublish template");
      }

      // Update local state
      updateWorkflowMetadata({
        ...workflow.metadata,
        isPublic: false,
      });

      toast.success("Template unpublished successfully");
    } catch (error) {
      console.error("Failed to unpublish template:", error);
      toast.error("Failed to unpublish template. Please try again.");
      throw error;
    }
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 flex-shrink-0">
      {/* Left section - Back button and title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/flows")}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          title="Back to canvas"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveName}
                className="text-[15px] font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              />
            </div>
          ) : (
            <>
              <h1 className="text-[15px] font-semibold text-gray-900">
                {workflowName}
              </h1>
              <button
                onClick={handleStartEdit}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                title="Edit workflow name"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right section - Save status and action buttons */}
      <div className="flex items-center gap-3">
        {/* Published Badge */}
        {isPublished && (
          <Badge className="bg-[#095D40] text-white hover:bg-[#074830] text-[11px] font-medium flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Public Template
          </Badge>
        )}

        {/* FIXED: Mount SaveStatusIndicator */}
        <SaveStatusIndicator />

        {/* Publish Button (Admin Only) */}
        {isTemplateAdmin && (
          <button
            onClick={() => setPublishDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 text-[13px] font-medium"
            title={isPublished ? "Manage template" : "Publish as template"}
          >
            <Globe className={`h-4 w-4 ${isPublished ? 'text-[#095D40]' : ''}`} />
            {isPublished ? "Manage" : "Publish"}
          </button>
        )}

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 text-[13px] font-medium">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Publish Template Dialog */}
      {workflow && (
        <PublishTemplateDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          workflowId={workflow.id}
          workflowName={workflow.name}
          currentCategory={workflow.metadata?.category}
          currentTags={workflow.metadata?.tags}
          isPublished={isPublished}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
        />
      )}
    </header>
  );
}
