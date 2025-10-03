import { FolderTree, MessageSquare } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { GroupNodeData } from '@/types/workflow';

export function GroupNode({ id, data }: NodeProps<GroupNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const toggleChat = () => {
    updateNodeData(id, {
      groupChatEnabled: !data.groupChatEnabled,
    } as Partial<GroupNodeData>);
  };

  return (
    <BaseNode id={id}>
      <div className="space-y-2 w-[220px]">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-[#6B7280]" />
          <span className="text-[13px] font-medium text-[#1A1D21]">Group</span>
        </div>
        <div className="text-[12px] text-[#6B7280]">
          {data.groupedNodes?.length || 0} nodes
        </div>
        <button
          onClick={toggleChat}
          className={`w-full flex items-center gap-1.5 px-3 py-2 text-[11px] rounded transition ${
            data.groupChatEnabled
              ? 'bg-[#14B8A6] text-white'
              : 'bg-[#F5F5F7] text-[#6B7280] hover:bg-[#EBEBEB]'
          }`}
        >
          <MessageSquare className="h-3 w-3" />
          <span>{data.groupChatEnabled ? 'Chat enabled' : 'Enable chat'}</span>
        </button>
      </div>
    </BaseNode>
  );
}
