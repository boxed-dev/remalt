import { Play } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { TriggerNodeData } from '@/types/workflow';

interface TriggerNodeProps {
  id: string;
  data: TriggerNodeData;
}

export function TriggerNode({ id, data }: TriggerNodeProps) {
  return (
    <BaseNode
      id={id}
      type="Trigger"
      icon={<Play className="h-3.5 w-3.5 text-purple-600" />}
      iconBg="bg-purple-100"
      showTargetHandle={false}
    >
      <div className="w-[240px] space-y-3">
        <div className="text-[14px] font-semibold text-[#1A1D21] capitalize">{data.triggerType}</div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data.config.enabled ? 'bg-[#34C759]' : 'bg-[#9CA3AF]'}`} />
          <span className="text-[12px] text-[#6B7280]">
            {data.config.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </BaseNode>
  );
}
