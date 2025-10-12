import { memo, useCallback, useMemo, useState } from 'react';
import { NodeResizer, Handle, Position } from '@xyflow/react';
import { GripHorizontal, Folder, Pencil, Check } from 'lucide-react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { GroupNodeData } from '@/types/workflow';

interface GroupNodeProps {
  id: string;
  data: GroupNodeData;
  selected?: boolean;
}

export const GroupNode = memo(({ id, data, selected }: GroupNodeProps) => {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(data.title || '');

  const saveTitle = useCallback(() => {
    const trimmed = titleInput.trim();
    updateNodeData(id, { title: trimmed || undefined } as Partial<GroupNodeData>);
    setIsEditingTitle(false);
  }, [id, titleInput, updateNodeData]);

  const isDragOver = (data as any)?.isDragOver;
  const borderClass = useMemo(() => {
    if (isDragOver) return 'border-4 border-[#10B981] border-dashed bg-[#10B981]/5 shadow-[0_0_0_3px_rgba(16,185,129,0.3)]';
    if (selected) return 'border-2 border-[#2563EB] shadow-[0_0_0_2px_rgba(37,99,235,0.2)]';
    return 'border border-[#E0E0E0] hover:border-[#CBD5E1]';
  }, [isDragOver, selected]);

  return (
    <div className="w-full h-full">
      <NodeResizer
        minWidth={360}
        minHeight={220}
        maxWidth={2000}
        maxHeight={1500}
        color="#2563EB"
        handleClassName="!w-4 !h-4 !bg-white !border-2 !border-[#2563EB] hover:!bg-[#2563EB] hover:!border-white !shadow-lg !rounded-sm !cursor-nw-resize"
        lineClassName="!border-[#2563EB] !border-dashed !border-2"
        isVisible={selected}
        keepAspectRatio={false}
        handleStyle={{
          width: 16,
          height: 16,
          borderRadius: 2,
        }}
        onResizeStart={() => {
          // Provide feedback when resize starts
          console.log('Starting group resize');
        }}
        onResizeEnd={() => {
          // Could add resize completion feedback here
          console.log('Group resize completed');
        }}
      />

      <div
        className={`w-full h-full rounded-xl bg-[#F7F7F7]/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${borderClass} transition-all`}
        role="group"
        aria-label={`Group container: ${data.title || 'Unnamed'}`}
        aria-describedby={`group-description-${id}`}
      >
        {/* Header - drag handle - entire header is now draggable */}
        <div
          className="custom-drag-handle cursor-move flex items-center justify-between px-4 py-3 rounded-t-xl bg-[#0F172A] text-white hover:bg-[#1e293b] transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset"
          role="button"
          tabIndex={0}
          aria-label={`Group: ${data.title || 'Unnamed'}. Drag to move or resize the group.`}
          onKeyDown={(e) => {
            // Allow keyboard navigation and activation
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsEditingTitle(true);
            }
            // Allow arrow key navigation for accessibility
            if (e.key.startsWith('Arrow')) {
              e.preventDefault();
              // Could implement focus navigation between groups here
            }
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0">
              <Folder className="w-4 h-4 text-[#0F172A]" />
            </div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2 nodrag flex-1 min-w-0">
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                      setTitleInput(data.title || '');
                    }
                  }}
                  className="px-2 py-1 text-[13px] rounded border border-white/40 bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/70 text-[#0F172A] flex-1 min-w-0"
                  placeholder="Group name"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveTitle();
                  }}
                  className="p-1 rounded bg-white border border-white/40 hover:bg-gray-50 flex-shrink-0"
                >
                  <Check className="w-4 h-4 text-[#0F172A]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[13px] font-semibold tracking-wide text-white truncate flex-1 min-w-0">
                  {data.title || 'Group'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  className="p-1.5 rounded hover:bg-white/20 nodrag opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Edit group name"
                >
                  <Pencil className="w-3.5 h-3.5 text-white/90" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Visual drag indicator */}
            <div className="flex flex-col gap-0.5 opacity-50 group-hover:opacity-70 transition-opacity">
              <div className="w-3 h-0.5 bg-white/60 rounded-full"></div>
              <div className="w-3 h-0.5 bg-white/60 rounded-full"></div>
              <div className="w-3 h-0.5 bg-white/60 rounded-full"></div>
            </div>
            <GripHorizontal className="w-4 h-4 text-white/60 group-hover:text-white/80 transition-colors" />
          </div>
        </div>

        {/* Content area */}
        <div
          className="relative w-full h-[calc(100%-48px)] rounded-b-xl bg-white"
          aria-label="Group content area - drag nodes here to add them to this group"
        />

        {/* Hidden description for screen readers */}
        <div
          id={`group-description-${id}`}
          className="sr-only"
        >
          This is a group container that can hold other workflow nodes. You can drag nodes into this group, resize the group, and move the entire group around the canvas. Use keyboard shortcuts: Ctrl+G to create a group, Ctrl+Shift+G to ungroup, Ctrl+Shift+C to select group children.
        </div>
      </div>

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#2563EB]"
        style={{ left: -7 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#2563EB]"
        style={{ right: -7 }}
      />
    </div>
  );
});
