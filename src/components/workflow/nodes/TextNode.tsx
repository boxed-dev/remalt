import { memo } from 'react';
import { Type } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { AIInstructionsInline } from './AIInstructionsInline';
import { BlockNoteEditor } from '../BlockNoteEditor';
import type { TextNodeData } from '@/types/workflow';

interface TextNodeProps {
  id: string;
  data: TextNodeData;
}

export const TextNode = memo(({ id, data }: TextNodeProps) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const handleContentChange = (content: string) => {
    updateNodeData(id, { content } as Partial<TextNodeData>);
  };

  return (
    <BaseNode id={id}>
      <div className="w-[520px] rounded-xl overflow-hidden">
        {/* Blue Header - exactly like the image */}
        <div className="bg-[#5B7FE8] px-4 py-2.5 flex items-center gap-2.5 rounded-t-xl">
          <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
            <Type className="h-3.5 w-3.5 text-[#5B7FE8]" strokeWidth={2.5} />
          </div>
          <span className="text-[13px] font-semibold text-white tracking-wide">Text</span>
        </div>

        {/* Editor Content - Full clickable area */}
        <div className="bg-white">
          <BlockNoteEditor
            initialContent={data.content}
            onChange={handleContentChange}
            placeholder="Enter text or type '/' for commands"
            className="min-h-[200px] max-h-[500px]"
          />
        </div>

        {/* AI Instructions at bottom */}
        <div className="px-4 pb-3 bg-white border-t border-[#F3F4F6] rounded-b-xl">
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
