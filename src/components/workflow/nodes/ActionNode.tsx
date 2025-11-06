import { Zap } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeHeader } from './NodeHeader';
import type { NodeProps } from '@xyflow/react';
import type { ActionNodeData } from '@/types/workflow';

export function ActionNode({ id, data, parentId }: NodeProps<ActionNodeData>) {
  return (
    <BaseNode
      id={id}
      parentId={parentId}
      header={
        <NodeHeader
          title="Action"
          subtitle={data.actionType}
          icon={<Zap />}
          themeKey="action"
        />
      }
    >
      <div className="w-[280px] space-y-3">
        {data.config.method && (
          <div className="inline-block rounded-md bg-[#F5F5F7] px-2 py-1 text-[11px] font-mono font-semibold text-[#6B7280]">
            {data.config.method}
          </div>
        )}
        {data.config.url && (
          <div className="truncate text-[11px] font-mono text-[#6B7280]">
            {data.config.url}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
