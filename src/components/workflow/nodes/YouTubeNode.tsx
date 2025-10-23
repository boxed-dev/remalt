import { memo } from 'react';
import { Youtube, Loader2, CheckCircle2, AlertCircle, Download, ExternalLink, Users, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { SyntheticEvent } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { YouTubeNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';
import { extractChannelId } from '@/lib/api/youtube';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/, // Support YouTube Shorts
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isChannelUrl(url: string): boolean {
  return !!extractChannelId(url);
}

function formatViewCount(count: string): string {
  const num = parseInt(count);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${num}`;
}

function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const YouTubeNode = memo(({ id, data, parentId }: NodeProps<YouTubeNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(data.url || '');
  const [expandedVideos, setExpandedVideos] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const processedUrlRef = useRef<string | null>(null);

  const isChannel = data.mode === 'channel';
  const hasTranscript = useMemo(() => data.transcriptStatus === 'success' && !!data.transcript, [data.transcriptStatus, data.transcript]);
  const displayTitle = useMemo(() => {
    if (isChannel) return data.channelTitle;
    const trimmed = data.title?.trim();
    if (!trimmed || trimmed === 'YouTube Video') return undefined;
    return trimmed;
  }, [data.title, data.channelTitle, isChannel]);

  const selectedVideosCount = useMemo(() => {
    return data.channelVideos?.filter(v => v.selected).length || 0;
  }, [data.channelVideos]);

  type NativeEventWithStop = Event & { stopImmediatePropagation?: () => void };

  const stopReactFlowPropagation = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
    (event.nativeEvent as NativeEventWithStop).stopImmediatePropagation?.();
  }, []);

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
    // Only sync local URL with store data when not editing to prevent overwriting user input
    if (data.url && data.url !== url && !isEditing) {
      setUrl(data.url);
    }
  }, [data.url, url, isEditing]);

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
      if (!response.ok) return undefined;

      const metadata = await response.json();
      const title = typeof metadata.title === 'string' ? metadata.title.trim() : '';
      return title.length > 0 ? title : undefined;
    } catch (error) {
      console.warn('[YouTubeNode] Failed to fetch video title', error);
      return undefined;
    }
  }, []);

  const fetchChannelData = useCallback(async (channelUrl: string) => {
    updateNodeData(id, {
      channelLoadStatus: 'loading',
      channelError: undefined,
    } as Partial<YouTubeNodeData>);

    try {
      const response = await fetch(`/api/youtube/channel?url=${encodeURIComponent(channelUrl)}&maxResults=20`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch channel data');
      }

      const result = await response.json();

      updateNodeData(id, {
        channelId: result.channel.id,
        channelTitle: result.channel.title,
        channelDescription: result.channel.description,
        channelThumbnail: result.channel.thumbnail,
        channelSubscriberCount: result.channel.subscriberCount,
        channelVideoCount: result.channel.videoCount,
        channelCustomUrl: result.channel.customUrl,
        channelVideos: result.videos.map((v: any) => ({
          ...v,
          selected: false,
        })),
        channelLoadStatus: 'success',
        nextPageToken: result.nextPageToken,
      } as Partial<YouTubeNodeData>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch channel data';
      updateNodeData(id, {
        channelLoadStatus: 'error',
        channelError: message,
      } as Partial<YouTubeNodeData>);
    }
  }, [id, updateNodeData]);

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
      mode: 'video',
    } as Partial<YouTubeNodeData>);

    if (shouldFetchTitle) {
      const title = await fetchVideoTitle(safeUrl);
      if (title) {
        updateNodeData(id, { title } as Partial<YouTubeNodeData>);
      }
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
  }, [fetchTranscript, id, updateNodeData, fetchVideoTitle]);

  const processUrl = useCallback(async (inputUrl: string, silent = false) => {
    const safeUrl = inputUrl.trim();

    // Determine if it's a channel or video URL
    if (isChannelUrl(safeUrl)) {
      updateNodeData(id, {
        url: safeUrl,
        mode: 'channel',
      } as Partial<YouTubeNodeData>);
      await fetchChannelData(safeUrl);
    } else {
      await processVideoUrl(safeUrl, silent);
    }
  }, [id, updateNodeData, fetchChannelData, processVideoUrl]);

  useEffect(() => {
    if (!data.url) return;

    const node = useWorkflowStore.getState().getNode(id);
    if (node?.type === 'youtube') {
      const nodeData = node.data as YouTubeNodeData;
      if (nodeData.mode === 'channel' && nodeData.channelLoadStatus && nodeData.channelLoadStatus !== 'loading') {
        processedUrlRef.current = data.url;
        return;
      }
      if (nodeData.videoId && nodeData.transcriptStatus && nodeData.transcriptStatus !== 'loading') {
        processedUrlRef.current = data.url;
        return;
      }
    }

    if (processedUrlRef.current === data.url) return;

    processedUrlRef.current = data.url;
    void processUrl(data.url, true);
  }, [data.url, id, processUrl]);

  const handleSave = async () => {
    // Prevent multiple simultaneous saves
    if (!isEditing) return;

    // Immediately exit edit mode to prevent UI issues
    setIsEditing(false);

    if (url.trim()) {
      await processUrl(url.trim());
      // Sync local state with the processed URL to prevent inconsistencies
      setUrl(url.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent blur event from firing
      handleSave();
    } else if (e.key === 'Escape') {
      setUrl(data.url || '');
      setIsEditing(false);
    }
  };

  const downloadTranscript = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    if (!data.transcript) return;

    const blob = new Blob([data.transcript], { type: 'text/plain;charset=utf-8' });
    const urlObject = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObject;
    link.download = `${data.videoId || 'transcript'}.txt`;
    link.click();
    URL.revokeObjectURL(urlObject);
  };

  const downloadAllTranscripts = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    const selectedVideos = data.channelVideos?.filter(v => v.selected && v.transcript) || [];
    if (selectedVideos.length === 0) return;

    const allTranscripts = selectedVideos.map(v =>
      `=== ${v.title} ===\n\n${v.transcript}\n\n`
    ).join('\n');

    const blob = new Blob([allTranscripts], { type: 'text/plain;charset=utf-8' });
    const urlObject = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObject;
    link.download = `${data.channelTitle || 'channel'}-transcripts.txt`;
    link.click();
    URL.revokeObjectURL(urlObject);
  };

  const openVideo = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
  };

  const toggleVideoSelection = async (videoId: string) => {
    const videos = data.channelVideos || [];
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) return;

    const video = videos[videoIndex];
    const newSelected = !video.selected;

    // Update selection
    let updatedVideos = [...videos];
    updatedVideos[videoIndex] = { ...video, selected: newSelected };

    updateNodeData(id, {
      channelVideos: updatedVideos,
    } as Partial<YouTubeNodeData>);

    // If selecting and no transcript, fetch it
    if (newSelected && !video.transcript && video.transcriptStatus !== 'loading') {
      // Create a new array with the loading status
      updatedVideos = [...videos];
      updatedVideos[videoIndex] = { ...video, selected: newSelected, transcriptStatus: 'loading' };
      updateNodeData(id, { channelVideos: updatedVideos } as Partial<YouTubeNodeData>);

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`[YouTubeNode] Fetching transcript for channel video: ${videoId}`);
      const result = await fetchTranscript(videoUrl);
      console.log(`[YouTubeNode] Transcript fetch result for ${videoId}:`, result.status, result.method);

      // Get fresh state after async operation
      const currentState = useWorkflowStore.getState().getNode(id);
      const currentVideos = (currentState?.type === 'youtube' ? (currentState.data as YouTubeNodeData).channelVideos : undefined) || [];
      const currentIndex = currentVideos.findIndex(v => v.id === videoId);

      if (currentIndex !== -1) {
        const newVideos = [...currentVideos];
        newVideos[currentIndex] = {
          ...newVideos[currentIndex],
          transcript: result.transcript,
          transcriptStatus: result.status,
        };

        updateNodeData(id, { channelVideos: newVideos } as Partial<YouTubeNodeData>);
      }
    }
  };

  // Transcript status indicator for single video
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

  // Render channel view
  const renderChannelView = () => (
    <div className="w-[480px] space-y-3">
      {/* Channel Header */}
      <div className="flex gap-3">
        {data.channelThumbnail && (
          <img
            src={data.channelThumbnail}
            alt={data.channelTitle}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px] text-[#0F172A] truncate">{data.channelTitle}</div>
          <div className="flex items-center gap-3 text-[11px] text-[#64748B] mt-1">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {parseInt(data.channelSubscriberCount || '0').toLocaleString()} subscribers
            </span>
            <span>{data.channelVideoCount} videos</span>
          </div>
        </div>
      </div>

      {/* Channel Description */}
      {data.channelDescription && (
        <div className="text-[11px] text-[#475569] line-clamp-2">
          {data.channelDescription}
        </div>
      )}

      {/* Loading/Error States */}
      {data.channelLoadStatus === 'loading' && (
        <div className="flex items-center gap-2 text-[12px] text-[#475569] py-4">
          <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
          <span>Loading channel videos...</span>
        </div>
      )}

      {data.channelLoadStatus === 'error' && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#991B1B]">
          {data.channelError}
        </div>
      )}

      {/* Videos List */}
      {data.channelVideos && data.channelVideos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-[#F8FAFC] -mx-3 px-3 py-2 rounded-lg">
            <div className="text-[12px] font-medium text-[#0F172A]">
              {data.channelVideos.length} Videos ({selectedVideosCount} selected)
            </div>
            <button
              onClick={(e) => {
                stopPropagation(e);
                setExpandedVideos(!expandedVideos);
              }}
              className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 font-medium cursor-pointer"
            >
              {expandedVideos ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show all
                </>
              )}
            </button>
          </div>

          {expandedVideos && (
            <div
              className="space-y-2 max-h-[500px] overflow-y-auto pr-2 -mr-2"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E1 #F1F5F9',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
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
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  width: 8px;
                }
                div::-webkit-scrollbar-track {
                  background: #F1F5F9;
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb {
                  background: #CBD5E1;
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: #94A3B8;
                }
              `}</style>
              {data.channelVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={(e) => {
                    stopPropagation(e);
                    toggleVideoSelection(video.id);
                  }}
                  className={`
                    relative rounded-lg border p-2.5 cursor-pointer transition-all flex-shrink-0
                    ${video.selected
                      ? 'border-[#2563EB] bg-[#EFF6FF] shadow-sm'
                      : 'border-[#E5E7EB] bg-white hover:border-[#94A3B8]'
                    }
                  `}
                >
                  <div className="flex gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-36 h-20 object-cover rounded"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/90 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                        {formatDuration(video.duration)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-[#0F172A] line-clamp-2 mb-1 leading-tight">
                        {video.title}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        {formatViewCount(video.viewCount)} views
                      </div>
                      {video.selected && (
                        <div className="mt-1.5">
                          {video.transcriptStatus === 'loading' && (
                            <div className="flex items-center gap-1 text-[9px] text-[#475569]">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              Loading transcript...
                            </div>
                          )}
                          {video.transcriptStatus === 'success' && (
                            <div className="flex items-center gap-1 text-[9px] text-[#0F766E] font-medium">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Transcript ready
                            </div>
                          )}
                          {video.transcriptStatus === 'unavailable' && (
                            <div className="flex items-center gap-1 text-[9px] text-[#B45309]">
                              <AlertCircle className="h-2.5 w-2.5" />
                              No captions
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {video.selected && (
                      <div className="absolute top-2 right-2 bg-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
        <button
          onClick={(event) => {
            stopPropagation(event);
            setIsEditing(true);
          }}
          className="rounded-md px-2.5 py-1 text-[#475569] border border-[#E5E7EB] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] hover:border-[#D1D5DB] cursor-pointer"
        >
          Edit link
        </button>
        {data.url && (
          <button
            onClick={openVideo}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[#1F2937] border border-[#E5E7EB] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] hover:border-[#D1D5DB] cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" />
            Open channel
          </button>
        )}
        {selectedVideosCount > 0 && (
          <button
            onClick={downloadAllTranscripts}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[#1F2937] border border-[#E5E7EB] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] hover:border-[#D1D5DB] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#94A3B8]" />
            Export ({selectedVideosCount})
          </button>
        )}
      </div>
    </div>
  );

  // Render single video view
  const renderVideoView = () => (
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
          onKeyDown={handleKeyDown}
          placeholder="Paste YouTube URL or channel..."
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
              className="rounded-md px-2.5 py-1 text-[#475569] border border-[#E5E7EB] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] hover:border-[#D1D5DB] cursor-pointer"
            >
              Edit link
            </button>
            {data.url && (
              <button
                onClick={openVideo}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[#1F2937] border border-[#E5E7EB] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] hover:border-[#D1D5DB] cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" />
                Open video
              </button>
            )}
            {hasTranscript && (
              <button
                onClick={downloadTranscript}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[#1F2937] border border-[#E5E7EB] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] hover:border-[#D1D5DB] cursor-pointer"
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
            <div className="text-[11px] text-[#6B7280] font-medium">Click to add video/channel</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <BaseNode
      id={id}
      type={isChannel ? 'YouTube Channel' : 'YouTube'}
      icon={isChannel ? <Users className="h-3.5 w-3.5 text-red-600" /> : <Youtube className="h-3.5 w-3.5 text-red-600" />}
      iconBg="bg-red-100"
      showTargetHandle={false}
      allowOverflow={true}
      parentId={parentId}
    >
      {isChannel ? renderChannelView() : renderVideoView()}
      <AIInstructionsInline
        value={data.aiInstructions}
        onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<YouTubeNodeData>)}
        nodeId={id}
        nodeType="youtube"
      />
    </BaseNode>
  );
});
