'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  MessageSquare,
  Book,
  Sparkles,
  Trash2,
  Megaphone,
  CalendarDays,
  ArrowUpRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { KortexChatInput } from '@/components/workflow/KortexChatInput';
import { MODELS } from '@/lib/models/model-registry';
import { useCurrentUser } from '@/hooks/use-current-user';
import { LoadingScreen } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

type SuggestionTab = 'create' | 'market' | 'learn' | 'brainstorm';

const SUGGESTIONS: Record<SuggestionTab, string[]> = {
  create: [
    'Be my creative sparring partner',
    'Edit my writing',
    'Generate 50+ content ideas',
    'Generate viral social posts',
    'Write a thread or carousel',
    'YouTube, newsletter, or article draft',
  ],
  market: [
    'Craft 5 launch hooks for Twitter + LinkedIn',
    'Turn this offer into a landing page',
    'Repurpose the latest webinar into ads',
    'Break down competitor positioning',
    'Audit our hero section copy',
    'Brainstorm nurture email angles',
  ],
  learn: [
    'Explain this workflow like I\'m five',
    'Summarize this 30-minute podcast in bullets',
    'Compare these two frameworks line by line',
    'Turn these notes into a study guide',
    'Quiz me on what I just pasted',
    'Give me analogies so I remember this',
  ],
  brainstorm: [
    'Draft a four-week launch calendar',
    'Map my SOP into a checklist',
    'Layer AI assists into this workflow',
    'Estimate effort vs impact for these ideas',
    'Create a daily content ritual',
    'Outline a delegation plan for my team',
  ],
};

