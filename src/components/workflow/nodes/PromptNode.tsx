"use client";

import { memo, useState, useMemo, useCallback } from 'react';
import { Wand2, Loader2, Play, FastForward } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeHeader } from './NodeHeader';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { NodeExecutionOutput } from './NodeExecutionOutput';
import { ModelSelectionDialog } from '../ModelSelectionDialog';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { NodeData } from '@/types/workflow';
import { FloatingAIInstructions } from './FloatingAIInstructions';
import { MODELS } from '@/lib/models/model-registry';

// Prompt Node Data interface
export interface PromptNodeData extends NodeData {
  prompt?: string;
  model?: string;
  provider?: 'gemini' | 'openrouter';
  temperature?: number;
  processedOutput?: string;
  processingStatus?: 'idle' | 'processing' | 'success' | 'error';
  processingError?: string;
}

export const PromptNode = memo(({ id, data, parentId, selected }: NodeProps<PromptNodeData>) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const executeNode = useWorkflowStore((state) => state.executeNode);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);

  const [isExecuting, setIsExecuting] = useState(false);

  // Get current model info
  const currentModel = useMemo(() => {
    const modelId = data.model || 'google/gemini-2.5-flash';
    return MODELS.find((m) => m.id === modelId) || MODELS[0];
  }, [data.model]);

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, {
      prompt: event.target.value,
    });
  };

  const handleModelSelect = (modelId: string) => {
    const model = MODELS.find((m) => m.id === modelId);
    if (model) {
      updateNodeData(id, {
        model: modelId,
        provider: model.provider,
      });
    }
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Execute this node only
  const handleExecuteNode = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExecuting) return;

    setIsExecuting(true);
    await executeNode(id, { forceExecution: true });
    setIsExecuting(false);
  }, [id, isExecuting, executeNode]);

  // Execute from this node downstream
  const handleExecuteFromHere = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExecuting) return;

    setIsExecuting(true);
    await executeWorkflow({ fromNodeId: id });
    setIsExecuting(false);
  }, [id, isExecuting, executeWorkflow]);

  return (
    <div className="relative">
      <BaseNode
        id={id}
        parentId={parentId}
        showSourceHandle={true}
        showTargetHandle={true}
        className="max-w-[380px]"
        header={
          <NodeHeader
            title="AI Prompt"
            subtitle={currentModel.name}
            icon={<Wand2 />}
            themeKey="prompt"
            actions={
              <div className="flex items-center gap-1">
                {/* Model Selector - Branded with provider icons */}
                <ModelSelectionDialog
                  currentModel={data.model || 'google/gemini-2.5-flash'}
                  onSelectModel={handleModelSelect}
                />

                {/* Execution Buttons */}
                <button
                  onClick={handleExecuteFromHere}
                  disabled={isExecuting || data.executionStatus === 'running'}
                  className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-white/20 transition-all disabled:opacity-50"
                  title="Run from here (this node + downstream)"
                >
                  <FastForward className="h-3.5 w-3.5 text-white" />
                </button>
                <button
                  onClick={handleExecuteNode}
                  disabled={isExecuting || data.executionStatus === 'running'}
                  className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-white/20 transition-all disabled:opacity-50"
                  title="Run this node only"
                >
                  {data.executionStatus === 'running' || isExecuting ? (
                    <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-white" />
                  )}
                </button>
              </div>
            }
          />
        }
      >
        <div className="space-y-3 w-[320px] max-w-[320px]">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-gray-700">
              Prompt
            </label>
            <textarea
              value={data.prompt || ''}
              onChange={handlePromptChange}
              onMouseDown={stopPropagation}
              onClick={stopPropagation}
              placeholder="Enter your AI prompt here...

Example: Summarize the content above in 3 bullet points"
              className="w-full px-3 py-2 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#095D40] focus:border-transparent resize-y min-h-[120px] font-mono"
            />
            <div className="text-[9px] text-gray-500">
              This prompt will be applied to all connected input data
            </div>
          </div>

          {/* Status Messages */}
          {data.processingStatus === 'processing' && (
            <div className="flex items-center gap-2 rounded-lg border border-[#B8D5C9] bg-[#D4E5DF] px-3 py-2 text-[11px] text-[#095D40]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Processing with {currentModel.name}...</span>
            </div>
          )}

          {data.processingStatus === 'error' && data.processingError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              <div className="font-medium">Processing failed</div>
              <div className="text-[10px] mt-1">{data.processingError}</div>
            </div>
          )}

        </div>

        {/* Execution Output - Using Standard Component */}
        <NodeExecutionOutput
          output={data.output}
          error={data.executionError}
          lastExecutedAt={data.lastExecutedAt}
          executionTime={data.executionTime}
          defaultExpanded={true}
          compact={true}
        />
      </BaseNode>

      {/* Floating AI Instructions */}
      {selected && (
        <FloatingAIInstructions
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value })}
          nodeId={id}
          nodeType="prompt"
        />
      )}
    </div>
  );
});

PromptNode.displayName = 'PromptNode';
