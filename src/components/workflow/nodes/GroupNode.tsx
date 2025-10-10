import { memo } from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Folder, X, MessageSquare, ChevronDown, ChevronUp, Pencil, Check, Send, Loader2, Sparkles } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { buildChatContext } from '@/lib/workflow/context-builder';
import type { NodeProps } from '@xyflow/react';
import type { GroupNodeData, ChatMessage } from '@/types/workflow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Code block component for markdown
function CodeBlock({ inline, className, children }: any) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  if (inline) {
    return <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">{children}</code>;
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-gray-700">
      {language && (
        <div className="px-3 py-1 bg-[#1e1e1e] text-gray-400 text-[10px] font-mono border-b border-gray-700">
          {language.toUpperCase()}
        </div>
      )}
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{ margin: 0, fontSize: '11px', padding: '12px' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export const GroupNode = memo(({ id, data }: NodeProps<GroupNodeData>) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(data.label || 'Group');
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const workflow = useWorkflowStore((state) => state.workflow);
  const removeNodesFromGroup = useWorkflowStore((state) => state.removeNodesFromGroup);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const groupedNodes = workflow?.nodes.filter(n => data.groupedNodes?.includes(n.id)) || [];
  const isCollapsed = data.collapsed || false;
  const isChatEnabled = data.groupChatEnabled || false;
  const messages = data.groupChatMessages || [];

  // Auto-focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Auto-scroll chat messages
  useEffect(() => {
    if (isChatEnabled && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatEnabled]);

  // Handle mouse enter for drag feedback
  const handleMouseEnter = useCallback(() => {
    const isDragging = document.querySelector('.dragging-node');
    if (isDragging) {
      setIsDragOver(true);
      (window as any).__targetGroupId = id;
    }
  }, [id]);

  const handleMouseLeave = useCallback(() => {
    setIsDragOver(false);
    if ((window as any).__targetGroupId === id) {
      (window as any).__targetGroupId = null;
    }
  }, [id]);

  const removeNodeFromGroup = (nodeId: string) => {
    removeNodesFromGroup(id, [nodeId]);
  };

  const toggleCollapse = () => {
    updateNodeData(id, { collapsed: !isCollapsed } as Partial<GroupNodeData>);
  };

  const toggleChat = () => {
    updateNodeData(id, { groupChatEnabled: !isChatEnabled } as Partial<GroupNodeData>);
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    if (editedName.trim()) {
      updateNodeData(id, { label: editedName.trim() } as Partial<GroupNodeData>);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(data.label || 'Group');
      setIsEditingName(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoadingChat) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    updateNodeData(id, { groupChatMessages: updatedMessages } as Partial<GroupNodeData>);
    setChatInput('');
    setIsLoadingChat(true);

    // Create placeholder for streaming response
    const assistantMessageId = crypto.randomUUID();
    const streamingMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    updateNodeData(id, { groupChatMessages: [...updatedMessages, streamingMessage] } as Partial<GroupNodeData>);

    try {
      // Build context from ALL grouped nodes
      const context = workflow ? buildChatContext(id, workflow) : {
        textContext: [],
        youtubeTranscripts: [],
        voiceTranscripts: [],
        pdfDocuments: [],
        images: [],
        webpages: [],
        mindMaps: [],
        templates: [],
        groupChats: [],
      };

      // Add context from grouped nodes
      if (groupedNodes.length > 0) {
        const groupContext = groupedNodes.map(node => {
          const nodeType = node.type;
          const nodeData = node.data as any;

          // Extract relevant content based on node type
          if (nodeType === 'text' && nodeData.content) {
            return `[Text Node]: ${nodeData.content}`;
          } else if (nodeType === 'youtube' && nodeData.transcript) {
            return `[YouTube: ${nodeData.title || nodeData.url}]: ${nodeData.transcript}`;
          } else if (nodeType === 'voice' && nodeData.transcript) {
            return `[Voice Note]: ${nodeData.transcript}`;
          } else if (nodeType === 'pdf' && nodeData.parsedText) {
            return `[PDF: ${nodeData.fileName}]: ${nodeData.parsedText}`;
          } else if (nodeType === 'image' && nodeData.analysisData?.description) {
            return `[Image]: ${nodeData.analysisData.description}`;
          } else if (nodeType === 'webpage' && nodeData.pageContent) {
            return `[Webpage: ${nodeData.pageTitle}]: ${nodeData.pageContent}`;
          } else if (nodeType === 'mindmap' && nodeData.concept) {
            return `[Mind Map]: ${nodeData.concept}${nodeData.notes ? '\n' + nodeData.notes : ''}`;
          } else if (nodeType === 'template' && nodeData.generatedContent) {
            return `[Template]: ${nodeData.generatedContent}`;
          }
          return null;
        }).filter(Boolean).join('\n\n---\n\n');

        if (groupContext) {
          context.textContext.push({ content: `Group Context:\n${groupContext}` });
        }
      }

      // Add AI instructions if present
      if (data.aiInstructions) {
        context.textContext.push({ content: `AI Instructions: ${data.aiInstructions}` });
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...updatedMessages],
          context,
          model: 'gemini-2.5-flash',
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;

                  // Update streaming message
                  const currentMessages = [...updatedMessages, {
                    ...streamingMessage,
                    content: accumulatedContent,
                  }];
                  updateNodeData(id, { groupChatMessages: currentMessages } as Partial<GroupNodeData>);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      setIsLoadingChat(false);
    } catch (error) {
      console.error('Group chat error:', error);

      // Add error message
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toISOString(),
      };

      updateNodeData(id, {
        groupChatMessages: [...updatedMessages, errorMessage]
      } as Partial<GroupNodeData>);

      setIsLoadingChat(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative bg-transparent">
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] hover:!scale-125 !transition-all !duration-150"
        style={{ left: '-5px', top: '26px' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-[#9CA3AF] hover:!border-[#155EEF] hover:!scale-125 !transition-all !duration-150"
        style={{ right: '-5px', top: '26px' }}
      />

      <div
        className={`rounded-2xl overflow-hidden transition-all shadow-lg ${
          isDragOver
            ? 'border-[3px] border-[#155EEF] shadow-2xl'
            : 'border-2 border-[#4B5563]'
        } ${isCollapsed ? 'w-[320px]' : 'w-[720px]'}`}
        style={{ height: isCollapsed ? 'auto' : '540px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Modern Gradient Header */}
        <div className="bg-gradient-to-r from-[#4B5563] via-[#6B7280] to-[#4B5563] px-4 py-3 flex items-center gap-3">
          <Folder className="w-5 h-5 text-white flex-shrink-0" />

          {/* Editable Name */}
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="flex-1 bg-white/20 text-white text-[15px] font-medium px-2 py-1 rounded border-2 border-white/40 focus:outline-none focus:border-white"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              onClick={handleNameEdit}
              className="flex-1 text-left text-white text-[15px] font-medium hover:bg-white/10 px-2 py-1 rounded transition-all group flex items-center gap-2"
            >
              {data.label || 'Group'}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}

          {/* Statistics Badges */}
          <div className="flex items-center gap-2">
            {groupedNodes.length > 0 && (
              <span className="bg-white/20 text-white text-[11px] px-2 py-1 rounded-full font-medium">
                {groupedNodes.length} {groupedNodes.length === 1 ? 'node' : 'nodes'}
              </span>
            )}
            {isChatEnabled && messages.length > 0 && (
              <span className="bg-[#155EEF]/80 text-white text-[11px] px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {messages.length}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleChat}
              className={`p-1.5 rounded transition-all ${
                isChatEnabled
                  ? 'bg-[#155EEF] text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={isChatEnabled ? 'Disable Group Chat' : 'Enable Group Chat'}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded bg-white/10 text-white hover:bg-white/20 transition-all"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="relative bg-[#F7FAFC] h-[calc(100%-52px)] flex flex-col">
            {isChatEnabled ? (
              // Group Chat Interface
              <div className="flex flex-col h-full">
                {/* AI Instructions */}
                <div className="p-3 bg-white border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#155EEF]" />
                    <span className="text-[11px] font-medium text-[#4B5563]">AI Instructions</span>
                  </div>
                  <textarea
                    value={data.aiInstructions || ''}
                    onChange={(e) => updateNodeData(id, { aiInstructions: e.target.value } as Partial<GroupNodeData>)}
                    placeholder="Optional: Tell AI how to process this group..."
                    className="w-full text-[11px] text-[#2D3748] border border-[#E2E8F0] rounded px-2 py-1.5 resize-none focus:outline-none focus:border-[#155EEF]"
                    rows={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-[#E2E8F0] rounded-2xl flex items-center justify-center mb-3">
                        <MessageSquare className="w-8 h-8 text-[#A0AEC0]" />
                      </div>
                      <h3 className="text-[13px] font-medium text-[#2D3748] mb-1">
                        Group Chat Active
                      </h3>
                      <p className="text-[11px] text-[#718096] max-w-sm">
                        Chat with AI about all {groupedNodes.length} grouped nodes
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 ${
                            msg.role === 'user'
                              ? 'bg-[#155EEF] text-white'
                              : 'bg-white border border-[#E2E8F0] text-[#2D3748]'
                          }`}
                        >
                          <div className="text-[11px] prose prose-sm max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code: CodeBlock,
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="ml-4 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="ml-4 mb-2">{children}</ol>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-white border-t border-[#E2E8F0]">
                  <div className="flex gap-2">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      placeholder="Ask about the grouped content..."
                      className="flex-1 text-[12px] text-[#2D3748] border border-[#E2E8F0] rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#155EEF]"
                      rows={2}
                      disabled={isLoadingChat}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoadingChat || !chatInput.trim()}
                      className="px-4 bg-[#155EEF] text-white rounded-lg hover:bg-[#1148CC] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                    >
                      {isLoadingChat ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Grouped Nodes Display
              <div className="p-6 overflow-y-auto h-full">
                {groupedNodes.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {groupedNodes.map(node => (
                      <div
                        key={node.id}
                        className="bg-white rounded-lg border border-[#E2E8F0] p-4 h-fit group hover:border-[#CBD5E0] transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#14B8A6] rounded-full"></div>
                            <span className="text-[13px] font-medium text-[#2D3748] capitalize">
                              {node.type}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNodeFromGroup(node.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#FEE2E2] rounded"
                          >
                            <X className="w-3.5 h-3.5 text-[#EF4444]" />
                          </button>
                        </div>
                        <div className="text-[11px] text-[#718096] truncate">
                          ID: {node.id.slice(0, 8)}...
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 bg-[#E2E8F0] rounded-2xl flex items-center justify-center mb-4">
                      <Folder className="w-10 h-10 text-[#A0AEC0]" />
                    </div>
                    <h3 className="text-[15px] font-medium text-[#2D3748] mb-2">
                      No nodes in group
                    </h3>
                    <p className="text-[13px] text-[#718096] max-w-sm">
                      Drag and drop nodes here to organize them into a group
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
