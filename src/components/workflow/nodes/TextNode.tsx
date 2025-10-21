'use client';

import { memo, useState, useEffect } from 'react';
import { Type } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { NovelEditor } from '../NovelEditor';
import { AIInstructionsInline } from './AIInstructionsInline';
import type { NodeProps } from '@xyflow/react';
import type { TextNodeData } from '@/types/workflow';

export const TextNode = memo(({ id, data, parentId }: NodeProps<TextNodeData>) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [wordCount, setWordCount] = useState(data.wordCount || 0);

  useEffect(() => {
    setWordCount(data.wordCount || 0);
  }, [data.wordCount]);

  const handleContentChange = (content: string, plainText: string) => {
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);

    updateNodeData(id, {
      content,
      plainText,
      wordCount: words,
      lastEditedAt: new Date().toISOString(),
    } as Partial<TextNodeData>);
  };

  return (
    <BaseNode id={id} parentId={parentId}>
      <div className="space-y-2" style={{ width: '560px' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-[#6B7280]" />
            <span className="text-[13px] font-medium text-[#1A1D21]">
              Rich Text
            </span>
          </div>
          {wordCount > 0 && (
            <span className="text-[11px] text-[#9CA3AF]">
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Novel Editor */}
        <div className="border border-[#E5E7EB] rounded-md overflow-hidden bg-white">
          <NovelEditor
            content={data.content}
            onChange={handleContentChange}
            editable={!data.disabled}
          />
        </div>

        {/* AI Instructions */}
        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) =>
            updateNodeData(id, { aiInstructions: value } as Partial<TextNodeData>)
          }
          nodeId={id}
          nodeType="text"
        />
      </div>
    </BaseNode>
  );
});

TextNode.displayName = 'TextNode';
