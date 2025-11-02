import { memo } from 'react';
import { MessageSquare, Copy, Check, Maximize2, User, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { SyntheticEvent, WheelEvent as ReactWheelEvent, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { buildChatContext, getLinkedNodeIds } from '@/lib/workflow/context-builder';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { ChatNodeData, ChatMessage, ChatSession, NodeStyle } from '@/types/workflow';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { OnResize, OnResizeEnd } from '@xyflow/system';
import { VoiceInputBar } from '../VoiceInputBar';
import { ModelSelectionDialog } from '../ModelSelectionDialog';
import { getModelDisplayName, getProviderForModel, getProviderInfo, PROVIDERS } from '@/lib/models/model-registry';
import { OpenAI, Gemini, Anthropic, DeepSeek } from '@lobehub/icons';
import 'katex/dist/katex.min.css';

type ChatNodeProps = NodeProps<ChatNodeData>;

const CHAT_NODE_DEFAULT_WIDTH = 1100;
const CHAT_NODE_DEFAULT_HEIGHT = 700;
const CHAT_NODE_MIN_WIDTH = 760;
const CHAT_NODE_MIN_HEIGHT = 520;
const CHAT_NODE_MAX_WIDTH = 2000;
const CHAT_NODE_MAX_HEIGHT = 1600;

// Provider icon mapping
const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  OpenAI: OpenAI,
  Google: Gemini,
  Anthropic: Anthropic,
  DeepSeek: DeepSeek,
};

const parseDimension = (value: number | string | undefined): number | undefined => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  return undefined;
};

// Code block component with syntax highlighting and copy button
function CodeBlock({ inline, className, children }: { inline?: boolean; className?: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-gray-100 px-2 py-1 rounded text-[12px] font-mono select-text" style={{ userSelect: 'text' }}>
        {children}
      </code>
    );
  }

  return (
    <span className="block">
      <span className="relative group block my-4">
        <span className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-all shadow-lg"
            title="Copy code"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </span>
        {language ? (
          <span className="block rounded-xl overflow-hidden border border-gray-700 shadow-sm">
            <span className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] text-gray-400 text-[11px] font-mono border-b border-gray-700">
              <span className="uppercase tracking-wider">{language}</span>
            </span>
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '12px',
                padding: '16px',
                userSelect: 'text',
              }}
              showLineNumbers={code.split('\n').length > 3}
              codeTagProps={{ style: { userSelect: 'text' } }}
            >
              {code}
            </SyntaxHighlighter>
          </span>
        ) : (
          <code className="block bg-[#1e1e1e] text-gray-300 p-4 rounded-xl text-[12px] font-mono overflow-x-auto border border-gray-700 select-text" style={{ userSelect: 'text' }}>
            {children}
          </code>
        )}
      </span>
    </span>
  );
}

