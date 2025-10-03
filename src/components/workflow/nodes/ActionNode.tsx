import { Zap } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { ActionNodeData } from '@/types/workflow';

interface ActionNodeProps {
  id: string;
  data: ActionNodeData;
}

export function ActionNode({ id, data }: ActionNodeProps) {
  return (
    <BaseNode
      id={id}
      type="Action"
      icon={<Zap className="h-3.5 w-3.5 text-amber-600" />}
      iconBg="bg-amber-100"
    >
      <div className="w-[280px] space-y-3">
        <div className="text-[14px] font-semibold text-[#1A1D21] capitalize">{data.actionType}</div>
        {data.config.method && (
          <div className="inline-block px-2 py-1 rounded-md bg-[#F5F5F7] text-[11px] font-mono font-semibold text-[#6B7280]">
            {data.config.method}
          </div>
        )}
        {data.config.url && (
          <div className="text-[11px] text-[#6B7280] font-mono truncate">
            {data.config.url}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
