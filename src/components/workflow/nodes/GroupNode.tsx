import { memo, useCallback, useMemo, useState } from "react";
import { NodeResizer, Handle, Position, useReactFlow } from "@xyflow/react";
import { Pencil } from "lucide-react";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import type { GroupNodeData, WorkflowNode } from "@/types/workflow";

interface GroupNodeProps {
  id: string;
  data: GroupNodeData;
  selected?: boolean;
}

export const GroupNode = memo(({ id, data, selected }: GroupNodeProps) => {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const workflow = useWorkflowStore((s) => s.workflow);
  const reactFlowInstance = useReactFlow();

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Calculate minimum dimensions based on child nodes
  // This prevents the group from being resized smaller than its contents
  const { minWidth, minHeight } = useMemo(() => {
    const HEADER_HEIGHT = 44; // Height of the dark header bar
    const PADDING = 16; // Padding to ensure children aren't right at the edge
    const DEFAULT_MIN_WIDTH = 360;
    const DEFAULT_MIN_HEIGHT = 220;

    // Early return if no workflow loaded
    if (!workflow || !reactFlowInstance) {
      return {
        minWidth: DEFAULT_MIN_WIDTH,
        minHeight: DEFAULT_MIN_HEIGHT,
      };
    }

    // Get all nodes from ReactFlow (includes measured dimensions)
    const allReactFlowNodes = reactFlowInstance.getNodes();
    
    // Find child nodes of this group from Zustand store
    const childIds = workflow.nodes
      .filter((node: WorkflowNode) => node.parentId === id)
      .map((node: WorkflowNode) => node.id);

    if (childIds.length === 0) {
      return {
        minWidth: DEFAULT_MIN_WIDTH,
        minHeight: DEFAULT_MIN_HEIGHT,
      };
    }

    // Calculate the bounding box that contains all children
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    childIds.forEach((childId: string) => {
      // Get the ReactFlow node which has measured dimensions
      const reactFlowNode = allReactFlowNodes.find(n => n.id === childId);
      const workflowNode = workflow.nodes.find((n: WorkflowNode) => n.id === childId);
      
      if (!reactFlowNode || !workflowNode) return;

      // Child positions are relative to the group
      const childX = workflowNode.position.x;
      const childY = workflowNode.position.y;
      
      // Get child dimensions - use measured dimensions from ReactFlow
      // ReactFlow's measured property contains the actual rendered size
      const childWidth = 
        reactFlowNode.measured?.width ?? 
        reactFlowNode.width ?? 
        workflowNode.style?.width ?? 
        300;
      const childHeight = 
        reactFlowNode.measured?.height ?? 
        reactFlowNode.height ?? 
        workflowNode.style?.height ?? 
        200;

      // Calculate bounds
      minX = Math.min(minX, childX);
      minY = Math.min(minY, childY);
      maxX = Math.max(maxX, childX + childWidth);
      maxY = Math.max(maxY, childY + childHeight);
    });

    // Calculate required dimensions
    // Add padding to ensure children aren't at the exact edge
    // Add header height to account for the dark title bar
    const requiredWidth = Math.max(DEFAULT_MIN_WIDTH, maxX - minX + PADDING * 2);
    const requiredHeight = Math.max(
      DEFAULT_MIN_HEIGHT,
      maxY - minY + PADDING * 2 + HEADER_HEIGHT
    );

    return {
      minWidth: Math.ceil(requiredWidth),
      minHeight: Math.ceil(requiredHeight),
    };
  }, [id, workflow, reactFlowInstance]);

  const saveTitle = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      updateNodeData(id, {
        title: trimmed || "Group",
      } as Partial<GroupNodeData>);
      setIsEditingTitle(false);
    },
    [id, updateNodeData]
  );

  // Handle resize to properly update node dimensions and position
  const handleResize = useCallback(
    (event: any, params: any) => {
      // Update the node's style to reflect new dimensions
      // This ensures the node maintains its visual consistency during resize
      updateNode(id, {
        style: {
          width: params.width,
          height: params.height,
        },
      });
    },
    [id, updateNode]
  );

  const isDragOver = (data as any)?.isDragOver;

  // Calculate border and shadow styles based on state
  const containerStyles = useMemo(() => {
    if (isDragOver) {
      return {
        border: "",
        outline:
          "outline outline-4 outline-dashed outline-[#095D40] outline-offset-0",
        shadow: "shadow-[0_0_0_8px_rgba(9,93,64,0.15)]",
        bg: "bg-[#095D40]/5",
      };
    }
    if (selected) {
      return {
        border: "",
        outline: "outline outline-3 outline-[#095D40] outline-offset-0",
        shadow:
          "shadow-[0_0_0_6px_rgba(9,93,64,0.15),0_6px_20px_rgba(9,93,64,0.15)]",
        bg: "bg-white",
      };
    }
    return {
      border: "",
      outline: "",
      shadow: "shadow-lg hover:shadow-xl",
      bg: "bg-white",
    };
  }, [isDragOver, selected]);

  return (
    <div
      className={`
        w-full h-full rounded-2xl
        ${containerStyles.bg}
        ${containerStyles.outline}
        ${containerStyles.shadow}
        transition-all duration-200
        relative overflow-visible
      `}
      role="group"
      aria-label={`Group container: ${data.title || "Unnamed"}`}
      aria-describedby={`group-description-${id}`}
    >
      {/* Resizer - Always visible */}
      <NodeResizer
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={2000}
        maxHeight={1500}
        color="transparent"
        handleClassName="!w-3 !h-3 !border-2 !border-[#095D40] !bg-white !rounded-full !opacity-0 group-hover:!opacity-100 !transition-opacity"
        lineClassName="!hidden"
        isVisible={true}
        keepAspectRatio={false}
        onResize={handleResize}
      />

      {/* Header - Dark bar with title */}
      <div className="bg-[#095D40] px-4 py-2.5 flex items-center rounded-t-2xl pointer-events-auto">
        <div className="flex items-center gap-2">
          <div
            contentEditable={isEditingTitle}
            suppressContentEditableWarning
            onClick={(e) => {
              if (!isEditingTitle) {
                e.stopPropagation();
                setIsEditingTitle(true);
                // Select all text on click
                setTimeout(() => {
                  const target = e.currentTarget;
                  if (target && target.childNodes.length > 0) {
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(target);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }
                }, 0);
              }
            }}
            onBlur={(e) => {
              if (isEditingTitle) {
                saveTitle(e.currentTarget.textContent || "");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.textContent = data.title || "Group";
                setIsEditingTitle(false);
                e.currentTarget.blur();
              }
            }}
            className={`text-[13px] font-semibold tracking-wide text-white text-left outline-none ${
              isEditingTitle ? "nodrag cursor-text" : "cursor-pointer"
            }`}
            role="textbox"
            aria-label="Group name"
          >
            {data.title || "Group"}
          </div>
          <Pencil 
            className="w-3.5 h-3.5 text-white/60 hover:text-white/90 transition-colors flex-shrink-0" 
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Content area - Drop zone for child nodes */}
      <div
        className="relative w-full h-[calc(100%-44px)] bg-[#FAFBFC] rounded-b-2xl"
        aria-label="Group content area - drag nodes here to add them to this group"
      >
        {/* Empty state hint - shown during drag-over to indicate drop zone */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-[#095D40] text-[13px] font-medium">
              <p>Drop here to add to group</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom curved bracket resize indicator */}
      {selected && (
        <div className="absolute bottom-2 right-2 w-5 h-5 pointer-events-none z-10">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 20 12 Q 20 20 12 20"
              stroke="#095D40"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      )}

      {/* Hidden description for screen readers */}
      <div id={`group-description-${id}`} className="sr-only">
        This is a group container that can hold other workflow nodes. You can
        drag nodes into this group, resize the group, and move the entire group
        around the canvas. Use keyboard shortcuts: Ctrl+G to create a group,
        Ctrl+Shift+G to ungroup, Ctrl+Shift+C to select group children.
      </div>

      {/* Connection handles - positioned relative to the main container */}
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        isConnectable={true}
        className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#095D40] hover:!scale-125 !transition-all !duration-150 !opacity-100 pointer-events-auto"
        style={{ right: "-7px", zIndex: 50 }}
      />
    </div>
  );
});
