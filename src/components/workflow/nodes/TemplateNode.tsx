import { memo } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BaseNode } from './BaseNode';
import { NodeHeader } from './NodeHeader';
import { ExecutionButton } from './ExecutionButton';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { NodeExecutionOutput } from './NodeExecutionOutput';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { buildChatContext } from '@/lib/workflow/context-builder';
import type { NodeProps } from '@xyflow/react';
import type { TemplateNodeData } from '@/types/workflow';
import { FloatingAIInstructions } from './FloatingAIInstructions';

const templateLabels: Record<TemplateNodeData['templateType'], string> = {
  'youtube-script': 'YouTube Script',
  'ad-copy': 'Ad Copy',
  'captions': 'Captions',
  'blog-post': 'Blog Post',
  'custom': 'Custom',
};

const templateOptions: Array<TemplateNodeData['templateType']> = [
  'youtube-script',
  'ad-copy',
  'captions',
  'blog-post',
  'custom',
];

export const TemplateNode = memo(({ id, data, parentId, selected }: NodeProps<TemplateNodeData>) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const workflow = useWorkflowStore((state) => state.workflow);

  const templateLabel = useMemo(() => templateLabels[data.templateType], [data.templateType]);

  useEffect(() => {
    setGenerationError(data.generationError || null);
  }, [data.generationError]);

  const handleSelectTemplate = (templateType: TemplateNodeData['templateType']) => {
    updateNodeData(id, {
      templateType,
      generationStatus: 'idle',
      generationError: undefined,
    } as Partial<TemplateNodeData>);
    setIsSelecting(false);
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, {
      customPrompt: event.target.value,
    } as Partial<TemplateNodeData>);
  };

  const handleGenerate = async () => {
    if (!workflow) return;

    const context = buildChatContext(id, workflow);
    setGenerationError(null);

    updateNodeData(id, {
      generationStatus: 'generating',
      generationError: undefined,
    } as Partial<TemplateNodeData>);

    try {
      const response = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateType: data.templateType,
          customPrompt: data.customPrompt,
          context,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      updateNodeData(id, {
        generatedContent: result.content,
        generationStatus: 'success',
        generationError: undefined,
      } as Partial<TemplateNodeData>);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      setGenerationError(message);
      updateNodeData(id, {
        generationStatus: 'error',
        generationError: message,
      } as Partial<TemplateNodeData>);
    }
  };

  return (
    <div className="relative">
      <BaseNode
        id={id}
        parentId={parentId}
        showSourceHandle={true}
        showTargetHandle={true}
        header={
          <NodeHeader
            title="Template"
            subtitle={templateLabel}
            icon={<Sparkles />}
            themeKey="template"
            trailing={
              <ExecutionStatusBadge
                status={data.executionStatus}
                executionTime={data.executionTime}
                showTime={true}
              />
            }
            actions={
              <ExecutionButton
                nodeId={id}
                nodeType="template"
                executionStatus={data.executionStatus}
                variant="icon"
              />
            }
          />
        }
      >
        <div className="space-y-3 w-[280px]">

        {isSelecting ? (
          <div className="space-y-1">
            {templateOptions.map((type) => (
              <button
                key={type}
                onClick={(e) => { e.stopPropagation(); handleSelectTemplate(type); }}
                className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#F5F5F7] rounded transition"
              >
                {templateLabels[type]}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div
              onClick={(e) => { e.stopPropagation(); setIsSelecting(true); }}
              className="px-3 py-2 bg-[#F5F5F7] rounded cursor-pointer hover:bg-[#EBEBEB] transition"
            >
              <div className="text-[12px] text-[#1A1D21]">{templateLabel}</div>
              <div className="text-[10px] text-[#6B7280]">Click to change template</div>
            </div>

            <textarea
              value={data.customPrompt || ''}
              onChange={handlePromptChange}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              placeholder="Optional: add extra instructions or tone preferences"
              className="w-full px-3 py-2 text-[11px] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#10B981] resize-y min-h-[60px]"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
                disabled={data.generationStatus === 'generating'}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#10B981] text-white text-[12px] font-medium py-2 hover:bg-[#0EA472] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {data.generationStatus === 'generating' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {data.generationStatus === 'generating' ? 'Generating…' : 'Generate'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
                disabled={data.generationStatus === 'generating'}
                className="p-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#10B981] hover:text-[#10B981] transition"
                title="Regenerate"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {generationError && (
              <div className="flex items-center gap-2 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{generationError}</span>
              </div>
            )}

            {data.generatedContent && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#6B7280] uppercase">
                  <span>Latest output</span>
                  {data.generationStatus === 'success' && (
                    <span className="text-[#10B981]">Success</span>
                  )}
                </div>
                <div className="text-[11px] text-[#374151] p-3 bg-[#F5F5F7] rounded leading-relaxed whitespace-pre-wrap">
                  {data.generatedContent}
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Execution Output */}
        <NodeExecutionOutput
          output={data.output}
          error={data.executionError}
          lastExecutedAt={data.lastExecutedAt}
          executionTime={data.executionTime}
          defaultExpanded={data.executionStatus === 'error'}
          compact={true}
        />
      </BaseNode>

      {/* Floating AI Instructions - visible once the node is active/selected */}
      {selected && (
        <FloatingAIInstructions
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<TemplateNodeData>)}
          nodeId={id}
          nodeType="template"
        />
      )}
    </div>
  );
});
