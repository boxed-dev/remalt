import { Code } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { TransformNodeData } from '@/types/workflow';

interface TransformNodeProps {
  id: string;
  data: TransformNodeData;
}

export function TransformNode({ id, data }: TransformNodeProps) {
  return (
    <BaseNode
      id={id}
      type="Transform"
      icon={<Code className="h-3.5 w-3.5 text-indigo-600" />}
      iconBg="bg-indigo-100"
    >
      <div className="w-[260px] space-y-3">
        <div className="text-[14px] font-semibold text-[#1A1D21] capitalize">{data.transformType}</div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data.script ? 'bg-[#34C759]' : 'bg-[#9CA3AF]'}`} />
          <span className="text-[12px] text-[#6B7280] font-mono">
            {data.script ? 'Script configured' : 'No script set'}
          </span>
        </div>
        {data.script && (
          <div className="text-[11px] text-[#6B7280] font-mono bg-[#F5F5F7] p-2 rounded-md truncate">
            {data.script.substring(0, 40)}...
          </div>
        )}
      </div>
    </BaseNode>
  );
}
