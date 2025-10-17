"use client";

import { memo } from 'react';
import { Image as ImageIcon, Loader2, RefreshCw, ChevronDown, ChevronUp, Eye, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { ImageNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';

export const ImageNode = memo(({ id, data, parentId }: NodeProps<ImageNodeData>) => {
  const [mode, setMode] = useState<'idle' | 'url' | 'upload'>('idle');
  const [url, setUrl] = useState(data.imageUrl || '');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [UploaderComponent, setUploader] = useState<React.ComponentType<any> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const safeImageUrl = useMemo(() => data.imageUrl || data.thumbnail, [data.imageUrl, data.thumbnail]);

  const hasAnalysis = useMemo(() => data.analysisStatus === 'success' && !!data.analysisData, [data.analysisData, data.analysisStatus]);
  const hasOcr = useMemo(() => !!data.ocrText && data.ocrText.trim().length > 0, [data.ocrText]);

  // Reset error state when image URL changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [data.imageUrl, data.thumbnail]);

  const fileToBase64 = async (file: File) => await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const triggerAnalysis = useCallback(async (source?: { kind: 'base64' | 'url'; payload: string }) => {
    try {
      let analysisSource = source;

      if (!analysisSource) {
        if (data.imageFile) {
          const base64 = await fileToBase64(data.imageFile as File);
          analysisSource = { kind: 'base64', payload: base64 };
        } else if (data.imageUrl) {
          analysisSource = { kind: 'url', payload: data.imageUrl };
        }
      }

      if (!analysisSource) {
        console.warn('No analysis source available');
        return;
      }

      console.log('🔍 Starting image analysis...', analysisSource.kind === 'url' ? analysisSource.payload : 'base64');
      
      updateNodeData(id, {
        analysisStatus: 'analyzing',
        analysisError: undefined,
      } as Partial<ImageNodeData>);

      const body = analysisSource.kind === 'base64'
        ? { imageData: analysisSource.payload.split(',')[1] }
        : { imageUrl: analysisSource.payload };

      const response = await fetch('/api/image/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Image analysis completed successfully:', {
          hasOCR: !!result.ocrText,
          hasDescription: !!result.description,
          tagCount: result.tags?.length || 0,
          colorCount: result.colors?.length || 0
        });
        updateNodeData(id, {
          ocrText: result.ocrText,
          analysisData: {
            description: result.description,
            tags: result.tags,
            colors: result.colors,
          },
          analysisStatus: 'success',
          analysisError: undefined,
        } as Partial<ImageNodeData>);
      } else {
        console.error('❌ Image analysis failed:', result.error);
        updateNodeData(id, {
          analysisStatus: 'error',
          analysisError: result.error,
        } as Partial<ImageNodeData>);
      }
    } catch (error) {
      console.error('❌ Image analysis exception:', error);
      updateNodeData(id, {
        analysisStatus: 'error',
        analysisError: 'Failed to analyze image',
      } as Partial<ImageNodeData>);
    }
  }, [data.imageFile, data.imageUrl, id, updateNodeData]);

  // Auto-trigger analysis when image is uploaded or when status is set to loading
  useEffect(() => {
    if (safeImageUrl && (data.analysisStatus === 'idle' || data.analysisStatus === 'loading')) {
      console.log('Auto-triggering analysis for image:', safeImageUrl, 'Status:', data.analysisStatus);
      void triggerAnalysis({ kind: 'url', payload: safeImageUrl });
    }
  }, [safeImageUrl, data.analysisStatus, triggerAnalysis]);

  const handleUrlSave = async () => {
    if (url.trim()) {
      setShowAnalysis(false);
      setShowOcr(false);
      updateNodeData(id, {
        imageUrl: url,
        thumbnail: url,
        uploadcareCdnUrl: undefined,
        uploadSource: 'url',
        analysisStatus: 'loading',
        analysisError: undefined,
      } as Partial<ImageNodeData>);
    }
    setMode('idle');
  };

  const resetNode = () => {
    setMode('idle');
    setUrl('');
    setImageError(false);
    setImageLoading(true);
    updateNodeData(id, {
      imageUrl: undefined,
      thumbnail: undefined,
      uploadcareCdnUrl: undefined,
      uploadSource: undefined,
      analysisStatus: 'idle',
      analysisData: undefined,
      ocrText: undefined,
      analysisError: undefined,
    } as Partial<ImageNodeData>);
    setShowAnalysis(false);
    setShowOcr(false);
  };

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  const renderStatus = () => {
    if (data.analysisStatus === 'analyzing')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-1 text-[10px] text-[#F59E0B]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Analyzing</span>
        </div>
      );

    if (data.analysisStatus === 'success')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-1 text-[10px] text-[#047857]">
          <CheckCircle2 className="h-3 w-3" />
          <span>Insights ready</span>
        </div>
      );

    if (data.analysisStatus === 'error')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-1 text-[10px] text-[#B91C1C]">
          <AlertCircle className="h-3 w-3" />
          <span>Analysis failed</span>
        </div>
      );

    return null;
  };

  const handleReanalyze = async (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    setShowAnalysis(false);
    setShowOcr(false);
    updateNodeData(id, {
      analysisStatus: 'loading',
      analysisError: undefined,
    } as Partial<ImageNodeData>);
  };

  const toggleAnalysis = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    setShowAnalysis(prev => !prev);
  };

  const toggleOcr = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    setShowOcr(prev => !prev);
  };

  const openFullImage = (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    stopPropagation(event);
    if (data.imageUrl)
      window.open(data.imageUrl, '_blank', 'noopener,noreferrer');
  };

  const handleUploaderChange = useCallback(({ allEntries }: { allEntries?: Array<{ status: string; cdnUrl?: string }> }) => {
    const firstCompleted = allEntries?.find((entry) => entry.status === 'success' && entry.cdnUrl);
    if (firstCompleted?.cdnUrl) {
      setIsUploading(false);
      setMode('idle');
      setShowAnalysis(false);
      setShowOcr(false);
      updateNodeData(id, {
        imageUrl: firstCompleted.cdnUrl,
        thumbnail: firstCompleted.cdnUrl,
        uploadcareCdnUrl: firstCompleted.cdnUrl,
        uploadSource: 'uploadcare',
        analysisStatus: 'loading',
        analysisError: undefined,
      } as Partial<ImageNodeData>);
    } else if (allEntries && allEntries.some((entry) => entry.status === 'uploading')) {
      setIsUploading(true);
    }
  }, [id, updateNodeData]);

  const openUploader = async (event: React.MouseEvent) => {
    stopPropagation(event);
    const { FileUploaderRegular } = await import('@uploadcare/react-uploader/next');
    setUploader(() => FileUploaderRegular);
    setMode('upload');
  };

  const closeUploader = (event: React.MouseEvent) => {
    stopPropagation(event);
    if (!isUploading) {
      setMode('idle');
    }
  };

  return (
    <BaseNode id={id} parentId={parentId}>
      <div className="w-[280px] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-[13px] font-medium text-[#1A1D21]">Image</span>
          </div>
          {renderStatus()}
        </div>

        {safeImageUrl ? (
          <div className="space-y-2">
            <div className="relative w-full h-40 bg-[#F5F5F7] rounded overflow-hidden">
              {imageLoading && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#F59E0B]" />
                </div>
              )}
              {imageError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <ImageIcon className="h-8 w-8 text-[#9CA3AF] mb-2" />
                  <p className="text-[11px] text-[#6B7280]">Failed to load image</p>
                  <button
                    onClick={resetNode}
                    className="mt-2 text-[10px] text-[#F59E0B] hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <img
                  src={safeImageUrl}
                  alt={data.caption || 'Image'}
                  onClick={resetNode}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageError(true);
                    setImageLoading(false);
                  }}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                  style={{ display: imageLoading ? 'none' : 'block' }}
                />
              )}
            </div>
            {data.caption && (
              <div className="text-[11px] text-[#6B7280]">{data.caption}</div>
            )}
            {data.analysisStatus === 'error' && (
              <div className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">
                {data.analysisError || 'Analysis failed. Try again.'}
              </div>
            )}
            {hasAnalysis && (
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                <button
                  onClick={toggleAnalysis}
                  onMouseDown={stopPropagation}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-[#1A1D21] hover:bg-[#F3F4F6]"
                >
                  <span>AI insights</span>
                  {showAnalysis ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showAnalysis && (
                  <div className="space-y-2 px-3 pb-3 text-[11px] text-[#4B5563]">
                    {data.analysisData?.description && (
                      <p className="leading-relaxed">{data.analysisData.description}</p>
                    )}
                    {data.analysisData?.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {data.analysisData.tags.slice(0, 6).map((tag: string, idx: number) => (
                          <span key={idx} className="rounded-full bg-white px-2 py-1 text-[10px] text-[#374151] shadow-sm">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {data.analysisData?.colors?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {data.analysisData.colors.slice(0, 5).map((color: string, idx: number) => (
                          <span
                            key={idx}
                            className="flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-[10px]"
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                            {color}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {hasOcr && (
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                <button
                  onClick={toggleOcr}
                  onMouseDown={stopPropagation}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-[#1A1D21] hover:bg-[#F3F4F6]"
                >
                  <span>OCR text</span>
                  {showOcr ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showOcr && (
                  <div className="max-h-32 overflow-y-auto px-3 pb-3 text-[11px] leading-relaxed text-[#4B5563]">
                    {data.ocrText}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <button
                onClick={openUploader}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#6B7280] hover:border-[#F59E0B] hover:text-[#F59E0B]"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload new
              </button>
              <button
                onClick={(event) => {
                  stopPropagation(event);
                  setMode('url');
                  setUrl(data.imageUrl || '');
                }}
                className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#6B7280] hover:border-[#1A1D21] hover:text-[#1A1D21]"
              >
                Paste URL
              </button>
              <button
                onClick={(event) => {
                  stopPropagation(event);
                  resetNode();
                }}
                className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-1 text-[#B91C1C] hover:bg-[#FEE2E2]"
              >
                Remove
              </button>
              {(data.analysisStatus === 'error' || data.analysisStatus === 'success') && (
                <button
                  onClick={handleReanalyze}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E0E7FF] bg-[#EEF2FF] px-3 py-1 text-[#4338CA] hover:bg-[#E0E7FF]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-analyze
                </button>
              )}
              {data.imageUrl && (
                <button
                  onClick={openFullImage}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Open
                </button>
              )}
            </div>
            {mode === 'url' && (
              <div className="mt-2 border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] p-3">
                <div className="text-[11px] text-[#6B7280] mb-2">Paste an image URL to update this node.</div>
                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUrlSave();
                    if (e.key === 'Escape') setMode('idle');
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#F59E0B] bg-white"
                  autoFocus
                />
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setMode('idle')}
                    className="flex-1 px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUrlSave}
                    disabled={!url.trim()}
                    className="flex-1 px-3 py-2 text-[11px] bg-[#F59E0B] text-white rounded hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
            {mode === 'upload' && (
              <div className="mt-2 border border-[#E5E7EB] rounded-lg bg-white p-3">
                <div className="text-[11px] text-[#6B7280] mb-3">Upload a new image to replace the current one</div>
                {UploaderComponent ? (
                  <UploaderComponent
                    pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY!}
                    classNameUploader="uc-light uc-purple"
                    sourceList="local, camera, gdrive, facebook"
                    filesViewMode="grid"
                    userAgentIntegration="remalt-next"
                    onChange={handleUploaderChange}
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center text-[11px] text-[#6B7280]">Loading uploader...</div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={closeUploader}
                    disabled={isUploading}
                    className="flex-1 px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : mode === 'idle' ? (
          <div className="space-y-2">
            <button
              onClick={openUploader}
              className="w-full rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-5 text-center hover:border-[#F59E0B] hover:bg-[#FEF3C7] transition"
            >
              <Upload className="h-8 w-8 text-[#F59E0B] mx-auto mb-2" />
              <div className="text-[12px] font-medium text-[#1A1D21]">Click to upload image</div>
              <div className="text-[11px] text-[#6B7280] mt-1">
                Upload from local, camera, Google Drive, or Facebook
              </div>
            </button>
            <button
              onClick={() => {
                setMode('url');
                setUrl('');
              }}
              className="w-full p-3 border border-dashed border-[#E5E7EB] rounded hover:border-[#F59E0B] hover:bg-[#FEF3C7] transition text-center"
            >
              <div className="text-[11px] text-[#6B7280] font-medium">Or paste image URL</div>
            </button>
          </div>
        ) : mode === 'upload' ? (
          <div className="space-y-2">
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
              <div className="text-[11px] text-[#6B7280] mb-3">Upload an image to analyze</div>
              {UploaderComponent ? (
                <UploaderComponent
                  pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY!}
                  classNameUploader="uc-light uc-purple"
                  sourceList="local, camera, gdrive, facebook"
                  filesViewMode="grid"
                  userAgentIntegration="remalt-next"
                  onChange={handleUploaderChange}
                />
              ) : (
                <div className="flex h-32 items-center justify-center text-[11px] text-[#6B7280]">Loading uploader...</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={closeUploader}
                disabled={isUploading}
                className="flex-1 px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUrlSave();
                if (e.key === 'Escape') setMode('idle');
              }}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#F59E0B]"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode('idle')}
                className="flex-1 px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded transition"
              >
                Back
              </button>
              <button
                onClick={handleUrlSave}
                disabled={!url.trim()}
                className="flex-1 px-3 py-2 text-[11px] bg-[#F59E0B] text-white rounded hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Add URL
              </button>
            </div>
          </div>
        )}
        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<ImageNodeData>)}
          nodeId={id}
          nodeType="image"
        />
      </div>
    </BaseNode>
  );
});
