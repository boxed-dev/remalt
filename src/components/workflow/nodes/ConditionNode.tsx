import { GitBranch } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { ConditionNodeData } from '@/types/workflow';

interface ConditionNodeProps {
  id: string;
  data: ConditionNodeData;
}

export function ConditionNode({ id, data }: ConditionNodeProps) {
  return (
    <BaseNode
      id={id}
      type="Condition"
      icon={<GitBranch className="h-3.5 w-3.5 text-pink-600" />}
      iconBg="bg-pink-100"
    >
      <div className="w-[260px] space-y-3">
        <div className="inline-block px-2 py-1 rounded-md bg-[#F5F5F7] text-[11px] font-mono font-semibold text-[#6B7280] capitalize">
          {data.operator}
        </div>
        <div className="text-[13px] text-[#6B7280]">
          {data.condition || <span className="italic text-[#9CA3AF]">No condition set</span>}
        </div>
        {data.trueLabel && data.falseLabel && (
          <div className="flex gap-2 text-[11px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#34C759]" />
              <span className="text-[#6B7280]">{data.trueLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              <span className="text-[#6B7280]">{data.falseLabel}</span>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
