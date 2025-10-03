import { Youtube, Loader2, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Download, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { YouTubeNodeData } from '@/types/workflow';

interface YouTubeNodeProps {
  id: string;
  data: YouTubeNodeData;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function YouTubeNode({ id, data }: YouTubeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(data.url || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [showTranscript, setShowTranscript] = useState(false);
  const processedUrlRef = useRef<string | null>(null);

  const hasTranscript = useMemo(() => data.transcriptStatus === 'success' && !!data.transcript, [data.transcriptStatus, data.transcript]);
  const transcriptWordCount = useMemo(() => {
    if (!data.transcript)
      return 0;
    const words = data.transcript.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [data.transcript]);

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (data.url && data.url !== url) {
      setUrl(data.url);
    }
  }, [data.url, url]);

  const fetchTranscript = useCallback(async (videoUrl: string) => {
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl }),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          transcript: result.transcript,
          method: result.method,
          status: 'success' as const,
        };
      } else {
        return {
          status: 'unavailable' as const,
          error: result.error,
        };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch transcript';
      return {
        status: 'error' as const,
        error: message,
      };
    }
  }, []);

  const processVideoUrl = useCallback(async (videoUrl: string, silent = false) => {
    const safeUrl = videoUrl.trim();
    const videoId = extractYouTubeId(safeUrl);
    if (!videoId) {
      if (!silent) {
        setIsEditing(false);
      }
      updateNodeData(id, {
        transcriptStatus: 'error',
        transcriptError: 'Invalid YouTube URL',
      } as Partial<YouTubeNodeData>);
      return;
    }

    processedUrlRef.current = safeUrl;
    setShowTranscript(false);

    const node = useWorkflowStore.getState().getNode(id);
    const nodeData = node?.type === 'youtube' ? (node.data as YouTubeNodeData) : undefined;
    const existingTranscript = nodeData?.transcript;
    const existingVideoId = nodeData?.videoId;
    const existingStatus = nodeData?.transcriptStatus;
    const existingMethod = nodeData?.transcriptMethod;
    const hasTranscript = !!existingTranscript && existingVideoId === videoId && existingStatus === 'success';

    updateNodeData(id, {
      url: safeUrl,
      videoId,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      title: nodeData?.title || 'YouTube Video',
      transcriptStatus: hasTranscript ? 'success' : 'loading',
      transcript: hasTranscript ? existingTranscript : undefined,
      transcriptError: undefined,
      transcriptMethod: hasTranscript ? existingMethod : undefined,
    } as Partial<YouTubeNodeData>);

    if (hasTranscript) {
      console.log(`[YouTubeNode] Using cached transcript for video: ${videoId}`);
      return;
    }

    console.log(`[YouTubeNode] Fetching transcript for video: ${videoId}`);
    const result = await fetchTranscript(safeUrl);

    updateNodeData(id, {
      transcript: result.transcript,
      transcriptStatus: result.status,
      transcriptMethod: result.method,
      transcriptError: result.error,
    } as Partial<YouTubeNodeData>);
  }, [fetchTranscript, id, updateNodeData]);

  useEffect(() => {
    if (!data.url) {
      return;
    }

    const node = useWorkflowStore.getState().getNode(id);
    if (node?.type === 'youtube') {
      const nodeData = node.data as YouTubeNodeData;
      if (nodeData.videoId && nodeData.transcriptStatus && nodeData.transcriptStatus !== 'loading') {
        processedUrlRef.current = data.url;
        return;
      }
    }

    if (processedUrlRef.current === data.url) {
      return;
    }

    processedUrlRef.current = data.url;
    void processVideoUrl(data.url, true);
  }, [data.url, id, processVideoUrl]);

  const handleSave = async () => {
    await processVideoUrl(url);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setUrl(data.url || '');
      setIsEditing(false);
    }
  };

  const handleRetryTranscript = async (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    const currentUrl = data.url || url;
    if (!currentUrl)
      return;

    setShowTranscript(false);
    updateNodeData(id, {
      transcriptStatus: 'loading',
      transcriptError: undefined,
    } as Partial<YouTubeNodeData>);

    const result = await fetchTranscript(currentUrl);

    updateNodeData(id, {
      transcript: result.transcript,
      transcriptStatus: result.status,
      transcriptMethod: result.method,
      transcriptError: result.error,
    } as Partial<YouTubeNodeData>);
  };

  const downloadTranscript = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    if (!data.transcript)
      return;

    const blob = new Blob([data.transcript], { type: 'text/plain;charset=utf-8' });
    const urlObject = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObject;
    link.download = `${data.videoId || 'transcript'}.txt`;
    link.click();
    URL.revokeObjectURL(urlObject);
  };

  const openVideo = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    if (data.url)
      window.open(data.url, '_blank', 'noopener,noreferrer');
  };

  // Transcript status indicator
  const TranscriptStatus = () => {
    if (!data.transcriptStatus) return null;

    switch (data.transcriptStatus) {
      case 'loading':
        return (
            <div className="flex items-center gap-1.5 text-[10px] text-[#007AFF] font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Processing... (may take 10-30s)</span>
            </div>
        );
      case 'success':
        const method = data.transcriptMethod === 'deepgram' ? '🎙️ Deepgram' : '📝 Captions';
        return (
          <div className="flex items-center gap-1.5 text-[10px] text-[#34C759] font-medium">
            <CheckCircle2 className="h-3 w-3" />
            <span>
              Ready ({method}) · {Math.round((data.transcript?.length || 0) / 1000)}K chars
            </span>
          </div>
        );
      case 'unavailable':
        return (
          <div className="flex items-center gap-1.5 text-[10px] text-[#FF9500] font-medium" title="This video doesn't have captions. Try a video with CC enabled.">
            <AlertCircle className="h-3 w-3" />
            <span>No captions available</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-[10px] text-[#FF3B30] font-medium">
            <AlertCircle className="h-3 w-3" />
            <span>Transcript error</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <BaseNode
      id={id}
      type="YouTube"
      icon={<Youtube className="h-3.5 w-3.5 text-red-600" />}
      iconBg="bg-red-100"
      showTargetHandle={false}
    >
      <div className="w-[340px]">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube URL..."
            className="w-full px-4 py-2.5 text-[14px] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#007AFF] transition-all"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif' }}
          />
        ) : data.videoId ? (
          <div className="space-y-2.5">
            <div
              className="relative aspect-video bg-[#F5F5F7] rounded-lg overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform duration-200"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
              onClick={() => setIsEditing(true)}
            >
              {data.thumbnail ? (
                <Image
                  src={data.thumbnail}
                  alt={data.title || 'YouTube thumbnail'}
                  fill
                  sizes="340px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Youtube className="h-12 w-12 text-[#9CA3AF]" />
                </div>
              )}
            </div>
            <TranscriptStatus />
            {data.transcriptStatus === 'error' && data.transcriptError && (
              <div className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">
                {data.transcriptError}
              </div>
            )}
            {hasTranscript && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <button
                  onClick={(event) => {
                    stopPropagation(event);
                    setShowTranscript(prev => !prev);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-[#1A1D21] hover:bg-[#F3F4F6]"
                >
                  <span>Transcript preview · ~{transcriptWordCount} words</span>
                  {showTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showTranscript && (
                  <div className="max-h-36 overflow-y-auto px-3 pb-3 text-[11px] leading-relaxed text-[#4B5563]">
                    {data.transcript}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <button
                onClick={(event) => {
                  stopPropagation(event);
                  setIsEditing(true);
                }}
                className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#6B7280] hover:border-[#007AFF] hover:text-[#007AFF]"
              >
                Edit link
              </button>
              {(data.transcriptStatus === 'error' || data.transcriptStatus === 'unavailable' || data.transcriptStatus === 'success') && (
                <button
                  onClick={handleRetryTranscript}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E0F2FE] bg-[#ECFEFF] px-3 py-1 text-[#0C4A6E] hover:bg-[#BAE6FD]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-run
                </button>
              )}
              {data.url && (
                <button
                  onClick={openVideo}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open video
                </button>
              )}
              {hasTranscript && (
                <button
                  onClick={downloadTranscript}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export transcript
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="aspect-video bg-[#FAFBFC] rounded-lg border-[1.5px] border-dashed border-[#CBD5E1] flex items-center justify-center cursor-pointer hover:bg-[#F5F5F7] hover:border-[#007AFF] transition-all duration-200"
          >
            <div className="text-center">
              <Youtube className="h-10 w-10 text-[#9CA3AF] mx-auto mb-2.5" />
              <div className="text-[11px] text-[#6B7280] font-medium">Click to add video</div>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
