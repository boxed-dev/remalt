import { MessageSquare, Send, Loader2, Copy, Check, Maximize2, X, User } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { SyntheticEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
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
import type { ChatNodeData, ChatMessage } from '@/types/workflow';
import { VoiceInput } from '../VoiceInput';
import 'katex/dist/katex.min.css';

interface ChatNodeProps {
  id: string;
  data: ChatNodeData;
}

// Code block component with syntax highlighting and copy button
function CodeBlock({ inline, className, children, isUserMessage }: any) {
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
      <code className="bg-gray-100 px-2 py-1 rounded text-[12px] font-mono">
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
              }}
              showLineNumbers={code.split('\n').length > 3}
            >
              {code}
            </SyntaxHighlighter>
          </span>
        ) : (
          <code className="block bg-[#1e1e1e] text-gray-300 p-4 rounded-xl text-[12px] font-mono overflow-x-auto border border-gray-700">
            {children}
          </code>
        )}
      </span>
    </span>
  );
}

export function ChatNode({ id, data }: ChatNodeProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalMessagesEndRef = useRef<HTMLDivElement>(null);
  const modalScrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(data.messages.length);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const workflow = useWorkflowStore((state) => state.workflow);
  const { user } = useCurrentUser();

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBottomModal = () => {
    modalMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if user is near bottom of scroll container
  const isNearBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Handle scroll event to detect manual scrolling
  const handleScroll = () => {
    setShouldAutoScroll(isNearBottom());
  };

  // Auto-scroll only when new messages arrive and user is near bottom
  useEffect(() => {
    const hasNewMessage = data.messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = data.messages.length;

    if (hasNewMessage && shouldAutoScroll) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (isMaximized) {
          scrollToBottomModal();
        } else {
          scrollToBottom();
        }
      }, 50);
    }
  }, [data.messages, shouldAutoScroll, isMaximized]);

  // Update linked nodes when workflow changes
  useEffect(() => {
    if (workflow) {
      const linkedNodeIds = getLinkedNodeIds(id, workflow);
      if (JSON.stringify(linkedNodeIds) !== JSON.stringify(data.linkedNodes)) {
        updateNodeData(id, { linkedNodes: linkedNodeIds } as Partial<ChatNodeData>);
      }
    }
  }, [workflow, id, data.linkedNodes, updateNodeData]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...data.messages, userMessage];
    updateNodeData(id, { messages: updatedMessages } as Partial<ChatNodeData>);
    setInput('');
    setIsLoading(true);
    setShouldAutoScroll(true); // Re-enable auto-scroll when user sends a message

    // Create placeholder for streaming response
    const assistantMessageId = crypto.randomUUID();
    const streamingMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    // Add empty assistant message immediately for streaming
    updateNodeData(id, { messages: [...updatedMessages, streamingMessage] } as Partial<ChatNodeData>);

    try {
      // Build context from linked nodes
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

      // Call the chat API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: updatedMessages,
          textContext: context.textContext,
          youtubeTranscripts: context.youtubeTranscripts,
          voiceTranscripts: context.voiceTranscripts,
          pdfDocuments: context.pdfDocuments,
          images: context.images,
          webpages: context.webpages,
          mindMaps: context.mindMaps,
          templates: context.templates,
          groupChats: context.groupChats,
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
                  // Update message in real-time with accumulated content
                  const currentMessages = [...updatedMessages, { ...streamingMessage, content: fullContent }];
                  updateNodeData(id, { messages: currentMessages } as Partial<ChatNodeData>);
                }
              } catch (e) {
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

      const withResponse = [...updatedMessages, aiResponse];
      updateNodeData(id, { messages: withResponse } as Partial<ChatNodeData>);
    } catch (error: any) {
      console.error('Chat error:', error);

      // Show error message in chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response. Make sure GEMINI_API_KEY is set in .env.local'}`,
        timestamp: new Date().toISOString(),
      };

      const withError = [...updatedMessages, errorMessage];
      updateNodeData(id, { messages: withError } as Partial<ChatNodeData>);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <BaseNode id={id} allowOverflow={true}>
        <div
          className="flex w-[480px] flex-col space-y-2"
          onWheel={(event) => stopReactFlowPropagation(event)}
          onWheelCapture={(event) => stopReactFlowPropagation(event)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#14B8A6]" />
              <span className="text-[13px] font-medium text-[#1A1D21]">Chat</span>
            </div>
            <button
              onClick={(event) => {
                stopReactFlowPropagation(event);
                setIsMaximized(true);
              }}
              className="p-1 hover:bg-[#F5F5F7] rounded transition-colors"
              title="Maximize chat"
            >
              <Maximize2 className="h-3.5 w-3.5 text-[#6B7280] hover:text-[#14B8A6]" />
            </button>
          </div>
          {/* Wrapper for scroll isolation */}
          <div className="relative">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onWheel={(event) => stopReactFlowPropagation(event)}
              onWheelCapture={(event) => stopReactFlowPropagation(event)}
              onMouseDown={(event) => stopReactFlowPropagation(event)}
              onPointerDown={(event) => stopReactFlowPropagation(event)}
              onTouchStart={(event) => stopReactFlowPropagation(event)}
              onTouchMove={(event) => stopReactFlowPropagation(event)}
              data-lenis-prevent
              data-lenis-prevent-wheel
              data-lenis-prevent-touch
              className="relative h-[480px] overflow-y-auto overflow-x-hidden space-y-3 scroll-smooth chat-scrollbar"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              {data.messages.length > 0 ? (
                data.messages.map((message) => (
                  <div key={message.id} className="max-w-[85%]">
                    <div className="flex items-center gap-2 mb-1.5">
                      {message.role === 'assistant' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAFBFC] border border-[#E8ECEF]">
                          <div className="w-1.5 h-1.5 bg-[#14B8A6] rounded-full"></div>
                          <span className="text-[10px] font-medium text-[#6B7280] tracking-wide">AI</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAFBFC] border border-[#E8ECEF]">
                          <User className="w-2.5 h-2.5 text-[#6B7280]" />
                          <span className="text-[10px] font-medium text-[#6B7280] tracking-wide">{getUserDisplayName()}</span>
                        </div>
                      )}
                    </div>
                    <div
                      className={`p-3.5 rounded-lg text-[13px] leading-[1.6] break-words transition-all ${
                        message.role === 'user'
                          ? 'bg-[#F5F5F7] text-[#1A1D21] border border-[#E8ECEF]'
                          : 'bg-white text-[#1A1D21]'
                      }`}
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                    <div className="prose prose-sm max-w-none markdown-content overflow-x-auto">
                      {message.content === '' && isLoading ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-2 h-2 bg-[#14B8A6] rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-[#14B8A6] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-[#14B8A6] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          // Code blocks with syntax highlighting
                          code: (props) => <CodeBlock {...props} isUserMessage={message.role === 'user'} />,
                          pre: ({ children }) => <>{children}</>,

                          // Typography - Consistent sizing
                          p: ({ children }) => <p className="text-[13px] mb-3 last:mb-0 leading-[1.6]">{children}</p>,
                          h1: ({ children }) => <h1 className="text-[16px] font-bold mb-3 mt-4 first:mt-0 leading-[1.4]">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-[15px] font-bold mb-3 mt-4 first:mt-0 leading-[1.4]">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-[14px] font-semibold mb-2 mt-3 first:mt-0 leading-[1.4]">{children}</h3>,
                          h4: ({ children }) => <h4 className="text-[13px] font-semibold mb-2 mt-3 first:mt-0 leading-[1.4]">{children}</h4>,

                          // Lists - Consistent sizing
                          ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1.5 text-[13px]">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1.5 text-[13px]">{children}</ol>,
                          li: ({ children }) => <li className="leading-[1.6] text-[13px]">{children}</li>,

                          // Inline elements
                          strong: ({ children }) => <strong className="font-semibold text-[13px]">{children}</strong>,
                          em: ({ children }) => <em className="italic text-[13px]">{children}</em>,
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-[13px] ${message.role === 'user' ? 'text-white underline decoration-white/60 hover:decoration-white' : 'text-[#155EEF] hover:underline'}`}
                            >
                              {children}
                            </a>
                          ),

                          // Blockquote
                          blockquote: ({ children }) => (
                            <blockquote className={`border-l-4 text-[13px] ${message.role === 'user' ? 'border-white/50 bg-white/10' : 'border-[#E8ECEF] bg-[#F5F5F7]'} pl-4 py-3 my-3 italic rounded-r leading-[1.6]`}>
                              {children}
                            </blockquote>
                          ),

                          // Tables
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full text-[13px] border-collapse">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                          th: ({ children }) => <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-[13px]">{children}</th>,
                          td: ({ children }) => <td className="border border-gray-300 px-3 py-2 text-[13px]">{children}</td>,

                          // Horizontal rule
                          hr: () => <hr className={`my-4 border-t ${message.role === 'user' ? 'border-white/30' : 'border-[#E8ECEF]'}`} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                      )}
                    </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[12px] text-[#9CA3AF] text-center pt-16">
                  No messages yet
                </div>
              )}
              
              
              <div ref={messagesEndRef} />
            </div>
          </div>

        {data.linkedNodes.length > 0 && (
          <div className="text-[10px] text-[#9CA3AF] flex items-center gap-1.5">
            <div className="w-1 h-1 bg-[#14B8A6] rounded-full"></div>
            <span>{data.linkedNodes.length} source{data.linkedNodes.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="flex gap-2">
          <VoiceInput
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(event) => stopReactFlowPropagation(event)}
            onWheel={(event) => stopReactFlowPropagation(event)}
            onWheelCapture={(event) => stopReactFlowPropagation(event)}
            placeholder="Type or speak..."
            disabled={isLoading}
            voiceMode="replace"
            className="flex-1 px-4 py-2.5 text-[13px] border border-[#E8ECEF] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#155EEF] focus:border-transparent disabled:bg-[#F5F5F7] disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={handleSend}
            onMouseDown={(event) => stopReactFlowPropagation(event)}
            onWheel={(event) => stopReactFlowPropagation(event)}
            onWheelCapture={(event) => stopReactFlowPropagation(event)}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2.5 bg-[#155EEF] text-white rounded-xl hover:bg-[#1249CC] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </BaseNode>

    {/* Fullscreen Chat Modal */}
    {isMaximized && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setIsMaximized(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-[#14B8A6]" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#1A1D21]">Chat Assistant</h3>
                {data.linkedNodes.length > 0 && (
                  <p className="text-[11px] text-[#6B7280]">
                    {data.linkedNodes.length} source{data.linkedNodes.length !== 1 ? 's' : ''} connected
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsMaximized(false)}
              className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5 text-[#6B7280] hover:text-[#1A1D21]" />
            </button>
          </div>

          {/* Modal Messages */}
          <div
            ref={modalScrollContainerRef}
            onScroll={() => {
              if (modalScrollContainerRef.current) {
                const { scrollHeight, scrollTop, clientHeight } = modalScrollContainerRef.current;
                const threshold = 100;
                setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < threshold);
              }
            }}
            onWheel={(event) => stopReactFlowPropagation(event)}
            onWheelCapture={(event) => stopReactFlowPropagation(event)}
            onMouseDown={(event) => stopReactFlowPropagation(event)}
            onPointerDown={(event) => stopReactFlowPropagation(event)}
            onTouchStart={(event) => stopReactFlowPropagation(event)}
            onTouchMove={(event) => stopReactFlowPropagation(event)}
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            className="relative flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-3 chat-scrollbar"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {data.messages.length > 0 ? (
              data.messages.map((message) => (
                <div key={message.id} className="max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1.5">
                    {message.role === 'assistant' ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFBFC] border border-[#E8ECEF]">
                        <div className="w-1.5 h-1.5 bg-[#14B8A6] rounded-full"></div>
                        <span className="text-[11px] font-medium text-[#6B7280] tracking-wide">AI</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFBFC] border border-[#E8ECEF]">
                        <User className="w-3 h-3 text-[#6B7280]" />
                        <span className="text-[11px] font-medium text-[#6B7280] tracking-wide">{getUserDisplayName()}</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`p-4 rounded-lg text-[14px] leading-[1.6] ${
                      message.role === 'user'
                        ? 'bg-[#F5F5F7] text-[#1A1D21] border border-[#E8ECEF]'
                        : 'bg-white text-[#1A1D21]'
                    }`}
                  >
                  <div className="prose prose-sm max-w-none markdown-content overflow-x-auto">
                    {message.content === '' && isLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-2.5 h-2.5 bg-[#14B8A6] rounded-full animate-pulse"></div>
                        <div className="w-2.5 h-2.5 bg-[#14B8A6] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2.5 h-2.5 bg-[#14B8A6] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code: (props) => <CodeBlock {...props} isUserMessage={message.role === 'user'} />,
                        pre: ({ children }) => <>{children}</>,
                        // Typography - Consistent sizing (larger for modal)
                        p: ({ children }) => <p className="text-[14px] mb-3 last:mb-0 leading-[1.6]">{children}</p>,
                        h1: ({ children }) => <h1 className="text-[18px] font-bold mb-4 mt-5 first:mt-0 leading-[1.4]">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-[16px] font-bold mb-3 mt-4 first:mt-0 leading-[1.4]">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-[15px] font-semibold mb-3 mt-4 first:mt-0 leading-[1.4]">{children}</h3>,
                        h4: ({ children }) => <h4 className="text-[14px] font-semibold mb-2 mt-3 first:mt-0 leading-[1.4]">{children}</h4>,
                        ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-2 text-[14px]">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal ml-5 mb-4 space-y-2 text-[14px]">{children}</ol>,
                        li: ({ children }) => <li className="leading-[1.6] text-[14px]">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-[14px]">{children}</strong>,
                        em: ({ children }) => <em className="italic text-[14px]">{children}</em>,
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-[14px] ${message.role === 'user' ? 'text-white underline decoration-white/60 hover:decoration-white' : 'text-[#155EEF] hover:underline'}`}
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className={`border-l-4 text-[14px] ${message.role === 'user' ? 'border-white/50 bg-white/10' : 'border-[#E8ECEF] bg-[#F5F5F7]'} pl-4 py-3 my-4 italic rounded-r leading-[1.6]`}>
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full text-[14px] border-collapse">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                        th: ({ children }) => <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-[14px]">{children}</th>,
                        td: ({ children }) => <td className="border border-gray-300 px-3 py-2 text-[14px]">{children}</td>,
                        hr: () => <hr className={`my-4 border-t ${message.role === 'user' ? 'border-white/30' : 'border-[#E8ECEF]'}`} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    )}
                  </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-12 w-12 text-[#9CA3AF] mb-4" />
                <p className="text-[16px] font-medium text-[#6B7280] mb-2">No messages yet</p>
                <p className="text-[13px] text-[#9CA3AF]">Start a conversation with the AI assistant</p>
              </div>
            )}
            
            
            <div ref={modalMessagesEndRef} />
          </div>

          {/* Modal Input */}
          <div className="px-6 py-5 border-t border-[#E8ECEF] bg-white">
            <div className="flex gap-3">
              <VoiceInput
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or speak your message..."
                disabled={isLoading}
                voiceMode="replace"
                className="flex-1 px-5 py-3.5 text-[14px] border border-[#E8ECEF] rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-[#155EEF] focus:border-transparent disabled:bg-[#F5F5F7] disabled:cursor-not-allowed transition-all"
                autoFocus
                onMouseDown={(event) => stopReactFlowPropagation(event)}
                onWheel={(event) => stopReactFlowPropagation(event)}
                onWheelCapture={(event) => stopReactFlowPropagation(event)}
              />
              <button
                onClick={handleSend}
                onMouseDown={(event) => stopReactFlowPropagation(event)}
                onWheel={(event) => stopReactFlowPropagation(event)}
                onWheelCapture={(event) => stopReactFlowPropagation(event)}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3.5 bg-[#155EEF] text-white rounded-2xl hover:bg-[#1249CC] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span className="font-medium">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
