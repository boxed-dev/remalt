import { memo } from 'react';
import { Instagram, Loader2, CheckCircle2, ExternalLink, Heart, Eye, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { SyntheticEvent } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { InstagramNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';

function extractPostCode(url: string): string | null {
  // If it's already just a code (alphanumeric, ~11 chars)
  if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length < 20) {
    return url;
  }

  // Try to extract from URL - supports reels, posts, and stories
  const patterns = [
    /instagram\.com\/reel\/([^/?]+)/,
    /instagram\.com\/p\/([^/?]+)/,
    /instagram\.com\/reels\/([^/?]+)/,
    /instagram\.com\/tv\/([^/?]+)/,
    /instagram\.com\/stories\/[^/]+\/([^/?]+)/, // Stories pattern: /stories/username/storyid
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${num}`;
}

export const InstagramNode = memo(({ id, data, parentId }: NodeProps<InstagramNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(data.url || '');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  function formatDateShort(iso?: string): string | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    return d.toLocaleString();
  }

  function formatTimeLeft(expiresAt?: string): string | undefined {
    if (!expiresAt) return undefined;
    const now = Date.now();
    const exp = new Date(expiresAt).getTime();
    if (isNaN(exp)) return undefined;
    const diffMs = exp - now;
    if (diffMs <= 0) return 'expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  // Determine if this is a carousel post
  const isCarousel = data.postType === 'Sidecar' && data.images && data.images.length > 1;

  // Debug logging
  useEffect(() => {
    console.log('[InstagramNode Render] id:', id);
    console.log('[InstagramNode Render] data.postType:', data.postType);
    console.log('[InstagramNode Render] data.images:', data.images);
    console.log('[InstagramNode Render] isCarousel:', isCarousel);
  }, [id, data.postType, data.images, isCarousel]);

  // Proxy Instagram CDN URLs through our backend to avoid CORS issues
  // UploadCare URLs are used directly as they're permanent and don't require proxying
  const getProxiedThumbnail = useCallback((url: string | undefined): string => {
    if (!url) return '';

    // UploadCare URLs can be used directly (no proxy needed)
    if (url.includes('ucarecdn.com')) {
      return url;
    }

    // If it's an Instagram CDN URL, proxy it
    if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
      return `/api/instagram/proxy-image?url=${encodeURIComponent(url)}`;
    }

    return url;
  }, []);

  // Prefer UploadCare CDN URL for permanent storage, fallback to Instagram CDN
  // For videos: use uploadcareThumbnailUrl (permanent thumbnail image)
  // For images: use uploadcareCdnUrl (permanent image)
  const [thumbnailSrc, setThumbnailSrc] = useState(() => {
    if (data.isVideo) {
      return data.uploadcareThumbnailUrl || getProxiedThumbnail(data.thumbnail) || data.thumbnailFallback || '';
    }
    return data.uploadcareCdnUrl || getProxiedThumbnail(data.thumbnail) || data.thumbnailFallback || '';
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const processedUrlRef = useRef<string | null>(null);

  const hasReelData = data.fetchStatus === 'success' && (!!data.videoUrl || !!data.thumbnail || data.isVideo === false);

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

  useEffect(() => {
    // Prefer UploadCare CDN URL for permanent storage
    // For videos: use uploadcareThumbnailUrl (permanent thumbnail image)
    // For images: use uploadcareCdnUrl (permanent image)
    const nextThumbnail = data.isVideo
      ? (data.uploadcareThumbnailUrl || getProxiedThumbnail(data.thumbnail) || data.thumbnailFallback || '')
      : (data.uploadcareCdnUrl || getProxiedThumbnail(data.thumbnail) || data.thumbnailFallback || '');
    setThumbnailSrc(nextThumbnail);
  }, [data.isVideo, data.uploadcareCdnUrl, data.uploadcareThumbnailUrl, data.thumbnail, data.thumbnailFallback, getProxiedThumbnail]);

  // Reset carousel index when URL changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [data.url]);

  const fetchReelData = useCallback(async (reelUrl: string) => {
    const reelCode = extractPostCode(reelUrl);
    if (!reelCode) {
      updateNodeData(id, {
        fetchStatus: 'error',
        fetchError: 'Invalid Instagram URL',
      } as Partial<InstagramNodeData>);
      return;
    }

    // Skip if already processed
    if (processedUrlRef.current === reelUrl) {
      return;
    }
    processedUrlRef.current = reelUrl;

    updateNodeData(id, {
      url: reelUrl,
      reelCode,
      fetchStatus: 'loading',
      fetchError: undefined,
      thumbnail: undefined,
      thumbnailFallback: undefined,
    } as Partial<InstagramNodeData>);

    try {
      const response = await fetch('/api/instagram/reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: reelUrl }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        updateNodeData(id, {
          fetchStatus: 'error',
          fetchError: result.error || 'Failed to fetch reel data',
        } as Partial<InstagramNodeData>);
        return;
      }

      console.log('[InstagramNode] API Response:', result);
      console.log('[InstagramNode] Thumbnail:', result.thumbnail);
      console.log('[InstagramNode] Thumbnail Fallback:', result.thumbnailFallback);
      console.log('[InstagramNode] Images array:', result.images);
      console.log('[InstagramNode] Post Type:', result.postType);

      updateNodeData(id, {
        fetchStatus: 'success',
        videoUrl: result.videoUrl,
        thumbnail: result.thumbnail,
        images: result.images,
        caption: result.caption,
        author: result.author,
        likes: result.likes,
        views: result.views,
        comments: result.comments,
        duration: result.duration,
        isVideo: result.isVideo,
        postType: result.postType,
        isStory: result.isStory,
        takenAt: result.takenAt,
        expiresAt: result.expiresAt,
        permalink: result.permalink,
        // UploadCare backup fields (from new nested structure)
        uploadcareCdnUrl: result.uploadcare?.primaryCdnUrl,
        uploadcareUuid: result.uploadcare?.primaryUuid,
        uploadcareThumbnailUrl: result.uploadcare?.thumbnailCdnUrl,
        uploadcareThumbnailUuid: result.uploadcare?.thumbnailUuid,
        uploadcareImages: result.uploadcare?.carouselUrls,
        uploadcareImageUuids: result.uploadcare?.carouselUuids,
        backupStatus: result.uploadcare?.status,
        backupError: result.uploadcare?.errors?.join(', '),
        // Original URLs for fallback
        originalVideoUrl: result.originalVideoUrl,
        originalThumbnail: result.originalThumbnail,
        originalImages: result.originalImages,
      } as Partial<InstagramNodeData>);

      console.log('[InstagramNode] After updateNodeData - data.images:', data.images);
      console.log('[InstagramNode] After updateNodeData - data.postType:', data.postType);

      // UploadCare backup is now handled server-side in /api/instagram/reel
      // Old processing code removed to prevent duplicate downloads

    } catch (error) {
      updateNodeData(id, {
        fetchStatus: 'error',
        fetchError: error instanceof Error ? error.message : 'Unknown error',
      } as Partial<InstagramNodeData>);
    }
  }, [id, updateNodeData]);

  const handleUrlSubmit = useCallback(async () => {
    if (url.trim()) {
      await fetchReelData(url.trim());
      // Sync local state with the submitted URL to prevent inconsistencies
      setUrl(url.trim());
    }
    setIsEditing(false);
  }, [url, fetchReelData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUrlSubmit();
      } else if (e.key === 'Escape') {
        setUrl(data.url || '');
        setIsEditing(false);
      }
    },
    [handleUrlSubmit, data.url]
  );

  // Auto-fetch on mount if URL exists but no data
  useEffect(() => {
    if (data.url && !data.videoUrl && data.fetchStatus === 'idle') {
      fetchReelData(data.url);
    }
  }, [data.url, data.videoUrl, data.fetchStatus, fetchReelData]);

  const renderStatus = () => {
    if (data.storageStatus === 'uploading' || data.analysisStatus === 'analyzing') {
      const message = data.storageStatus === 'uploading'
        ? 'Uploading video...'
        : data.isVideo
          ? 'Analyzing video...'
          : 'Analyzing image...';
      return (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{message}</span>
        </div>
      );
    }
    if (data.analysisStatus === 'success') {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle2 className="w-3 h-3" />
          <span>Analysis complete</span>
        </div>
      );
    }
    if (data.storageStatus === 'error' || data.analysisStatus === 'error') {
        return (
            <div className="p-2 text-center text-red-600 bg-red-50 rounded-lg">
                <p className="text-[11px] font-medium">{data.analysisError || 'An error occurred'}</p>
            </div>
        );
    }
    return null;
  };

  return (
    <BaseNode
      id={id}
      type="instagram"
      icon={<Instagram className="h-3.5 w-3.5 text-[#E4405F]" />}
      iconBg="bg-[#E4405F]/10"
      parentId={parentId}
    >
      <div className="w-[320px] space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-[#E4405F]/10 rounded-full">
              <Instagram className="w-4 h-4 text-[#E4405F]" />
            </div>
            <span className="text-[14px] font-medium text-gray-800">
              {data.isStory ? 'Instagram Story' : 'Instagram Post'}
            </span>
          </div>
          {hasReelData && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              <span>Loaded</span>
            </div>
          )}
        </div>

        {/* URL Input / Author Info */}
        {isEditing ? (
          <div className="relative" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleUrlSubmit}
              placeholder="Paste Instagram URL..."
              className="w-full px-3 py-2 text-[12px] border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E4405F] focus:border-[#E4405F] transition-all"
              onClick={stopReactFlowPropagation}
            />
          </div>
        ) : hasReelData && data.author ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.author.profilePicUrl && (
                <img
                  src={getProxiedThumbnail(data.author.profilePicUrl)}
                  alt={data.author.username}
                  className="w-7 h-7 rounded-full border-2 border-white shadow"
                  crossOrigin="anonymous"
                />
              )}
              <span className="text-[12px] font-medium text-gray-700">@{data.author.username}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="text-[10px] text-gray-500 hover:text-[#E4405F] font-medium"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="w-full px-3 py-2 text-[12px] text-left text-gray-500 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#E4405F] hover:text-[#E4405F] transition-colors"
          >
            Click to add Instagram URL...
          </button>
        )}

        {/* Content Area */}
        <div className="space-y-2">
          {data.fetchStatus === 'loading' && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-[12px]">Fetching post...</span>
            </div>
          )}

          {data.fetchStatus === 'error' && (
            <div className="p-2 text-center text-red-600 bg-red-50 rounded-lg">
              <p className="text-[11px] font-medium">{data.fetchError}</p>
            </div>
          )}

              {hasReelData && (
                <div className="space-y-2">
                  {/* Image/Carousel Display */}
                  <div className="relative group rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {/* Display current image */}
                    <img
                      src={
                        isCarousel
                          ? (data.uploadcareImages?.[currentImageIndex] || getProxiedThumbnail(data.images![currentImageIndex]))
                          : (thumbnailSrc || data.thumbnailFallback || `https://image.microlink.io/${encodeURIComponent(data.url || '')}`)
                      }
                      alt={isCarousel ? `Carousel image ${currentImageIndex + 1}` : 'Post thumbnail'}
                      className="w-full h-auto object-cover aspect-square"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.log('[InstagramNode] Image load failed:', target.src);

                        // Try thumbnailFallback if not already tried
                        if (data.thumbnailFallback && target.src !== data.thumbnailFallback) {
                          console.log('[InstagramNode] Trying thumbnailFallback:', data.thumbnailFallback);
                          target.src = data.thumbnailFallback;
                        }
                        // Try Microlink as last resort
                        else if (data.url && !target.src.includes('microlink.io')) {
                          const microlinkUrl = `https://image.microlink.io/${encodeURIComponent(data.url)}`;
                          console.log('[InstagramNode] Trying Microlink fallback:', microlinkUrl);
                          target.src = microlinkUrl;
                        }
                        // All fallbacks failed - show placeholder
                        else {
                          console.error('[InstagramNode] All thumbnail sources failed');
                          target.style.display = 'none';
                        }
                      }}
                    />

                    {/* External Link Overlay - Only show when NOT a carousel */}
                    {data.url && !isCarousel && (
                      <a
                        href={data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={stopReactFlowPropagation}
                      >
                        <ExternalLink className="w-6 h-6 text-white" />
                      </a>
                    )}

                    {/* Carousel Navigation */}
                    {isCarousel && data.images!.length > 1 && (
                            <>
                              {/* Previous Button */}
                              {currentImageIndex > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(prev => Math.max(0, prev - 1));
                                  }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                  onMouseDown={stopPropagation}
                                  onTouchStart={stopPropagation}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                              )}

                              {/* Next Button */}
                              {currentImageIndex < data.images!.length - 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(prev => Math.min(data.images!.length - 1, prev + 1));
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                  onMouseDown={stopPropagation}
                                  onTouchStart={stopPropagation}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}

                              {/* Carousel Indicator Dots */}
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                {data.images!.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentImageIndex(idx);
                                    }}
                                    onMouseDown={stopPropagation}
                                    onTouchStart={stopPropagation}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                      idx === currentImageIndex
                                        ? 'bg-white w-4'
                                        : 'bg-white/50 hover:bg-white/70'
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* External Link Icon for Carousel (top-right corner) */}
                              {data.url && (
                                <a
                                  href={data.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                  onClick={stopReactFlowPropagation}
                                  onMouseDown={stopPropagation}
                                  onTouchStart={stopPropagation}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </>
                          )}
                  </div>

              {/* Backup Status Warnings */}
              {data.backupStatus === 'failed' && (
                <div className="p-2 text-[11px] text-red-800 bg-red-50 rounded-lg border border-red-200 space-y-0.5">
                  <p className="font-medium">⚠️ Media backup failed{data.isStory ? ' - story will expire after 24 hours' : ''}</p>
                  {data.backupError && (
                    <p className="text-[10px]">Error: {data.backupError}</p>
                  )}
                  {data.isStory && data.expiresAt && (
                    <p className="text-[10px]">Expires: {formatDateShort(data.expiresAt)} {formatTimeLeft(data.expiresAt) && `(${formatTimeLeft(data.expiresAt)} left)`}</p>
                  )}
                </div>
              )}
              {data.backupStatus === 'partial' && (
                <div className="p-2 text-[11px] text-yellow-800 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="font-medium">⚠️ Partial backup - some media may be unavailable later</p>
                  {data.backupError && (
                    <p className="text-[10px]">Details: {data.backupError}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 text-[11px] text-gray-500 pt-1">
                {data.likes !== undefined && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{formatNumber(data.likes)}</span>
                  </div>
                )}
                {data.views !== undefined && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{formatNumber(data.views)}</span>
                  </div>
                )}
                {data.comments !== undefined && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{formatNumber(data.comments)}</span>
                  </div>
                )}
              </div>
              {renderStatus()}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  );
});

InstagramNode.displayName = 'InstagramNode';
