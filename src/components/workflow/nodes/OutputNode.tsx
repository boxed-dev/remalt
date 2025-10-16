import { FileOutput } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';
import type { OutputNodeData } from '@/types/workflow';

export function OutputNode({ id, data, parentId }: NodeProps<OutputNodeData>) {
  return (
    <BaseNode
      id={id}
      type="Output"
      icon={<FileOutput className="h-3.5 w-3.5 text-gray-600" />}
      iconBg="bg-gray-100"
      showSourceHandle={false}
      parentId={parentId}
    >
      <div className="w-[240px] space-y-3">
        <div className="text-[14px] font-semibold text-[#1A1D21] capitalize">{data.outputType}</div>
        <div className="text-[12px] text-[#6B7280]">
          Format: <span className="font-mono text-[11px]">{data.format}</span>
        </div>
        {data.destination && (
          <div className="text-[11px] text-[#9CA3AF] font-mono truncate">
            {data.destination}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
