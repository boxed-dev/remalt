import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { ConnectorNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';

export function ConnectorNode({ id, data }: NodeProps<ConnectorNodeData>) {
  const [isSelecting, setIsSelecting] = useState(false);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const relationshipOptions: Array<ConnectorNodeData['relationshipType']> = [
    'workflow',
    'reference',
    'dependency',
    'custom'
  ];

  const relationshipLabels: Record<ConnectorNodeData['relationshipType'], string> = {
    'workflow': 'Workflow',
    'reference': 'Reference',
    'dependency': 'Dependency',
    'custom': 'Custom'
  };

  const handleSelectType = (relationshipType: ConnectorNodeData['relationshipType']) => {
    updateNodeData(id, { relationshipType } as Partial<ConnectorNodeData>);
    setIsSelecting(false);
  };

  return (
    <BaseNode id={id}>
      <div className="space-y-2 w-[200px]">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[#6366F1]" />
          <span className="text-[13px] font-medium text-[#1A1D21]">Connector</span>
        </div>
        {isSelecting ? (
          <div className="space-y-1">
            {relationshipOptions.map((type) => (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F5F5F7] rounded transition"
              >
                {relationshipLabels[type]}
              </button>
            ))}
          </div>
        ) : (
          <div
            onClick={() => setIsSelecting(true)}
            className="px-3 py-2 bg-[#F5F5F7] rounded cursor-pointer hover:bg-[#EBEBEB] transition"
          >
            <div className="text-[12px] text-[#1A1D21]">{relationshipLabels[data.relationshipType]}</div>
          </div>
        )}
        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<ConnectorNodeData>)}
          nodeId={id}
          nodeType="connector"
        />
      </div>
    </BaseNode>
  );
}
