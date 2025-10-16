import { Merge } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';
import type { MergeNodeData } from '@/types/workflow';

export function MergeNode({ id, data, parentId }: NodeProps<MergeNodeData>) {
  return (
    <BaseNode
      id={id}
      type="Merge"
      icon={<Merge className="h-3.5 w-3.5 text-teal-600" />}
      iconBg="bg-teal-100"
      parentId={parentId}
    >
      <div className="w-[240px] space-y-3">
        <div className="text-[14px] font-semibold text-[#1A1D21] capitalize">{data.mergeStrategy}</div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data.waitForAll ? 'bg-[#FF9500]' : 'bg-[#34C759]'}`} />
          <span className="text-[12px] text-[#6B7280]">
            {data.waitForAll ? 'Wait for all inputs' : 'Process as received'}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}
