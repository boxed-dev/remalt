import { memo } from 'react';
import { Linkedin, Loader2, CheckCircle2, ExternalLink, ThumbsUp, MessageCircle, Repeat2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { SyntheticEvent } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { LinkedInNodeData } from '@/types/workflow';

function extractPostId(url: string): string | null {
  // LinkedIn post URL patterns:
  // https://www.linkedin.com/posts/username_activity-id
  // https://www.linkedin.com/feed/update/urn:li:activity:id
  const patterns = [
    /linkedin\.com\/posts\/[^_]+_([^/?]+)/,
    /linkedin\.com\/feed\/update\/urn:li:activity:(\d+)/,
    /activity[:-](\d+)/,
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

export const LinkedInNode = memo(({ id, data, parentId }: NodeProps<LinkedInNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(data.url || '');
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const processedUrlRef = useRef<string | null>(null);

  const hasPostData = data.fetchStatus === 'success' && !!data.content;

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
    if (data.url && data.url !== url) {
      setUrl(data.url);
    }
  }, [data.url, url]);

  const fetchPostData = useCallback(async (postUrl: string) => {
    const postId = extractPostId(postUrl);
    if (!postId) {
      updateNodeData(id, {
        fetchStatus: 'error',
        fetchError: 'Invalid LinkedIn URL',
      } as Partial<LinkedInNodeData>);
      return;
    }

    // Skip if already processed
    if (processedUrlRef.current === postUrl) {
      return;
    }
    processedUrlRef.current = postUrl;

    updateNodeData(id, {
      url: postUrl,
      postId,
      fetchStatus: 'loading',
      fetchError: undefined,
    } as Partial<LinkedInNodeData>);

    try {
      const response = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: postUrl }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        updateNodeData(id, {
          fetchStatus: 'error',
          fetchError: result.error || 'Failed to fetch LinkedIn post',
        } as Partial<LinkedInNodeData>);
        return;
      }

      updateNodeData(id, {
        fetchStatus: 'success',
        content: result.content,
        imageUrl: result.imageUrl,
        videoUrl: result.videoUrl,
        author: result.author,
        reactions: result.reactions,
        comments: result.comments,
        reposts: result.reposts,
        postType: result.postType,
      } as Partial<LinkedInNodeData>);

    } catch (error) {
      updateNodeData(id, {
        fetchStatus: 'error',
        fetchError: error instanceof Error ? error.message : 'Unknown error',
      } as Partial<LinkedInNodeData>);
    }
  }, [id, updateNodeData]);

  const handleUrlSubmit = useCallback(() => {
    if (url.trim()) {
      fetchPostData(url.trim());
    }
    setIsEditing(false);
  }, [url, fetchPostData]);

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
    if (data.url && !data.content && data.fetchStatus === 'idle') {
      fetchPostData(data.url);
    }
  }, [data.url, data.content, data.fetchStatus, fetchPostData]);

  return (
    <BaseNode
      id={id}
      type="linkedin"
      icon={<Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />}
      iconBg="bg-[#0A66C2]/10"
      parentId={parentId}
    >
      <div className="w-[420px] space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-[#0A66C2]/10 rounded-full">
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            </div>
            <span className="text-[14px] font-medium text-gray-800">LinkedIn Post</span>
          </div>
          {hasPostData && (
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
              placeholder="Paste LinkedIn post URL..."
              className="w-full px-3 py-2 text-[12px] border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0A66C2] focus:border-[#0A66C2] transition-all"
              onClick={stopReactFlowPropagation}
            />
          </div>
        ) : hasPostData && data.author ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.author.profilePicUrl && (
                <img
                  src={data.author.profilePicUrl}
                  alt={data.author.name}
                  className="w-7 h-7 rounded-full border-2 border-white shadow"
                />
              )}
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-gray-700">{data.author.name}</span>
                {data.author.headline && (
                  <span className="text-[10px] text-gray-500 line-clamp-1">{data.author.headline}</span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="text-[10px] text-gray-500 hover:text-[#0A66C2] font-medium"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="w-full px-3 py-2 text-[12px] text-left text-gray-500 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
          >
            Click to add LinkedIn post URL...
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

          {hasPostData && (
            <div className="space-y-2">
              {/* Post Content */}
              {data.content && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className={`text-[11px] text-gray-700 whitespace-pre-wrap ${!isContentExpanded ? 'line-clamp-4' : ''}`}>
                    {data.content}
                  </p>
                  {data.content.length > 200 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsContentExpanded(!isContentExpanded);
                      }}
                      className="mt-2 text-[10px] text-[#0A66C2] hover:underline font-medium"
                    >
                      {isContentExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}

              {/* Image Preview */}
              {data.imageUrl && !imageError && (
                <div className="relative group rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={data.imageUrl}
                    alt="LinkedIn post"
                    className="w-full h-auto object-cover max-h-48"
                    onError={() => setImageError(true)}
                    loading="lazy"
                  />
                  {data.url && (
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
                </div>
              )}
              {data.imageUrl && imageError && (
                <div className="p-3 bg-gray-100 rounded-lg border border-gray-300 text-center">
                  <p className="text-[11px] text-gray-500">Image failed to load</p>
                  {data.url && (
                    <a
                      href={data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#0A66C2] hover:underline mt-1 inline-block"
                      onClick={stopReactFlowPropagation}
                    >
                      View on LinkedIn
                    </a>
                  )}
                </div>
              )}

              {/* Engagement Metrics */}
              <div className="flex items-center justify-end gap-3 text-[11px] text-gray-500 pt-1">
                {data.reactions !== undefined && (
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{formatNumber(data.reactions)}</span>
                  </div>
                )}
                {data.comments !== undefined && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{formatNumber(data.comments)}</span>
                  </div>
                )}
                {data.reposts !== undefined && (
                  <div className="flex items-center gap-1">
                    <Repeat2 className="w-3 h-3" />
                    <span>{formatNumber(data.reposts)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  );
});

LinkedInNode.displayName = 'LinkedInNode';
