'use client';

import { useState } from 'react';
import { X, Sparkles, Settings2 } from 'lucide-react';
import { Thread } from '@/components/assistant-ui/thread';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { ModelSelectionDialog } from './ModelSelectionDialog';
import { MODELS, type ModelInfo } from '@/lib/models/model-registry';
import { Button } from '@/components/ui/button';

interface AssistantPanelProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_MODEL = 'google/gemini-2.5-flash-preview-09-2025';

export function AssistantPanel({ workflowId, isOpen, onClose }: AssistantPanelProps) {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);

  // Create runtime with the selected model
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: '/api/chat',
      // Pass model and workflow context via headers
      headers: async () => ({
        'x-workflow-id': workflowId,
        'x-selected-model': selectedModel,
      }),
      // Pass model and provider in request body
      body: async () => ({
        model: selectedModel,
        workflowId: workflowId,
      }),
    }),
  });

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDialogOpen(false);
  };

  const selectedModelInfo = MODELS.find(m => m.id === selectedModel);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed top-0 right-0 h-full w-[480px] bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">AI Assistant</h2>
                <p className="text-xs text-gray-500">Workflow helper & context-aware chat</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close assistant"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Model Selector */}
          <div className="px-4 pb-3">
            <button
              onClick={() => setIsModelDialogOpen(true)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Provider Icon */}
                {selectedModelInfo && (
                  <div className={`p-1.5 rounded ${selectedModelInfo.tier === 'smart' ? 'bg-purple-100' : 'bg-blue-100'} flex-shrink-0`}>
                    <div className={`w-4 h-4 ${selectedModelInfo.tier === 'smart' ? 'text-purple-600' : 'text-blue-600'}`}>
                      {/* Icon placeholder - will use provider icon */}
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Model Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {selectedModelInfo?.displayName || 'Select Model'}
                    </span>
                    {selectedModelInfo?.badge && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                        {selectedModelInfo.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{selectedModelInfo?.provider || 'Provider'}</span>
                    {selectedModelInfo?.contextWindow && (
                      <>
                        <span>•</span>
                        <span>{(selectedModelInfo.contextWindow / 1000).toFixed(0)}K context</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Settings Icon */}
                <Settings2 className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
              </div>
            </button>
          </div>
        </div>

        {/* Main Chat Area - assistant-ui Thread component */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <AssistantRuntimeProvider runtime={runtime}>
            <style jsx global>{`
              /* Hide the session/thread count badge */
              .aui-thread-root [data-session-count],
              .aui-thread-root .aui-thread-count,
              .aui-thread-root [class*="session"],
              [class*="ThreadSessionCount"],
              [class*="thread-session"] {
                display: none !important;
              }
            `}</style>
            <Thread />
          </AssistantRuntimeProvider>
        </div>

        {/* Footer - Info */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Connected to workflow</span>
            </div>
            <span>•</span>
            <span>{selectedModelInfo?.category || 'AI'} model</span>
          </div>
        </div>
      </div>

      {/* Model Selection Dialog */}
      <ModelSelectionDialog
        open={isModelDialogOpen}
        onOpenChange={setIsModelDialogOpen}
        currentModel={selectedModel}
        onSelectModel={handleModelSelect}
      />
    </>
  );
}
