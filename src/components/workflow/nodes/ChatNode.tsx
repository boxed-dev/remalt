import { memo, useMemo, useLayoutEffect } from 'react';
import { MessageSquare, Copy, Check, Maximize2, X, User, Plus, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { SyntheticEvent, WheelEvent as ReactWheelEvent, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { buildChatContext, getLinkedNodeIds } from '@/lib/workflow/context-builder';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { ChatNodeData, ChatMessage, ChatSession, NodeStyle } from '@/types/workflow';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { OnResize, OnResizeEnd } from '@xyflow/system';
import { VoiceInputBar } from '../VoiceInputBar';
import { ModelSelectionDialog } from '../ModelSelectionDialog';
import { normalizeLegacyModel } from '@/lib/models/model-registry';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import 'katex/dist/katex.min.css';

type ChatNodeProps = NodeProps<ChatNodeData>;

const CHAT_NODE_DEFAULT_WIDTH = 1100;
const CHAT_NODE_DEFAULT_HEIGHT = 700;
const CHAT_NODE_MIN_WIDTH = 760;
const CHAT_NODE_MIN_HEIGHT = 520;
const CHAT_NODE_MAX_WIDTH = 2000;
const CHAT_NODE_MAX_HEIGHT = 1600;
const DEFAULT_CHAT_MODEL = 'google/gemini-2.5-flash-preview-09-2025';

const resolveModelConfig = (rawModel?: string) => {
  const canonicalModel = normalizeLegacyModel(rawModel || DEFAULT_CHAT_MODEL);
  const provider = canonicalModel.includes('/') ? 'openrouter' : 'gemini';
  return { canonicalModel, provider };
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

// Code block component with syntax highlighting and copy button - Memoized for performance
const CodeBlock = memo(({ inline, className, children }: { inline?: boolean; className?: string; children: ReactNode }) => {
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
});

CodeBlock.displayName = 'CodeBlock';

// Memoized message component for better performance with markdown rendering
const MessageBubble = memo(({ 
  message, 
  isLoading, 
  copiedMessageId, 
  getUserDisplayName,
  handleCopyMessage
}: {
  message: ChatMessage;
  isLoading: boolean;
  copiedMessageId: string | null;
  getUserDisplayName: () => string;
  handleCopyMessage: (messageId: string, content: string) => Promise<void>;
}) => {
  // Memoize markdown rendering based on message content
  const markdownContent = useMemo(() => {
    if (message.content === '' && isLoading) {
      return (
        <div className="flex items-center gap-2 py-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      );
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: (props) => <CodeBlock {...props} />,
          pre: ({ children }) => <>{children}</>,
          p: ({ children }) => <p className="text-[13px] mb-3 last:mb-0 select-text break-words" style={{ userSelect: 'text', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{children}</p>,
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
    );
  }, [message.content, isLoading]);

  return (
    <div className="group/message max-w-[85%] mb-1 min-w-0">
      {/* Role indicator - more subtle */}
      <div className="flex items-center gap-1.5 mb-1.5 ml-1">
        {message.role === 'assistant' ? (
          <>
            <div className="w-1 h-1 bg-primary rounded-full"></div>
            <span className="text-[10px] font-medium text-muted-foreground">Remic AI</span>
          </>
        ) : (
          <>
            <User className="w-2.5 h-2.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">{getUserDisplayName()}</span>
          </>
        )}
      </div>

      {/* Message bubble - borderless, modern design */}
      <div className="relative">
        <div
          className={`px-3 py-2.5 rounded-xl text-[13px] leading-[1.6] select-text cursor-text transition-colors break-words ${
            message.role === 'user'
              ? 'bg-muted text-foreground'
              : 'bg-background text-foreground border border-border/60'
          }`}
          style={{ userSelect: 'text', wordBreak: 'break-word', overflowWrap: 'break-word' }}
        >
          <div className="prose prose-sm max-w-none select-text break-words" style={{ userSelect: 'text', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            {markdownContent}
          </div>
        </div>

        {/* Copy button - floating style */}
        <Button
          variant="secondary"
          size="sm"
          className={`absolute -bottom-2 right-2 h-6 px-2 text-[10px] gap-1 border-border/60 shadow-sm transition-opacity opacity-0 group-hover/message:opacity-100 ${
            copiedMessageId === message.id ? 'text-primary' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleCopyMessage(message.id, message.content);
          }}
        >
          {copiedMessageId === message.id ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copiedMessageId === message.id ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

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
  const [isMaximized, setIsMaximized] = useState(false);
  const initialModelConfig = resolveModelConfig(data.model);
  const [selectedModel, setSelectedModel] = useState<string>(initialModelConfig.canonicalModel);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const nodeScrollContainerRef = useRef<HTMLDivElement>(null);
  const dialogScrollContainerRef = useRef<HTMLDivElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const workflow = useWorkflowStore((state) => state.workflow);
  const isActive = useWorkflowStore((state) => state.activeNodeId === id);
  const storedStyle = useWorkflowStore((state) => {
    const node = state.workflow?.nodes.find((n) => n.id === id);
    return node?.style;
  });
  const { user } = useCurrentUser();

  // Normalize node-level model/provider metadata
  useEffect(() => {
    const { canonicalModel, provider } = resolveModelConfig(data.model);
    if (data.model !== canonicalModel || data.provider !== provider) {
      updateNodeData(id, {
        model: canonicalModel,
        provider,
      } as Partial<ChatNodeData>);
    }

    if (canonicalModel !== selectedModel) {
      setSelectedModel(canonicalModel);
    }
  }, [data.model, data.provider, id, selectedModel, updateNodeData]);

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
      const { canonicalModel, provider } = resolveModelConfig(data.model || selectedModel);

      const initialSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: data.messages || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: canonicalModel,
        provider,
      };

      updateNodeData(id, {
        sessions: [initialSession],
        currentSessionId: initialSession.id,
        model: canonicalModel,
        provider,
      } as Partial<ChatNodeData>);
    }
  }, [data.messages, data.model, data.sessions, id, selectedModel, updateNodeData]);

  // Get current session
  const currentSession = data.sessions?.find(s => s.id === data.currentSessionId) || data.sessions?.[0];
  const messages = currentSession?.messages || [];

  // Get display name from user metadata or email
  const getUserDisplayName = () => {
    if (!user) return 'You';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'You';
  };

  // Setup virtual scrolling for messages - use appropriate ref based on mode
  const nodeVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => nodeScrollContainerRef.current,
    estimateSize: () => 96,
    overscan: 12,
  });

  const dialogVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => dialogScrollContainerRef.current,
    estimateSize: () => 96,
    overscan: 12,
  });

  type NativeEventWithStop = Event & { stopImmediatePropagation?: () => void };

  const stopReactFlowPropagation = useCallback((event: SyntheticEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const interactive = target.closest(
      'button, a, input, textarea, select, [contenteditable="true"], [data-flowy-interactive="true"]'
    );

    if (!interactive) {
      return;
    }

    event.stopPropagation();
    (event.nativeEvent as NativeEventWithStop).stopImmediatePropagation?.();
  }, []);

  const handleWheelEvent = useCallback(
    (event: ReactWheelEvent) => {
      if (!isActive) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const scrollable = target?.closest<HTMLElement>('.flowy-scrollable');
      if (!scrollable) {
        return;
      }

      event.stopPropagation();
      (event.nativeEvent as NativeEventWithStop).stopImmediatePropagation?.();
    },
    [isActive],
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

  // Check if user is near bottom of scroll container
  const isNearBottom = () => {
    const container = isMaximized ? dialogScrollContainerRef.current : nodeScrollContainerRef.current;
    if (!container) return true;
    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  const handleScroll = () => {
    setShouldAutoScroll(isNearBottom());
  };

  // Auto-scroll when new messages arrive - useLayoutEffect for synchronous updates
  useLayoutEffect(() => {
    const container = isMaximized ? dialogScrollContainerRef.current : nodeScrollContainerRef.current;
    if (shouldAutoScroll && container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length, shouldAutoScroll, messages, isMaximized]);

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
    const { canonicalModel, provider } = resolveModelConfig(selectedModel);
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: canonicalModel,
      provider,
    };

    const updatedSessions = [...(data.sessions || []), newSession];
    updateNodeData(id, {
      sessions: updatedSessions,
      currentSessionId: newSession.id,
      model: canonicalModel,
      provider,
    } as Partial<ChatNodeData>);

    setSelectedModel(canonicalModel);
  };

  // Switch to a different chat session
  const switchSession = (sessionId: string) => {
    const sessions = data.sessions || [];
    const targetSession = sessions.find((session) => session.id === sessionId);

    if (!targetSession) {
      updateNodeData(id, {
        currentSessionId: sessionId,
      } as Partial<ChatNodeData>);
      return;
    }

    const { canonicalModel, provider } = resolveModelConfig(targetSession.model);
    const requiresSessionUpdate =
      targetSession.model !== canonicalModel || targetSession.provider !== provider;

    const payload: Partial<ChatNodeData> = {
      currentSessionId: sessionId,
      model: canonicalModel,
      provider,
    };

    if (requiresSessionUpdate) {
      payload.sessions = sessions.map((session) =>
        session.id === sessionId ? { ...session, model: canonicalModel, provider } : session,
      );
    }

    updateNodeData(id, payload as Partial<ChatNodeData>);
    setSelectedModel(canonicalModel);
  };

  // Delete a chat session
  const deleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const sessions = data.sessions || [];
    let remainingSessions = sessions.filter((s) => s.id !== sessionId);

    let nextCurrentId = data.currentSessionId;
    let targetSession = remainingSessions.find((s) => s.id === nextCurrentId);

    if (sessionId === data.currentSessionId) {
      nextCurrentId = remainingSessions[0]?.id;
      targetSession = remainingSessions.find((s) => s.id === nextCurrentId);

      if (!targetSession) {
        const { canonicalModel, provider } = resolveModelConfig(selectedModel);
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          model: canonicalModel,
          provider,
        };

        remainingSessions = [...remainingSessions, newSession];
        nextCurrentId = newSession.id;
        targetSession = newSession;
      }
    }

    if (!targetSession && remainingSessions.length > 0) {
      targetSession = remainingSessions[0];
      nextCurrentId = targetSession.id;
    }

    const { canonicalModel, provider } = resolveModelConfig(targetSession?.model || selectedModel);

    const normalizedSessions = remainingSessions.map((session) => {
      if (session.id !== targetSession?.id) {
        return session;
      }
      const sessionConfig = resolveModelConfig(session.model);
      if (
        session.model === sessionConfig.canonicalModel &&
        session.provider === sessionConfig.provider
      ) {
        return session;
      }
      return { ...session, model: sessionConfig.canonicalModel, provider: sessionConfig.provider };
    });

    updateNodeData(id, {
      sessions: normalizedSessions,
      currentSessionId: nextCurrentId,
      model: canonicalModel,
      provider,
    } as Partial<ChatNodeData>);

    setSelectedModel(canonicalModel);
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
    const { canonicalModel, provider } = resolveModelConfig(modelId);
    setSelectedModel(canonicalModel);

    updateNodeData(id, {
      model: canonicalModel,
      provider,
    } as Partial<ChatNodeData>);

    if (currentSession && data.sessions) {
      const updatedSessions = data.sessions.map(session =>
        session.id === currentSession.id
          ? { ...session, model: canonicalModel, provider }
          : session
      );
      updateNodeData(id, { sessions: updatedSessions } as Partial<ChatNodeData>);
    }
  };

  // Helper function to send a message directly with custom content
  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading || !currentSession) return;

    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...currentSession.messages, userMessage];
    const isFirstMessage = currentSession.messages.length === 0;
    const userMessageContent = messageContent.trim();

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
      const { provider } = resolveModelConfig(selectedModel);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSession) return;

    const messageContent = input;
    setInput(''); // Clear input immediately
    await sendMessage(messageContent);
  };

  const renderMessageList = (
    virtualizer: ReturnType<typeof useVirtualizer> | null,
    useVirtualization: boolean
  ) => {
    if (!messages.length) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-500">Start a conversation</p>
        </div>
      );
    }

    if (!useVirtualization || !virtualizer) {
      return (
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLoading={isLoading}
              copiedMessageId={copiedMessageId}
              getUserDisplayName={getUserDisplayName}
              handleCopyMessage={handleCopyMessage}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={message.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="pb-6"
            >
              <MessageBubble
                message={message}
                isLoading={isLoading}
                copiedMessageId={copiedMessageId}
                getUserDisplayName={getUserDisplayName}
                handleCopyMessage={handleCopyMessage}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const renderChatLayout = (isModal = false) => {
    const scrollRef = isModal ? dialogScrollContainerRef : nodeScrollContainerRef;
    const virtualizer = isModal ? dialogVirtualizer : nodeVirtualizer;

    return (
      <div
        className={`flex h-full w-full border-2 rounded-2xl overflow-hidden bg-white ${
          isModal
            ? 'border-[#095D40] shadow-2xl'
            : `shadow-sm transition-all ${isActive ? 'border-[#095D40]' : 'border-[#E8ECEF]'}`
        }`}
        onWheel={handleWheelEvent}
        onWheelCapture={handleWheelEvent}
      >
        {/* Left Sidebar */}
        <div className="w-[240px] min-w-[240px] flex-shrink-0 border-r border-border/40 flex flex-col bg-muted/40">
          <div className="px-3 py-3 border-b border-border/40 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
            Connected ({data.linkedNodes?.length || 0})
          </p>
          <p className="text-[11px] text-muted-foreground">
            {data.linkedNodes && data.linkedNodes.length > 0
              ? `${data.linkedNodes.length} linked ${data.linkedNodes.length === 1 ? 'node' : 'nodes'}`
              : 'No linked nodes yet'}
          </p>
        </div>

        <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
            Chats
          </p>
          <Button
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={(e) => {
              stopReactFlowPropagation(e);
              createNewChat();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        <ScrollArea
          className="flex-1"
          viewportClassName="flowy-scrollable"
          onWheel={handleWheelEvent}
          onWheelCapture={handleWheelEvent}
        >
          <div className="px-3 py-2 space-y-2">
            {data.sessions && data.sessions.length > 0 ? (
              data.sessions.map((session) => {
                const isActiveSession = session.id === currentSession?.id;
                return (
                  <div
                    key={session.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] transition-colors ${
                      isActiveSession
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border/50 hover:border-border hover:bg-gray-50'
                    }`}
                  >
                    <Button
                      variant="ghost"
                      className="h-6 px-0 flex-1 justify-start text-left text-current hover:bg-transparent min-w-0"
                      onClick={(e) => {
                        stopReactFlowPropagation(e);
                        switchSession(session.id);
                      }}
                    >
                      <span className="truncate block">{session.title}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-transparent"
                      onClick={(e) => deleteSession(session.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete chat</span>
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-[11px] text-muted-foreground px-1 py-4 text-center">
                No chats yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
        {/* Chat Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-white flowy-drag-handle cursor-grab active:cursor-grabbing select-none"
          data-flowy-drag-handle
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-4.5 w-4.5 text-primary" />
            <h3 className="text-[13px] font-semibold text-gray-900">
              {currentSession?.title || 'Chat'}
            </h3>
          </div>
          {!isModal ? (
            <button
              onClick={(e) => {
                stopReactFlowPropagation(e);
                setIsMaximized(true);
              }}
              onMouseDown={(e) => stopReactFlowPropagation(e)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Maximize chat"
            >
              <Maximize2 className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(false);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close chat"
            >
              <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </button>
          )}
        </div>

        {/* Messages Area - Virtualized */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onWheel={handleWheelEvent}
          onWheelCapture={handleWheelEvent}
          data-lenis-prevent
          className="flowy-scrollable flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 bg-muted/30"
          style={{ overscrollBehavior: 'contain', userSelect: 'text' }}
        >
          {renderMessageList(virtualizer, !isModal)}
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-border/40 bg-white">
          <div className="flex items-center gap-2 mb-2">
            {/* Model Selector with Provider Branding */}
            <div
              onClick={(e) => stopReactFlowPropagation(e)}
              onMouseDown={(e) => stopReactFlowPropagation(e)}
              onPointerDown={(e) => stopReactFlowPropagation(e)}
            >
              <ModelSelectionDialog
                currentModel={selectedModel}
                onSelectModel={handleModelChange}
              />
            </div>
          </div>

          <div
            onMouseDown={(e) => stopReactFlowPropagation(e)}
            className="border border-border/60 rounded-lg bg-muted/40 hover:bg-background transition-colors px-2 py-1.5 mb-2"
          >
            <VoiceInputBar
              value={input}
              onChange={setInput}
              onSend={handleSend}
              placeholder="Ask anything or press / for actions"
              disabled={isLoading}
              voiceMode="replace"
              showAddButton={false}
              showRecordingHint={false}
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                stopReactFlowPropagation(e);
                if (isLoading) return;
                sendMessage('Summarize the key points from the context provided above in a clear and concise format.');
              }}
              disabled={isLoading}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#095D40]/10 text-[#095D40] hover:bg-[#095D40]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Summarize
            </button>
            <button
              onClick={(e) => {
                stopReactFlowPropagation(e);
                if (isLoading) return;
                sendMessage('Extract and highlight the key insights, important takeaways, and actionable points from the context above.');
              }}
              disabled={isLoading}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#095D40]/10 text-[#095D40] hover:bg-[#095D40]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Get Key Insights
            </button>
          </div>
        </div>
      </div>
    </div>
    );
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
        {renderChatLayout()}
      </BaseNode>

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent
          className="sm:max-w-[96vw] w-[96vw] max-h-[90vh] h-[90vh] p-0 border-none shadow-2xl overflow-hidden"
          showCloseButton={false}
        >
          <div className="h-full w-full overflow-hidden">
            {renderChatLayout(true)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ChatNode.displayName = 'ChatNode';