export default function AssistantPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-pro');
  const [activeTab, setActiveTab] = useState<SuggestionTab>('create');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (sessions.length === 0) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
  }, [sessions.length]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) return;
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (sessionId === currentSessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      setCurrentSessionId(remaining[0]?.id || null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    // Detect links first
    const youtubeMatch = currentInput.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const instagramMatch = currentInput.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);

    // Show processing message
    const processingMessageId = crypto.randomUUID();
    if (youtubeMatch || instagramMatch) {
      const processingMessage: Message = {
        id: processingMessageId,
        role: 'assistant',
        content: `Processing ${youtubeMatch ? 'YouTube video' : ''}${youtubeMatch && instagramMatch ? ' and ' : ''}${instagramMatch ? 'Instagram reel' : ''}...`,
        timestamp: new Date().toISOString(),
      };

      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, processingMessage] }
            : s
        )
      );
    }

    // Declare assistantMessageId outside try/catch for error handling
    let assistantMessageId = crypto.randomUUID();

    try {
      // Fetch content FIRST before creating user message
      const youtubeTranscripts: any[] = [];
      const instagramReels: any[] = [];

      if (youtubeMatch) {
        const ytUrl = youtubeMatch[0].startsWith('http') ? youtubeMatch[0] : `https://${youtubeMatch[0]}`;
        const ytRes = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: ytUrl }),
        });
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          youtubeTranscripts.push({
            videoId: youtubeMatch[1],
            transcript: ytData.transcript,
            status: 'success',
            url: ytUrl,
            title: ytData.title || 'YouTube Video',
            method: ytData.method || 'supadata',
          });
        }
      }

      if (instagramMatch) {
        const igUrl = instagramMatch[0].startsWith('http') ? instagramMatch[0] : `https://${instagramMatch[0]}`;
        const igRes = await fetch('/api/instagram/reel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: igUrl }),
        });
        if (igRes.ok) {
          const igData = await igRes.json();
          instagramReels.push(igData);
        }
      }

      // Remove processing message and add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: currentInput,
        timestamp: new Date().toISOString(),
      };

      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: [
                  ...s.messages.filter(m => m.id !== processingMessageId),
                  userMessage
                ],
                title: s.messages.length === 0 ? currentInput.slice(0, 40) + (currentInput.length > 40 ? '...' : '') : s.title
              }
            : s
        )
      );
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId ? { ...s, messages: [...s.messages, assistantMessage] } : s
        )
      );

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel,
          provider: selectedModel.includes('/') ? 'openrouter' : 'gemini',
          textContext: [],
          youtubeTranscripts,
          voiceTranscripts: [],
          pdfDocuments: [],
          images: [],
          webpages: [],
          instagramReels,
          linkedInPosts: [],
          mindMaps: [],
          templates: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

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
                if (parsed.error) throw new Error(parsed.error);
                if (!parsed.done) {
                  fullContent += parsed.content;
                  setSessions(prev =>
                    prev.map(s =>
                      s.id === currentSessionId
                        ? {
                            ...s,
                            messages: s.messages.map(m =>
                              m.id === assistantMessageId ? { ...m, content: fullContent } : m
                            ),
                          }
                        : s
                    )
                  );
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: s.messages.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}` }
                    : m
                ),
              }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (userLoading) return <LoadingScreen />;
  if (!user) return null;

  const greeting = `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'}`;

  return (
    <div className="fixed inset-0 flex bg-[#F7FBF9] overflow-hidden">
      {/* Left Sidebar - Fixed */}
      <div className="w-[250px] bg-white border-r border-[#E1EAE5] flex flex-col flex-shrink-0 h-full">
        {/* Search */}
        <div className="p-4 flex-shrink-0">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-9 text-sm font-normal text-gray-600 bg-white hover:bg-gray-50"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
            <span className="ml-auto text-xs opacity-50">⌘K</span>
          </Button>
        </div>

        {/* Navigation */}
        <div className="px-4 space-y-px flex-shrink-0">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-8 text-sm font-normal bg-[#F2F8F4] border-[#D6E8DD] text-[#0C7A53]"
          >
            <MessageSquare className="w-4 h-4" />
            <span>AI Chat</span>
          </Button>
        </div>

        {/* Chat History - Scrollable */}
        <div className="flex-1 overflow-hidden px-4 mt-4 min-h-0 flex flex-col">
          <div className="text-[11px] font-semibold text-[#7A8A80] mb-2 px-3 flex-shrink-0">Chat History</div>
          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-px pb-2">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={cn(
                    'group flex items-center gap-1 w-full text-left px-3 py-2 rounded-xl text-[13px] transition-colors font-inter',
                    session.id === currentSessionId
                      ? 'bg-[#E6F4EE] text-[#0C7A53] border border-[#B9E3CF]'
                      : 'text-[#5F6F65] hover:bg-[#F2F8F4]'
                  )}
                >
                  <button
                    onClick={() => setCurrentSessionId(session.id)}
                    className="flex-1 text-left overflow-hidden"
                    title={session.title}
                  >
                    <div className="truncate">{session.title}</div>
                  </button>
                  {sessions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => deleteSession(session.id, e)}
                    >
                      <Trash2 className="h-3 w-3 text-[#93A59A] hover:text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <Button
            onClick={createNewSession}
            variant="outline"
            className="w-full mt-2 h-8 text-xs font-normal border-[#D6E8DD] flex-shrink-0 text-[#0C7A53] hover:bg-[#F2F8F4]"
          >
            + New Conversation
          </Button>
        </div>

        <Separator className="bg-[#E1EAE5] flex-shrink-0" />

        {/* Library */}
        <div className="px-4 py-3 flex-shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-8 text-sm font-normal text-[#5F6F65] hover:bg-[#F2F8F4]"
            onClick={() => router.push('/flows')}
          >
            <Book className="w-4 h-4" />
            <span>All Workflows</span>
          </Button>
        </div>

        <Separator className="bg-[#E1EAE5] flex-shrink-0" />

        {/* User Profile */}
        <div className="px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0C7A53] to-[#19B17A] rounded-lg flex items-center justify-center text-sm font-medium text-white shadow-sm">
              {user.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-gray-700 truncate flex-1 font-normal">
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full bg-[#F7FBF9]">
        {/* Top Bar */}
        <div className="h-12 border-b border-[#E1EAE5] bg-white flex items-center px-6 gap-2.5 flex-shrink-0">
          <MessageSquare className="w-[18px] h-[18px] text-[#0C7A53]" />
          <span className="text-sm text-gray-900 font-normal">Chat</span>
        </div>

        {/* Messages Area - Scrollable with padding for floating input */}
        <div className="flex-1 overflow-y-auto pb-[240px]">
          <div className="w-full max-w-[800px] mx-auto px-2 pt-10 pb-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-stretch gap-8">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-3xl text-[#0C7A53] font-serif">{greeting}</span>
                  <p className="text-sm text-gray-500">Pick a track to get started or drop a request below.</p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { id: 'create' as const, label: 'Create', icon: Sparkles },
                    { id: 'market' as const, label: 'Market', icon: Megaphone },
                    { id: 'learn' as const, label: 'Learn', icon: Book },
                    { id: 'brainstorm' as const, label: 'Brainstorm', icon: CalendarDays },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'px-4 py-1.5 rounded-2xl text-sm border flex items-center gap-2 transition-all',
                        activeTab === tab.id
                          ? 'bg-[#E6F4EE] text-[#0C7A53] border-[#B9E3CF] shadow-[0_10px_25px_rgba(9,93,64,0.12)]'
                          : 'bg-white text-[#5F6F65] border-[#E2EDE7] hover:bg-[#F2F8F4]'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="bg-white rounded-3xl border border-[#E0EAE4] shadow-[0_25px_50px_rgba(9,93,64,0.08)] divide-y divide-[#E0EAE4]">
                  {SUGGESTIONS[activeTab].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="group w-full text-left px-5 py-3 flex items-center justify-between hover:bg-[#F7FBF9] transition-colors"
                    >
                      <span className="text-[13px] text-gray-700 group-hover:text-[#0C7A53]">
                        {suggestion}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-[#0C7A53]/40 group-hover:text-[#0C7A53]" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full space-y-6">
                {messages.map(message => (
                  <div key={message.id} className="w-full">
                    <div className={cn(
                      "w-full",
                      message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                    )}>
                      <div className={cn(
                        "space-y-1",
                        message.role === 'user' ? 'max-w-[80%]' : 'max-w-[90%]'
                      )}>
                        <div className={cn(
                          "text-[13px] font-medium text-gray-500",
                          message.role === 'user' ? 'text-right' : 'text-left'
                        )}>
                          {message.role === 'user' ? 'You' : 'Remic AI'}
                        </div>
                        <div className="text-[15px] leading-relaxed text-gray-900 pt-4 pb-6">
                          {message.role === 'assistant' ? (
                          <div className="prose prose-base max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-800 prose-p:leading-7 prose-a:text-[#0C7A53] prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-gray-900 prose-code:bg-[#F0F5F2] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-ul:my-4 prose-ol:my-4 prose-li:my-1 prose-blockquote:border-l-4 prose-blockquote:border-[#D5E6DC] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-700 prose-table:text-sm prose-th:bg-[#F6FBF8] prose-th:font-semibold prose-td:border prose-th:border prose-img:rounded-lg">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                code: ({ inline, className, children }: any) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const code = String(children).replace(/\n$/, '');
                                  if (inline) {
                                    return <code>{children}</code>;
                                  }
                                  return match ? (
                                    <div className="my-4 rounded-xl overflow-hidden border border-[#DDE6E0] shadow-sm">
                                      <div className="bg-[#0C7A53] px-4 py-2 text-xs text-white/90 font-mono border-b border-[#0A5A3F] flex items-center justify-between">
                                        <span>{match[1]}</span>
                                      </div>
                                      <SyntaxHighlighter
                                        language={match[1]}
                                        style={oneDark}
                                        customStyle={{
                                          margin: 0,
                                          borderRadius: 0,
                                          fontSize: '14px',
                                          padding: '20px',
                                          background: '#282c34'
                                        }}
                                        showLineNumbers
                                      >
                                        {code}
                                      </SyntaxHighlighter>
                                    </div>
                                  ) : (
                                    <code className="block bg-[#F0F5F2] p-4 rounded-lg text-sm font-mono my-3 overflow-x-auto border border-[#DDE6E0]">{children}</code>
                                );
                              },
                              h1: ({ children }) => <h1 className="text-2xl font-semibold mt-6 mb-4">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                                p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 my-4">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2 my-4">{children}</ol>,
                                li: ({ children }) => <li className="leading-7">{children}</li>,
                                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                              }}
                            >
                              {message.content || (isLoading ? 'Thinking...' : '')}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-7">{message.content}</p>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Floating Input Card - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <div className="pointer-events-auto">
            <KortexChatInput
              value={input}
              onChange={setInput}
              onSend={sendMessage}
              disabled={isLoading}
              placeholder="Ask AI anything, @ to mention"
              currentModel={selectedModel}
              onModelChange={setSelectedModel}
              availableModels={MODELS}
              theme="light"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
