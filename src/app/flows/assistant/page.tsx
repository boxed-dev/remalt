'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Settings2 } from 'lucide-react';
import { Thread } from '@/components/assistant-ui/thread';
import { ThreadListSidebar } from '@/components/assistant-ui/threadlist-sidebar';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { ModelSelectionDialog } from '@/components/workflow/ModelSelectionDialog';
import { MODELS } from '@/lib/models/model-registry';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const DEFAULT_MODEL = 'google/gemini-2.5-flash-preview-09-2025';

export default function AssistantPage() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);

  // Create runtime config that updates when model changes
  const runtimeConfig = useMemo(() => ({
    transport: new AssistantChatTransport({
      api: '/api/chat',
      headers: async () => ({
        'x-workflow-id': 'global',
        'x-selected-model': selectedModel,
      }),
      body: async () => ({
        model: selectedModel,
        workflowId: 'global',
      }),
    }),
  }), [selectedModel]);

  // Create runtime with memoized config
  const runtime = useChatRuntime(runtimeConfig);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDialogOpen(false);
  };

  const selectedModelInfo = MODELS.find(m => m.id === selectedModel);

  return (
    <>
      <AssistantRuntimeProvider runtime={runtime}>
        <SidebarProvider>
          <div className="fixed inset-0 flex bg-white">
            {/* Thread History Sidebar */}
            <ThreadListSidebar />

            {/* Main Content */}
            <SidebarInset className="flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between p-3">
                  {/* Back button + Title + Sidebar Toggle */}
                  <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <button
                      onClick={() => router.push('/flows')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Back to workflows"
                    >
                      <ArrowLeft className="h-4 w-4 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h1 className="text-sm font-semibold text-gray-900">AI Assistant</h1>
                        <p className="text-xs text-gray-500">Chat with AI models</p>
                      </div>
                    </div>
                  </div>

                  {/* Model Selector - Render as trigger for popover */}
                  <div>
                    <ModelSelectionDialog
                      open={isModelDialogOpen}
                      onOpenChange={setIsModelDialogOpen}
                      currentModel={selectedModel}
                      onSelectModel={handleModelSelect}
                      trigger={
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group">
                          {/* Provider Icon */}
                          {selectedModelInfo && (
                            <div className={`p-1 rounded ${selectedModelInfo.tier === 'smart' ? 'bg-purple-100' : 'bg-blue-100'} flex-shrink-0`}>
                              <Sparkles className={`w-3 h-3 ${selectedModelInfo.tier === 'smart' ? 'text-purple-600' : 'text-blue-600'}`} />
                            </div>
                          )}

                          {/* Model Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-gray-900 truncate">
                                {selectedModelInfo?.displayName || 'Select Model'}
                              </span>
                              {selectedModelInfo?.badge && (
                                <span className="text-[10px] px-1 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                                  {selectedModelInfo.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                              <span>{selectedModelInfo?.provider || 'Provider'}</span>
                              {selectedModelInfo?.contextWindow && (
                                <>
                                  <span>•</span>
                                  <span>{(selectedModelInfo.contextWindow / 1000).toFixed(0)}K</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Settings Icon */}
                          <Settings2 className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                        </button>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Main Chat Area */}
              <div className="flex-1 overflow-hidden bg-gray-50">
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
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </AssistantRuntimeProvider>
    </>
  );
}
