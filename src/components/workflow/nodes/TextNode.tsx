import { Type } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { AIInstructionsInline } from './AIInstructionsInline';
import { VoiceTextarea } from '../VoiceInput';
import type { TextNodeData } from '@/types/workflow';

interface TextNodeProps {
  id: string;
  data: TextNodeData;
}

export function TextNode({ id, data }: TextNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    updateNodeData(id, { content } as Partial<TextNodeData>);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setContent(data.content || '');
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      setContent(data.content || '');
    }
  }, [data.content, isEditing]);

  return (
    <BaseNode id={id}>
      <div className="space-y-2 w-[280px]">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-[#3B82F6]" />
          <span className="text-[13px] font-medium text-[#1A1D21]">Text</span>
        </div>
        {isEditing ? (
          <VoiceTextarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            voiceMode="append"
            className="w-full min-h-[100px] text-[12px] border-0 focus:outline-none resize-none text-[#1A1D21] leading-relaxed bg-transparent pr-10"
            placeholder="Type or speak..."
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-text min-h-[100px]"
          >
            {data.content ? (
              <div className="text-[12px] text-[#1A1D21] whitespace-pre-wrap leading-[1.6]">{data.content}</div>
            ) : (
              <div className="text-[12px] text-[#9CA3AF]">
                Click to add text
              </div>
            )}
          </div>
        )}

        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<TextNodeData>)}
          nodeId={id}
          nodeType="text"
        />
      </div>
    </BaseNode>
  );
}