export const ChatNode = memo(({
  id,
  data,
  parentId,
  width: nodeWidth,
  height: nodeHeight,
  style: nodeStyle,
}: ChatNodeProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [, setIsMaximized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(data.model || 'google/gemini-2.5-flash');
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const workflow = useWorkflowStore((state) => state.workflow);
  const isActive = useWorkflowStore((state) => state.activeNodeId === id);
  const storedStyle = useWorkflowStore((state) => {
    const node = state.workflow?.nodes.find((n) => n.id === id);
    return node?.style;
  });
  const { user } = useCurrentUser();

  // Sync selectedModel with data.model
  useEffect(() => {
    if (data.model && data.model !== selectedModel) {
      setSelectedModel(data.model);
    }
  }, [data.model, selectedModel]);

  const storedWidth = parseDimension(storedStyle?.width);
  const storedHeight = parseDimension(storedStyle?.height);
  const styleWidth = parseDimension(nodeStyle?.width as number | string | undefined);
  const styleHeight = parseDimension(nodeStyle?.height as number | string | undefined);
  const effectiveWidth = Math.max(
    CHAT_NODE_MIN_WIDTH,
    storedWidth ?? styleWidth ?? nodeWidth ?? CHAT_NODE_DEFAULT_WIDTH,
  );
  const effectiveHeight = Math.max(
    CHAT_NODE_MIN_HEIGHT,
    storedHeight ?? styleHeight ?? nodeHeight ?? CHAT_NODE_DEFAULT_HEIGHT,
  );

  // Initialize sessions if not present (migration from old format)
  useEffect(() => {
    if (!data.sessions) {
      // Migrate old format to new sessions format
      const initialSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: data.messages || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'gemini-flash-latest',
      };
      updateNodeData(id, {
        sessions: [initialSession],
        currentSessionId: initialSession.id,
      } as Partial<ChatNodeData>);
    }
  }, [data.messages, data.sessions, id, updateNodeData]);

  // Get current session
  const currentSession = data.sessions?.find(s => s.id === data.currentSessionId) || data.sessions?.[0];
  const messages = currentSession?.messages || [];

  // Get display name from user metadata or email
  const getUserDisplayName = () => {
    if (!user) return 'You';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'You';
  };

  type NativeEventWithStop = Event & { stopImmediatePropagation?: () => void };

  const stopReactFlowPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
    (event.nativeEvent as NativeEventWithStop).stopImmediatePropagation?.();
  }, []);

  const handleWheelEvent = useCallback(
    (event: ReactWheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return;
      }

      stopReactFlowPropagation(event);
    },
    [stopReactFlowPropagation],
  );

  useEffect(() => {
    const state = useWorkflowStore.getState();
    const currentNode = state.workflow?.nodes.find((n) => n.id === id);
    if (!currentNode) {
      return;
    }

    const width = parseDimension(currentNode.style?.width);
    const height = parseDimension(currentNode.style?.height);
    const nextStyle: NodeStyle = { ...(currentNode.style ?? {}) };
    let changed = false;

    if (width === undefined) {
      nextStyle.width = CHAT_NODE_DEFAULT_WIDTH;
      changed = true;
    }

    if (height === undefined) {
      nextStyle.height = CHAT_NODE_DEFAULT_HEIGHT;
      changed = true;
    }

    if (changed) {
      updateNode(id, { style: nextStyle });
    }
  }, [id, updateNode]);

  const updateDimensions = useCallback(
    (width: number, height: number) => {
      const clampedWidth = Math.min(
        CHAT_NODE_MAX_WIDTH,
        Math.max(CHAT_NODE_MIN_WIDTH, width),
      );
      const clampedHeight = Math.min(
        CHAT_NODE_MAX_HEIGHT,
        Math.max(CHAT_NODE_MIN_HEIGHT, height),
      );

      const state = useWorkflowStore.getState();
      const currentNode = state.workflow?.nodes.find((n) => n.id === id);
      if (!currentNode) {
        return;
      }

      const prevWidth = parseDimension(currentNode.style?.width);
      const prevHeight = parseDimension(currentNode.style?.height);
      if (prevWidth === clampedWidth && prevHeight === clampedHeight) {
        return;
      }

      const nextStyle: NodeStyle = {
        ...(currentNode.style ?? {}),
        width: clampedWidth,
        height: clampedHeight,
      };

      updateNode(id, { style: nextStyle });
    },
    [id, updateNode],
  );

  const handleResize = useCallback<OnResize>((_, params) => {
    updateDimensions(params.width, params.height);
  }, [updateDimensions]);

  const handleResizeEnd = useCallback<OnResizeEnd>((_, params) => {
    updateDimensions(params.width, params.height);
  }, [updateDimensions]);

  const handleVisibilityClass = isActive
    ? '!opacity-100'
    : 'group-hover:!opacity-100 group-focus-within:!opacity-100';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if user is near bottom of scroll container
  const isNearBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  const handleScroll = () => {
    setShouldAutoScroll(isNearBottom());
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll) {
      setTimeout(scrollToBottom, 50);
    }
  }, [messages.length, shouldAutoScroll]);

  // Update linked nodes when workflow changes
  useEffect(() => {
    if (workflow) {
      const linkedNodeIds = getLinkedNodeIds(id, workflow);
      if (JSON.stringify(linkedNodeIds) !== JSON.stringify(data.linkedNodes)) {
        updateNodeData(id, { linkedNodes: linkedNodeIds } as Partial<ChatNodeData>);
      }
    }
  }, [workflow, id, data.linkedNodes, updateNodeData]);

  // Create new chat session
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: selectedModel,
    };

    const updatedSessions = [...(data.sessions || []), newSession];
    updateNodeData(id, {
      sessions: updatedSessions,
      currentSessionId: newSession.id,
    } as Partial<ChatNodeData>);
  };

  // Switch to a different chat session
  const switchSession = (sessionId: string) => {
    updateNodeData(id, {
      currentSessionId: sessionId,
    } as Partial<ChatNodeData>);
  };

  // Delete a chat session
  const deleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const updatedSessions = (data.sessions || []).filter(s => s.id !== sessionId);

    // If deleting current session, switch to another or create new
    let newCurrentId = data.currentSessionId;
    if (sessionId === data.currentSessionId) {
      newCurrentId = updatedSessions[0]?.id;
      if (!newCurrentId) {
        // Create a new session if none left
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          model: 'gemini-flash-latest',
        };
        updatedSessions.push(newSession);
        newCurrentId = newSession.id;
      }
    }

    updateNodeData(id, {
      sessions: updatedSessions,
      currentSessionId: newCurrentId,
    } as Partial<ChatNodeData>);
  };

  // Copy message content to clipboard
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  // Generate AI-powered chat title from user message
  const generateChatTitle = async (userMessage: string, sessionId: string) => {
    try {
      const response = await fetch('/api/chat/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        console.error('Failed to generate title');
        return;
      }

      const { title } = await response.json();

      // Get fresh data from the store to avoid overwriting messages
      const currentWorkflow = useWorkflowStore.getState().workflow;
      const currentNode = currentWorkflow?.nodes.find(n => n.id === id);
      const currentData = currentNode?.data as ChatNodeData;

      if (!currentData?.sessions) return;

      // Update session title with fresh data
      const updatedSessions = currentData.sessions.map(session =>
        session.id === sessionId
          ? { ...session, title }
          : session
      );
      updateNodeData(id, { sessions: updatedSessions } as Partial<ChatNodeData>);
    } catch (error) {
      console.error('Error generating title:', error);
      // Silently fail - keep the temporary title
    }
  };

  // Handle model selection
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);

    // Determine provider
    const provider = modelId.includes('/') ? 'openrouter' : 'gemini';

    // Update node data
    updateNodeData(id, {
      model: modelId,
      provider,
    } as Partial<ChatNodeData>);

    // Update current session model if exists
    if (currentSession && data.sessions) {
      const updatedSessions = data.sessions.map(session =>
        session.id === currentSession.id
          ? { ...session, model: modelId, provider }
          : session
      );
      updateNodeData(id, { sessions: updatedSessions } as Partial<ChatNodeData>);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSession) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...currentSession.messages, userMessage];
    const isFirstMessage = currentSession.messages.length === 0;
    const userMessageContent = input.trim();

    // Update current session with new message
    const updatedSessions = (data.sessions || []).map(session =>
      session.id === currentSession.id
        ? {
            ...session,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          }
        : session
    );

    updateNodeData(id, { sessions: updatedSessions } as Partial<ChatNodeData>);
    setInput('');
    setIsLoading(true);
    setShouldAutoScroll(true);

    // Create placeholder for streaming response
    const assistantMessageId = crypto.randomUUID();
    const streamingMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    // Add empty assistant message immediately for streaming
    const messagesWithStreaming = [...updatedMessages, streamingMessage];
    const sessionsWithStreaming = updatedSessions.map(session =>
      session.id === currentSession.id
        ? { ...session, messages: messagesWithStreaming }
        : session
    );
    updateNodeData(id, { sessions: sessionsWithStreaming } as Partial<ChatNodeData>);

    try {
      // Build context from linked nodes
      const context = workflow ? buildChatContext(id, workflow) : {
        textContext: [],
        youtubeTranscripts: [],
        voiceTranscripts: [],
        pdfDocuments: [],
        images: [],
        webpages: [],
        instagramReels: [],
        linkedInPosts: [],
        mindMaps: [],
        templates: [],
      };

      // Determine provider based on model
      const provider = selectedModel.includes('/') ? 'openrouter' : 'gemini';

      // Call the chat API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel,
          provider,
          textContext: context.textContext,
          youtubeTranscripts: context.youtubeTranscripts,
          voiceTranscripts: context.voiceTranscripts,
          pdfDocuments: context.pdfDocuments,
          images: context.images,
          webpages: context.webpages,
          instagramReels: context.instagramReels,
          linkedInPosts: context.linkedInPosts,
          mindMaps: context.mindMaps,
          templates: context.templates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.done) {
                  fullContent = parsed.content;
                } else {
                  fullContent += parsed.content;
                  // Update message in real-time
                  const currentMessages = [...updatedMessages, { ...streamingMessage, content: fullContent }];
                  const currentSessions = (data.sessions || []).map(session =>
                    session.id === currentSession.id
                      ? { ...session, messages: currentMessages }
                      : session
                  );
                  updateNodeData(id, { sessions: currentSessions } as Partial<ChatNodeData>);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Final update with complete message
      const aiResponse: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiResponse];
      const finalSessions = (data.sessions || []).map(session =>
        session.id === currentSession.id
          ? { ...session, messages: finalMessages, updatedAt: new Date().toISOString() }
          : session
      );
      updateNodeData(id, { sessions: finalSessions } as Partial<ChatNodeData>);

      // Generate AI title for first message
      if (isFirstMessage) {
        generateChatTitle(userMessageContent, currentSession.id);
      }
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessageText = error instanceof Error ? error.message : String(error);

      // Show error message in chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorMessageText || 'Failed to get response. Make sure GEMINI_API_KEY is set in .env.local'}`,
        timestamp: new Date().toISOString(),
      };

      const errorMessages = [...updatedMessages, errorMessage];
      const errorSessions = (data.sessions || []).map(session =>
        session.id === currentSession.id
          ? { ...session, messages: errorMessages }
          : session
      );
      updateNodeData(id, { sessions: errorSessions } as Partial<ChatNodeData>);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="group relative"
      style={{ width: effectiveWidth, height: effectiveHeight }}
    >
      <NodeResizer
        nodeId={id}
        minWidth={CHAT_NODE_MIN_WIDTH}
        minHeight={CHAT_NODE_MIN_HEIGHT}
        maxWidth={CHAT_NODE_MAX_WIDTH}
        maxHeight={CHAT_NODE_MAX_HEIGHT}
        color="transparent"
        handleClassName={`!w-3 !h-3 !border-2 !border-primary !bg-white !rounded-full !opacity-0 ${handleVisibilityClass} data-[resizing=true]:!opacity-100 !transition-opacity`}
        lineClassName="!hidden"
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />
      <BaseNode
        id={id}
        allowOverflow={true}
        showSourceHandle={false}
        showTargetHandle={true}
        parentId={parentId}
        className="h-full w-full bg-transparent !border-0 !shadow-none"
        contentClassName="p-0 h-full"
        contentStyle={{ height: '100%' }}
        style={{ width: '100%', height: '100%' }}
      >
        <div
          className="flex h-full w-full border-2 border-[#095D40]/20 rounded-2xl overflow-hidden bg-white shadow-sm"
          onWheel={handleWheelEvent}
          onWheelCapture={handleWheelEvent}
        >
          {/* Left Sidebar */}
          <div className="nodrag w-[280px] border-r border-[#095D40]/20 flex flex-col bg-[#095D40]/5">
            {/* Connected Data Section */}
            <div className="p-4 border-b border-[#095D40]/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-semibold text-[#095D40] uppercase tracking-wide">
                  Connected Data ({data.linkedNodes?.length || 0})
                </h3>
              </div>
              {data.linkedNodes && data.linkedNodes.length > 0 ? (
                <div className="text-[11px] text-[#095D40]/80 px-2 py-1.5 bg-white border border-[#095D40]/20 rounded">
                  {data.linkedNodes.length} {data.linkedNodes.length === 1 ? 'node' : 'nodes'} connected
                </div>
              ) : (
                <p className="text-[11px] text-[#095D40]/60">No data connected</p>
              )}
            </div>

            {/* Chats Section */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[12px] font-semibold text-[#095D40] uppercase tracking-wide">
                    Chats ({data.sessions?.length || 0})
                  </h3>
                </div>
                <button
                  onClick={(e) => {
                    stopReactFlowPropagation(e);
                    createNewChat();
                  }}
                  onMouseDown={(e) => stopReactFlowPropagation(e)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#095D40] hover:bg-[#074830] border-0 rounded-lg transition-colors text-[12px] font-medium text-white"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </button>
              </div>

              {/* Chat List */}
              <div
                className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5"
                onWheel={handleWheelEvent}
                onMouseDown={(e) => stopReactFlowPropagation(e)}
              >
                {data.sessions && data.sessions.length > 0 ? (
                  data.sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={(e) => {
                        stopReactFlowPropagation(e);
                        switchSession(session.id);
                      }}
                      onMouseDown={(e) => stopReactFlowPropagation(e)}
                      className={`group p-3 rounded-lg cursor-pointer transition-all ${
                        session.id === currentSession?.id
                          ? 'bg-[#095D40] text-white shadow-sm'
                          : 'bg-white border border-[#095D40]/20 hover:bg-[#095D40]/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-medium truncate ${
                            session.id === currentSession?.id ? 'text-white' : 'text-[#095D40]'
                          }`}>
                            {session.title}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          onMouseDown={(e) => stopReactFlowPropagation(e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#FF3B30]/10 rounded transition-all"
                          title="Delete chat"
                        >
                          <Trash2 className={`h-3.5 w-3.5 ${
                            session.id === currentSession?.id ? 'text-white/80' : 'text-[#FF3B30]'
                          }`} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-[#095D40]/60 text-center py-8">No chats yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#095D40]/20">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-[#095D40]" />
                <h3 className="text-[14px] font-semibold text-[#095D40]">
                  {currentSession?.title || 'Chat'}
                </h3>
              </div>
              <button
                onClick={(e) => {
                  stopReactFlowPropagation(e);
                  setIsMaximized(true);
                }}
                onMouseDown={(e) => stopReactFlowPropagation(e)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Maximize chat"
              >
                <Maximize2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </button>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onWheel={handleWheelEvent}
              onWheelCapture={handleWheelEvent}
              data-lenis-prevent
              className="nodrag flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-card"
              style={{ overscrollBehavior: 'contain', userSelect: 'text' }}
            >
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div key={message.id} className="max-w-[90%]">
                    <div className="flex items-center gap-2 mb-1.5">
                      {message.role === 'assistant' ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <span className="text-[10px] font-medium text-muted-foreground tracking-wide">AI</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-medium text-muted-foreground tracking-wide">{getUserDisplayName()}</span>
                        </div>
                      )}
                    </div>
                    <div
                      className={`group nodrag p-4 rounded-lg text-[13px] leading-[1.6] select-text cursor-text ${
                        message.role === 'user'
                          ? 'bg-muted text-foreground border border-border'
                          : 'bg-card text-foreground border border-border'
                      }`}
                      style={{ userSelect: 'text' }}
                      onMouseDown={(e) => {
                        // Stop propagation to prevent ReactFlow from capturing drag events
                        e.stopPropagation();
                      }}
                    >
                      <div className="prose prose-sm max-w-none select-text" style={{ userSelect: 'text' }}>
                        {message.content === '' && isLoading ? (
                          <div className="flex items-center gap-2 py-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              code: (props) => <CodeBlock {...props} />,
                              pre: ({ children }) => <>{children}</>,
                              p: ({ children }) => <p className="text-[13px] mb-3 last:mb-0 select-text" style={{ userSelect: 'text' }}>{children}</p>,
                              h1: ({ children }) => <h1 className="text-[18px] font-bold mb-4 mt-5 first:mt-0 leading-[1.4] select-text" style={{ userSelect: 'text' }}>{children}</h1>,
                              h2: ({ children }) => <h2 className="text-[16px] font-bold mb-3 mt-4 first:mt-0 leading-[1.4] select-text" style={{ userSelect: 'text' }}>{children}</h2>,
                              h3: ({ children }) => <h3 className="text-[15px] font-semibold mb-3 mt-4 first:mt-0 leading-[1.4] select-text" style={{ userSelect: 'text' }}>{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-2 text-[13px] select-text" style={{ userSelect: 'text' }}>{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal ml-5 mb-4 space-y-2 text-[13px] select-text" style={{ userSelect: 'text' }}>{children}</ol>,
                              li: ({ children }) => <li className="leading-[1.6] text-[13px] select-text" style={{ userSelect: 'text' }}>{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-[13px] select-text" style={{ userSelect: 'text' }}>{children}</strong>,
                              em: ({ children }) => <em className="italic text-[13px] select-text" style={{ userSelect: 'text' }}>{children}</em>,
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[13px] text-primary hover:underline select-text"
                                  style={{ userSelect: 'text' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {children}
                                </a>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 text-[13px] border-border bg-muted pl-4 py-3 my-4 italic rounded-r leading-[1.6] select-text" style={{ userSelect: 'text' }}>
                                  {children}
                                </blockquote>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-4 select-text" style={{ userSelect: 'text' }}>
                                  <table className="min-w-full text-[13px] border-collapse">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                              th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-semibold text-[13px] select-text" style={{ userSelect: 'text' }}>{children}</th>,
                              td: ({ children }) => <td className="border border-border px-3 py-2 text-[13px] select-text" style={{ userSelect: 'text' }}>{children}</td>,
                              hr: () => <hr className="my-4 border-t border-border" />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        )}
                      </div>

                      {/* Copy button */}
                      <div className="flex justify-start mt-2 pt-2 border-t border-border">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyMessage(message.id, message.content);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                          title="Copy message"
                        >
                          {copiedMessageId === message.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium text-primary">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-16 w-16 text-border mb-4" />
                  <p className="text-[13px] text-muted-foreground">Start a conversation</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="nodrag px-6 py-4 border-t border-[#095D40]/20 bg-[#095D40]/5">
              <div className="flex items-center gap-3 mb-3">
                {/* Model Selector with Provider Branding */}
                <button
                  onClick={(e) => {
                    stopReactFlowPropagation(e);
                    setModelDialogOpen(true);
                  }}
                  onMouseDown={(e) => stopReactFlowPropagation(e)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-[#095D40]/20 hover:border-[#095D40]/50 transition-colors text-[11px] font-medium cursor-pointer"
                >
                  {(() => {
                    const providerId = getProviderForModel(selectedModel);
                    const provider = getProviderInfo(providerId);
                    const ProviderIcon = provider ? PROVIDER_ICONS[provider.iconName] : null;

                    return (
                      <>
                        {ProviderIcon && (
                          <ProviderIcon
                            className="w-3.5 h-3.5"
                            style={{ color: provider?.colors.primary }}
                          />
                        )}
                        <span className="text-[#095D40]">
                          {getModelDisplayName(selectedModel)}
                        </span>
                        <ChevronDown className="w-3 h-3 text-[#095D40]/60" />
                      </>
                    );
                  })()}
                </button>
              </div>

              <div onMouseDown={(e) => stopReactFlowPropagation(e)}>
                <VoiceInputBar
                  value={input}
                  onChange={setInput}
                  onSend={handleSend}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  voiceMode="replace"
                  showAddButton={false}
                  showRecordingHint={false}
                />
              </div>
            </div>
          </div>
        </div>
      </BaseNode>

      {/* Model Selection Dialog */}
      <ModelSelectionDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        currentModel={selectedModel}
        onSelectModel={handleModelChange}
      />
    </div>
  );
});

ChatNode.displayName = 'ChatNode';
