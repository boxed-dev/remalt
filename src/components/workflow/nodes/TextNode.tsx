import { memo } from 'react';
import { Type } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { AIInstructionsInline } from './AIInstructionsInline';
import { BlockNoteEditor } from '../BlockNoteEditor';
import type { NodeProps } from '@xyflow/react';
import type { TextNodeData } from '@/types/workflow';

export const TextNode = memo(({ id, data, parentId }: NodeProps<TextNodeData>) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const handleContentChange = (content: string) => {
    updateNodeData(id, { content } as Partial<TextNodeData>);
  };

  return (
    <BaseNode id={id} parentId={parentId}>
      <div className="w-[520px]">
        {/* Minimal Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E5E7EB]">
          <Type className="h-4 w-4 text-[#6B7280]" />
          <span className="text-[12px] font-medium text-[#1A1D21]">Text</span>
        </div>

        {/* Editor Content */}
        <div className="bg-white">
          <BlockNoteEditor
            initialContent={data.content}
            onChange={handleContentChange}
            placeholder="Enter text or type '/' for commands"
            className="min-h-[200px] max-h-[500px]"
          />
        </div>

        {/* AI Instructions */}
        <div className="px-3 py-2 border-t border-[#E5E7EB]">
          <AIInstructionsInline
            value={data.aiInstructions}
            onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<TextNodeData>)}
            nodeId={id}
            nodeType="text"
          />
        </div>
      </div>
    </BaseNode>
  );
});
