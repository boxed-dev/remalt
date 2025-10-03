import { Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { TemplateNodeData } from '@/types/workflow';

export function TemplateNode({ id, data }: NodeProps<TemplateNodeData>) {
  const [isSelecting, setIsSelecting] = useState(false);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const templateOptions: Array<TemplateNodeData['templateType']> = [
    'youtube-script',
    'ad-copy',
    'captions',
    'blog-post',
    'custom'
  ];

  const templateLabels: Record<TemplateNodeData['templateType'], string> = {
    'youtube-script': 'YouTube Script',
    'ad-copy': 'Ad Copy',
    'captions': 'Captions',
    'blog-post': 'Blog Post',
    'custom': 'Custom'
  };

  const handleSelectTemplate = (templateType: TemplateNodeData['templateType']) => {
    updateNodeData(id, {
      templateType,
      generationStatus: 'idle',
    } as Partial<TemplateNodeData>);
    setIsSelecting(false);
  };

  return (
    <BaseNode id={id}>
      <div className="space-y-2 w-[280px]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#10B981]" />
          <span className="text-[13px] font-medium text-[#1A1D21]">Template</span>
        </div>
        {isSelecting ? (
          <div className="space-y-1">
            {templateOptions.map((type) => (
              <button
                key={type}
                onClick={() => handleSelectTemplate(type)}
                className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F5F5F7] rounded transition"
              >
                {templateLabels[type]}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div
              onClick={() => setIsSelecting(true)}
              className="px-3 py-2 bg-[#F5F5F7] rounded cursor-pointer hover:bg-[#EBEBEB] transition"
            >
              <div className="text-[12px] text-[#1A1D21]">{templateLabels[data.templateType]}</div>
            </div>
            {data.generatedContent && (
              <div className="mt-2 text-[11px] text-[#6B7280] line-clamp-3 p-2 bg-[#F5F5F7] rounded">
                {data.generatedContent}
              </div>
            )}
            {data.generationStatus === 'generating' && (
              <div className="flex items-center gap-1 text-[10px] text-[#10B981] mt-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
