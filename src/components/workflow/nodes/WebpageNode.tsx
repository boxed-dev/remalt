import { memo } from 'react';
import { Globe, Loader2, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { WebpageNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';

const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

type WebpagePreviewData = {
  title?: string;
  description?: string;
  imageUrl?: string;
  themeColor?: string;
};

type WebpageAnalysisData = {
  pageTitle?: string;
  pageContent?: string;
  metadata?: WebpageNodeData['metadata'];
};

type CacheRecord<T> = {
  data: T;
  fetchedAt: number;
};

const previewCache = new Map<string, CacheRecord<WebpagePreviewData>>();
const analysisCache = new Map<string, CacheRecord<WebpageAnalysisData>>();

function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidates = [trimmed, `https://${trimmed}`];

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      parsed.hash = '';
      return parsed.toString();
    } catch {
      continue;
    }
  }
  return null;
}

function getCachedEntry<T>(cache: Map<string, CacheRecord<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedEntry<T>(cache: Map<string, CacheRecord<T>>, key: string, data: T) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export const WebpageNode = memo(({ id, data, parentId }: NodeProps<WebpageNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(data.url || '');
  const [showSummary, setShowSummary] = useState(false);
  const [previewState, setPreviewState] = useState<{
    url: string | null;
    status: 'idle' | 'loading' | 'success' | 'error';
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      themeColor?: string;
    } | null;
    error?: string;
  }>({ url: null, status: 'idle', data: null });
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const scrapeControllerRef = useRef<AbortController | null>(null);

  const canPreview = useMemo(() => !!data.url, [data.url]);
  const hasTextSummary = useMemo(() => !!data.pageContent, [data.pageContent]);

  const handleSave = async () => {
    const normalized = normalizeUrl(url) ?? url.trim();
    if (!normalized) {
      setIsEditing(false);
      return;
    }

    setShowSummary(false);
    setPreviewState({ url: null, status: 'idle', data: null });

    // Sync local state with the submitted URL to prevent inconsistencies
    setUrl(normalized);

    updateNodeData(id, {
      url: normalized,
    } as Partial<WebpageNodeData>);

    await triggerScrape(normalized);
    setIsEditing(false);
  };

  const triggerScrape = useCallback(async (targetUrl?: string) => {
    const node = useWorkflowStore.getState().getNode(id);
    const nodeData = node?.type === 'webpage' ? (node.data as WebpageNodeData) : undefined;
    const rawUrl = targetUrl ?? nodeData?.url ?? data.url;
    const normalizedUrl = normalizeUrl(rawUrl);

    if (!normalizedUrl) {
      return;
    }

    const cachedAnalysis = getCachedEntry(analysisCache, normalizedUrl);
    if (cachedAnalysis) {
      updateNodeData(id, {
        pageTitle: cachedAnalysis.pageTitle,
        pageContent: cachedAnalysis.pageContent,
        metadata: cachedAnalysis.metadata,
        scrapeStatus: 'success',
        scrapeError: undefined,
      } as Partial<WebpageNodeData>);
      return;
    }

    updateNodeData(id, {
      url: rawUrl,
      scrapeStatus: 'scraping',
      scrapeError: undefined,
    } as Partial<WebpageNodeData>);

    if (scrapeControllerRef.current) {
      scrapeControllerRef.current.abort();
    }

    const controller = new AbortController();
    scrapeControllerRef.current = controller;

    try {
      const response = await fetch('/api/webpage/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
        signal: controller.signal,
      });

      const result = await response.json();

      if (response.ok) {
        const payload: WebpageAnalysisData = {
          pageTitle: result.pageTitle,
          pageContent: result.pageContent,
          metadata: result.metadata,
        };
        setCachedEntry(analysisCache, normalizedUrl, payload);
        updateNodeData(id, {
          ...payload,
          scrapeStatus: 'success',
          scrapeError: undefined,
        } as Partial<WebpageNodeData>);
      } else {
        updateNodeData(id, {
          scrapeStatus: 'error',
          scrapeError: result?.error || `Failed to analyze webpage (status ${response.status})`,
        } as Partial<WebpageNodeData>);
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('Webpage analysis failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze webpage';
      updateNodeData(id, {
        scrapeStatus: 'error',
        scrapeError: message,
      } as Partial<WebpageNodeData>);
    } finally {
      if (scrapeControllerRef.current === controller) {
        scrapeControllerRef.current = null;
      }
    }
  }, [data.url, id, updateNodeData]);

  const renderStatus = () => {
    if (data.scrapeStatus === 'scraping')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#E0F2FE] px-2 py-1 text-[10px] text-[#0369A1]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Scraping</span>
        </div>
      );

    if (data.scrapeStatus === 'success')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-1 text-[10px] text-[#047857]">
          <CheckCircle2 className="h-3 w-3" />
          <span>Content ready</span>
        </div>
      );

    if (data.scrapeStatus === 'error')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-1 text-[10px] text-[#B91C1C]">
          <AlertCircle className="h-3 w-3" />
          <span>Scrape failed</span>
        </div>
      );

    return null;
  };

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  const handleRescrape = async (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    setShowSummary(false);
    const normalized = normalizeUrl(data.url);
    if (normalized) {
      analysisCache.delete(normalized);
      previewCache.delete(normalized);
      setPreviewState({ url: normalized, status: 'loading', data: null, error: undefined });
      void fetchPreview(normalized);
      await triggerScrape(normalized);
    } else {
      setPreviewState({ url: null, status: 'idle', data: null });
      await triggerScrape();
    }
  };

  const openInNewTab = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    if (data.url)
      window.open(data.url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => () => {
    if (scrapeControllerRef.current) {
      scrapeControllerRef.current.abort();
      scrapeControllerRef.current = null;
    }
  }, []);

  const fetchPreview = useCallback(async (targetUrl: string) => {
    const normalizedUrl = normalizeUrl(targetUrl);
    if (!normalizedUrl) {
      return;
    }

    const cachedPreview = getCachedEntry(previewCache, normalizedUrl);
    if (cachedPreview) {
      setPreviewState((prev) => (
        prev.url === normalizedUrl && prev.status === 'success'
          ? prev
          : {
              url: normalizedUrl,
              status: 'success',
              data: cachedPreview,
              error: undefined,
            }
      ));
      return;
    }

    setPreviewState((prev) => (
      prev.url === normalizedUrl && prev.status === 'loading'
        ? prev
        : {
            url: normalizedUrl,
            status: 'loading',
            data: null,
            error: undefined,
          }
    ));

    try {
      const htmlResponse = await fetch('/api/webpage/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!htmlResponse.ok) {
        const result = await htmlResponse.json().catch(() => ({}));
        throw new Error(result.error || `Preview request failed with ${htmlResponse.status}`);
      }

      const { title, description, imageUrl, themeColor } = await htmlResponse.json();

      const previewData: WebpagePreviewData = {
        imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
        title,
        description,
        themeColor,
      };

      setCachedEntry(previewCache, normalizedUrl, previewData);
      setPreviewState({
        url: normalizedUrl,
        status: 'success',
        data: previewData,
        error: undefined,
      });
    } catch (error: unknown) {
      console.error('Failed to load preview', error);
      const message = error instanceof Error ? error.message : 'Unable to load preview';
      setPreviewState({
        url: normalizedUrl,
        status: 'error',
        data: null,
        error: message,
      });
    }
  }, []);

  useEffect(() => {
    // Only sync local URL with store data when not editing to prevent overwriting user input
    if (data.url && data.url !== url && !isEditing) {
      setUrl(data.url);
    }
  }, [data.url, url, isEditing]);

  useEffect(() => {
    if (!data.url) {
      return;
    }

    const normalized = normalizeUrl(data.url);
    if (!normalized) {
      return;
    }

    const cachedPreview = getCachedEntry(previewCache, normalized);
    if (cachedPreview) {
      setPreviewState((prev) => (
        prev.url === normalized && prev.status === 'success'
          ? prev
          : {
              url: normalized,
              status: 'success',
              data: cachedPreview,
              error: undefined,
            }
      ));
    } else {
      setPreviewState((prev) => (
        prev.url === normalized && prev.status === 'loading'
          ? prev
          : {
              url: normalized,
              status: 'loading',
              data: null,
              error: undefined,
            }
      ));
      void fetchPreview(normalized);
    }

    const cachedAnalysis = getCachedEntry(analysisCache, normalized);
    if (cachedAnalysis) {
      const nodeData = useWorkflowStore.getState().getNode(id)?.data as WebpageNodeData | undefined;
      if (nodeData?.scrapeStatus !== 'success') {
        updateNodeData(id, {
          pageTitle: cachedAnalysis.pageTitle,
          pageContent: cachedAnalysis.pageContent,
          metadata: cachedAnalysis.metadata,
          scrapeStatus: 'success',
          scrapeError: undefined,
        } as Partial<WebpageNodeData>);
      }
      return;
    }

    void triggerScrape(normalized);
  }, [data.url, fetchPreview, id, triggerScrape, updateNodeData, url]);

  return (
    <BaseNode id={id} showTargetHandle={false} parentId={parentId}>
      <div className="w-[280px] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#095D40]" />
            <span className="text-[13px] font-medium text-[#1A1D21]">Webpage</span>
          </div>
          {renderStatus()}
        </div>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setUrl(data.url || ''); setIsEditing(false); }
            }}
            placeholder="Enter webpage URL..."
            className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#095D40]"
            autoFocus
          />
        ) : data.url ? (
          <div className="space-y-2">
            <div
              onClick={() => setIsEditing(true)}
              className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 hover:border-[#095D40]"
            >
              <div className="text-[12px] font-medium text-[#1A1D21] truncate" title={data.url}>{data.url}</div>
              {data.pageTitle && (
                <div className="text-[10px] text-[#6B7280] truncate" title={data.pageTitle}>{data.pageTitle}</div>
              )}
            </div>
            {data.scrapeStatus === 'error' && (
              <div className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">
                {data.scrapeError || 'Failed to fetch webpage. Try again.'}
              </div>
            )}
            {canPreview && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <div className="rounded-b-lg border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <div className="px-3 pb-3 pt-2 text-[11px] text-[#4B5563]">
                    {previewState.status === 'loading' && (
                      <div className="flex items-center gap-2 text-[#0369A1]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Fetching preview…</span>
                      </div>
                    )}
                    {previewState.status === 'error' && (
                      <div className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2 text-[#B91C1C]">
                        {previewState.error || 'Unable to load preview. The site may block embeds.'}
                      </div>
                    )}
                    {previewState.status === 'success' && previewState.data && (
                      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                        {previewState.data.imageUrl && (
                          <div className="relative h-40 w-full">
                            <Image
                              src={previewState.data.imageUrl}
                              alt={previewState.data.title || data.pageTitle || 'Preview screenshot'}
                              fill
                              sizes="(max-width: 320px) 100vw, 320px"
                              className="object-cover"
                              priority
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="space-y-2 p-3">
                          <div className="text-[12px] font-semibold text-[#111827] line-clamp-2">
                            {previewState.data.title || data.pageTitle || data.url}
                          </div>
                          {(previewState.data.description || data.pageContent) && (
                            <div className="text-[11px] text-[#4B5563] line-clamp-3">
                              {previewState.data.description || data.pageContent}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {previewState.status === 'idle' && (
                      <div className="text-[11px] text-[#6B7280]">
                        Preview will appear once the page finishes loading.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {hasTextSummary && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <button
                  onClick={(event) => {
                    stopPropagation(event);
                    setShowSummary(prev => !prev);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-[#1A1D21] hover:bg-[#F3F4F6] cursor-pointer"
                >
                  <span>Scraped summary</span>
                  {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showSummary && (
                  <div className="max-h-32 overflow-y-auto px-3 pb-3 text-[11px] leading-relaxed text-[#4B5563]">
                    {data.pageContent}
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
                className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#6B7280] hover:border-[#095D40] hover:text-[#095D40] cursor-pointer"
              >
                Edit URL
              </button>
              {data.url && (
                <button
                  onClick={openInNewTab}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21] cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open page
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer rounded-lg border border-dashed border-[#E5E7EB] p-4 text-center hover:border-[#095D40]"
          >
            <Globe className="h-8 w-8 text-[#9CA3AF] mx-auto mb-1" />
            <div className="text-[11px] text-[#9CA3AF]">Enter URL</div>
          </div>
        )}
        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<WebpageNodeData>)}
          nodeId={id}
          nodeType="webpage"
        />
      </div>
    </BaseNode>
  );
});
