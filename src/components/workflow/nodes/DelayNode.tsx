import { Clock } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';
import type { DelayNodeData } from '@/types/workflow';

export function DelayNode({ id, data, parentId }: NodeProps<DelayNodeData>) {
  return (
    <BaseNode
      id={id}
      type="Delay"
      icon={<Clock className="h-3.5 w-3.5 text-yellow-600" />}
      iconBg="bg-yellow-100"
      parentId={parentId}
    >
      <div className="w-[220px] space-y-3">
        <div className="text-[14px] font-semibold text-[#1A1D21] capitalize">{data.delayType}</div>
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F5F7]">
          <Clock className="h-4 w-4 text-[#6B7280]" />
          <span className="text-[14px] font-semibold text-[#1A1D21]">{data.duration}</span>
          <span className="text-[12px] text-[#9CA3AF] uppercase">{data.unit}</span>
        </div>
      </div>
    </BaseNode>
  );
}
