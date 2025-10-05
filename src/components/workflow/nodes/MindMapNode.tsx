import { Lightbulb } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { MindMapNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';
import { VoiceInput, VoiceTextarea } from '../VoiceInput';

export function MindMapNode({ id, data }: NodeProps<MindMapNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [concept, setConcept] = useState(data.concept || '');
  const [notes, setNotes] = useState(data.notes || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    updateNodeData(id, {
      concept,
      notes,
    } as Partial<MindMapNodeData>);
    setIsEditing(false);
  };

  useEffect(() => {
    if (!isEditing) {
      setConcept(data.concept || '');
      setNotes(data.notes || '');
    }
  }, [data.concept, data.notes, isEditing]);

  return (
    <BaseNode id={id}>
      <div className="space-y-2 w-[240px]">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#EC4899]" />
          <span className="text-[13px] font-medium text-[#1A1D21]">Idea</span>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <VoiceInput
              ref={inputRef}
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') { setConcept(data.concept || ''); setIsEditing(false); }
              }}
              voiceMode="replace"
              placeholder="Type or speak idea..."
              className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#EC4899]"
            />
            <VoiceTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSave}
              voiceMode="append"
              placeholder="Type or speak notes..."
              className="w-full px-3 py-2 text-[11px] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#EC4899] resize-none pr-10"
              rows={3}
            />
          </div>
        ) : (
          <div onClick={() => setIsEditing(true)} className="cursor-pointer">
            <div className="text-[13px] font-medium text-[#1A1D21] mb-1">
              {data.concept || 'New Idea'}
            </div>
            {data.notes && (
              <div className="text-[11px] text-[#6B7280] line-clamp-2">{data.notes}</div>
            )}
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F5F7] text-[#6B7280]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<MindMapNodeData>)}
          nodeId={id}
          nodeType="mindmap"
        />
      </div>
    </BaseNode>
  );
}
