"use client";

import { memo, useState, useMemo, useCallback } from 'react';
import { Wand2, Loader2, ChevronDown, Play, FastForward } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeHeader } from './NodeHeader';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { NodeExecutionOutput } from './NodeExecutionOutput';
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
  const activeNodeId = useWorkflowStore((state) => state.activeNodeId);
  const executeNode = useWorkflowStore((state) => state.executeNode);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const isActive = activeNodeId === id;

  const [showModelPicker, setShowModelPicker] = useState(false);
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
    setShowModelPicker(false);
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

  // Group models by provider
  const modelsByProvider = useMemo(() => {
    const groups: Record<string, typeof MODELS> = {};
    MODELS.forEach((model) => {
      const providerName = model.provider === 'gemini' ? 'Google' : 'OpenRouter';
      if (!groups[providerName]) {
        groups[providerName] = [];
      }
      groups[providerName].push(model);
    });
    return groups;
  }, []);

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
            trailing={
              <ExecutionStatusBadge
                status={data.executionStatus}
                executionTime={data.executionTime}
                showTime={true}
              />
            }
            actions={
              <div className="flex items-center gap-1">
                {/* Model Selector */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      stopPropagation(e);
                      setShowModelPicker(!showModelPicker);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-white/80 hover:bg-white border border-gray-200 hover:border-gray-300 transition-all"
                    title="Select AI model"
                  >
                    <span className="max-w-[80px] truncate">{currentModel.name}</span>
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </button>

                  {/* Model Picker Dropdown */}
                  {showModelPicker && (
                    <div
                      className="absolute top-full mt-1 right-0 w-[280px] max-h-[400px] overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                      onClick={stopPropagation}
                    >
                      {Object.entries(modelsByProvider).map(([provider, models]) => (
                        <div key={provider} className="p-2">
                          <div className="text-[9px] font-semibold text-gray-500 uppercase px-2 py-1">
                            {provider}
                          </div>
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => handleModelSelect(model.id)}
                              className={`w-full text-left px-3 py-2 rounded-md text-[11px] hover:bg-gray-50 transition-colors ${
                                model.id === data.model ? 'bg-[#D4E5DF] text-[#095D40] font-medium' : 'text-gray-700'
                              }`}
                            >
                              <div className="font-medium">{model.name}</div>
                              <div className="text-[9px] text-gray-500 mt-0.5">
                                {model.contextWindow.toLocaleString()} tokens • {model.category}
                              </div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Execution Buttons - Two buttons like in the image */}
                <button
                  onClick={handleExecuteFromHere}
                  disabled={isExecuting || data.executionStatus === 'running'}
                  className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-white/80 transition-all disabled:opacity-50"
                  title="Run from here (this node + downstream)"
                >
                  <FastForward className="h-3.5 w-3.5 text-gray-700 hover:text-[#095D40]" />
                </button>
                <button
                  onClick={handleExecuteNode}
                  disabled={isExecuting || data.executionStatus === 'running'}
                  className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-white/80 transition-all disabled:opacity-50"
                  title="Run this node only"
                >
                  {data.executionStatus === 'running' || isExecuting ? (
                    <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-gray-700 hover:text-[#095D40]" />
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
      {(isActive || selected) && (
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
