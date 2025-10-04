import { Youtube, Loader2, CheckCircle2, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { YouTubeNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';

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
  const processedUrlRef = useRef<string | null>(null);

  const hasTranscript = useMemo(() => data.transcriptStatus === 'success' && !!data.transcript, [data.transcriptStatus, data.transcript]);
  const displayTitle = useMemo(() => {
    const trimmed = data.title?.trim();
    if (!trimmed || trimmed === 'YouTube Video') {
      return undefined;
    }
    return trimmed;
  }, [data.title]);

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
        credentials: 'include',
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

  const fetchVideoTitle = useCallback(async (videoUrl: string) => {
    try {
      const response = await fetch(`/api/youtube/metadata?url=${encodeURIComponent(videoUrl)}`, {
        credentials: 'include',
      });
      if (!response.ok)
        return undefined;

      const metadata = await response.json();
      const title = typeof metadata.title === 'string' ? metadata.title.trim() : '';
      return title.length > 0 ? title : undefined;
    } catch (error) {
      console.warn('[YouTubeNode] Failed to fetch video title', error);
      return undefined;
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
    const node = useWorkflowStore.getState().getNode(id);
    const nodeData = node?.type === 'youtube' ? (node.data as YouTubeNodeData) : undefined;
    const existingTranscript = nodeData?.transcript;
    const existingVideoId = nodeData?.videoId;
    const existingStatus = nodeData?.transcriptStatus;
    const existingMethod = nodeData?.transcriptMethod;
    const hasTranscript = !!existingTranscript && existingVideoId === videoId && existingStatus === 'success';
    const shouldFetchTitle = !nodeData?.title || nodeData.title === 'YouTube Video' || existingVideoId !== videoId;

    updateNodeData(id, {
      url: safeUrl,
      videoId,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      title: existingVideoId === videoId ? nodeData?.title : undefined,
      transcriptStatus: hasTranscript ? 'success' : 'loading',
      transcript: hasTranscript ? existingTranscript : undefined,
      transcriptError: undefined,
      transcriptMethod: hasTranscript ? existingMethod : undefined,
    } as Partial<YouTubeNodeData>);

    if (shouldFetchTitle) {
      void (async () => {
        const title = await fetchVideoTitle(safeUrl);
        if (title) {
          updateNodeData(id, { title } as Partial<YouTubeNodeData>);
        }
      })();
    }

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
          <div className="flex items-center gap-1 text-[10px] text-[#475569] font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-[#2563EB]" />
            <span>Fetching transcript...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-1 text-[10px] text-[#0F766E] font-medium">
            <CheckCircle2 className="h-3 w-3 text-[#0F766E]" />
            <span>Transcript ready</span>
          </div>
        );
      case 'unavailable':
        return (
          <div className="flex items-center gap-1 text-[10px] text-[#B45309] font-medium" title="This video doesn't have captions. Try a video with CC enabled.">
            <AlertCircle className="h-3 w-3 text-[#B45309]" />
            <span>No captions available</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-[10px] text-[#DC2626] font-medium">
            <AlertCircle className="h-3 w-3 text-[#DC2626]" />
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
      <div className="w-[340px] space-y-2">
        {displayTitle && (
          <div className="text-[13px] font-medium text-[#0F172A] leading-snug">{displayTitle}</div>
        )}
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
          <div className="space-y-2">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#F9FAFB]">
              {data.videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${data.videoId}?rel=0`}
                  title={data.title || 'YouTube video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Youtube className="h-12 w-12 text-[#9CA3AF]" />
                </div>
              )}
            </div>
            <TranscriptStatus />
            {data.transcriptStatus === 'error' && data.transcriptError && (
              <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#991B1B]">
                {data.transcriptError}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
              <button
                onClick={(event) => {
                  stopPropagation(event);
                  setIsEditing(true);
                }}
                className="rounded-md px-2.5 py-1 text-[#475569] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                Edit link
              </button>
              {data.url && (
                <button
                  onClick={openVideo}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[#1F2937] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" />
                  Open video
                </button>
              )}
              {hasTranscript && (
                <button
                  onClick={downloadTranscript}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[#1F2937] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                >
                  <Download className="h-3.5 w-3.5 text-[#94A3B8]" />
                  Export transcript
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="aspect-video rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="text-center">
              <Youtube className="h-10 w-10 text-[#9CA3AF] mx-auto mb-2.5" />
              <div className="text-[11px] text-[#6B7280] font-medium">Click to add video</div>
            </div>
          </div>
        )}
        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<YouTubeNodeData>)}
          nodeId={id}
          nodeType="youtube"
        />
      </div>
    </BaseNode>
  );
}
