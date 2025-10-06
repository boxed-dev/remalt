import { useState, useCallback } from 'react';
import { Folder, X } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { GroupNodeData } from '@/types/workflow';

export function GroupNode({ id, data }: NodeProps<GroupNodeData>) {
  const [isDragOver, setIsDragOver] = useState(false);

  const workflow = useWorkflowStore((state) => state.workflow);
  const removeNodesFromGroup = useWorkflowStore((state) => state.removeNodesFromGroup);

  const groupedNodes = workflow?.nodes.filter(n => data.groupedNodes?.includes(n.id)) || [];

  // Handle mouse enter for drag feedback
  const handleMouseEnter = useCallback(() => {
    const isDragging = document.querySelector('[data-dragging="true"]');
    if (isDragging) {
      setIsDragOver(true);
      (window as any).__targetGroupId = id;
    }
  }, [id]);

  const handleMouseLeave = useCallback(() => {
    setIsDragOver(false);
    if ((window as any).__targetGroupId === id) {
      (window as any).__targetGroupId = null;
    }
  }, [id]);

  const removeNodeFromGroup = (nodeId: string) => {
    removeNodesFromGroup(id, [nodeId]);
  };

  return (
    <div className="relative bg-transparent">
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] hover:!scale-125 !transition-all !duration-150"
        style={{ left: '-5px', top: '26px' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] hover:!scale-125 !transition-all !duration-150"
        style={{ right: '-5px', top: '26px' }}
      />

      <div
        className={`w-[960px] h-[720px] rounded-2xl overflow-hidden transition-all shadow-lg ${
          isDragOver
            ? 'border-[3px] border-[#2D3748]'
            : 'border-2 border-[#2D3748]'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Dark Header */}
        <div className="bg-[#2D3748] px-4 py-3 flex items-center gap-3">
          <Folder className="w-5 h-5 text-white" />
          <span className="text-white text-[15px] font-medium">Group 1</span>
          {groupedNodes.length > 0 && (
            <span className="ml-auto text-[#A0AEC0] text-[13px]">
              {groupedNodes.length} {groupedNodes.length === 1 ? 'node' : 'nodes'}
            </span>
          )}
        </div>

        {/* Large Drop Zone */}
        <div className="relative bg-[#F7FAFC] h-[calc(100%-52px)] p-6">

          {/* Grouped Nodes Display */}
          {groupedNodes.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 h-full overflow-y-auto">
              {groupedNodes.map(node => (
                <div
                  key={node.id}
                  className="bg-white rounded-lg border border-[#E2E8F0] p-4 h-fit group hover:border-[#CBD5E0] transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#14B8A6] rounded-full"></div>
                      <span className="text-[13px] font-medium text-[#2D3748] capitalize">
                        {node.type}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNodeFromGroup(node.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#FEE2E2] rounded"
                    >
                      <X className="w-3.5 h-3.5 text-[#EF4444]" />
                    </button>
                  </div>
                  <div className="text-[11px] text-[#718096] truncate">
                    ID: {node.id.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-[#E2E8F0] rounded-2xl flex items-center justify-center mb-4">
                <Folder className="w-10 h-10 text-[#A0AEC0]" />
              </div>
              <h3 className="text-[15px] font-medium text-[#2D3748] mb-2">
                No nodes in group
              </h3>
              <p className="text-[13px] text-[#718096] max-w-sm">
                Drag and drop nodes here to organize them into a group
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
