"use client";

import { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Image as ImageIcon, Loader2, Eye, CheckCircle2, AlertCircle, Upload, X } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { ImageNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';

export const ImageNode = memo(({ id, data, parentId }: NodeProps<ImageNodeData>) => {
  const [mode, setMode] = useState<'choose' | 'url' | 'upload'>('choose');
  const [url, setUrl] = useState(data.imageUrl || '');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [UploaderComponent, setUploader] = useState<React.ComponentType<any> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const safeImageUrl = useMemo(() => data.imageUrl || data.thumbnail, [data.imageUrl, data.thumbnail]);

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
        console.log('✅ Image analysis completed successfully');
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

  // Auto-trigger analysis when image is uploaded
  useEffect(() => {
    if (safeImageUrl && (data.analysisStatus === 'idle' || data.analysisStatus === 'loading')) {
      console.log('Auto-triggering analysis for image:', safeImageUrl);
      void triggerAnalysis({ kind: 'url', payload: safeImageUrl });
    }
  }, [safeImageUrl, data.analysisStatus, triggerAnalysis]);

  const handleUrlSave = async () => {
    if (!url.trim()) {
      setMode('choose');
      return;
    }

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      updateNodeData(id, {
        analysisStatus: 'error',
        analysisError: 'Invalid URL format',
      } as Partial<ImageNodeData>);
      return;
    }

    updateNodeData(id, {
      imageUrl: url,
      thumbnail: url,
      uploadcareCdnUrl: undefined,
      uploadSource: 'url',
      analysisStatus: 'loading',
      analysisError: undefined,
    } as Partial<ImageNodeData>);
    setMode('choose');
  };

  const resetNode = () => {
    setMode('choose');
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

  const openFullImage = (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    stopPropagation(event);
    if (data.imageUrl)
      window.open(data.imageUrl, '_blank', 'noopener,noreferrer');
  };

  const handleUploaderChange = useCallback(({ allEntries }: { allEntries?: Array<{ status: string; cdnUrl?: string }> }) => {
    const firstCompleted = allEntries?.find((entry) => entry.status === 'success' && entry.cdnUrl);
    if (firstCompleted?.cdnUrl) {
      console.log('✅ Image uploaded to Uploadcare:', firstCompleted.cdnUrl);
      setIsUploading(false);
      setMode('choose');
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
      setMode('choose');
      setUploader(null);
    }
  };

  return (
    <BaseNode id={id} parentId={parentId}>
      <div className="w-[280px] space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-[13px] font-medium text-[#1A1D21]">Image</span>
          </div>
          {renderStatus()}
        </div>

        {safeImageUrl ? (
          /* Image loaded state */
          <div className="space-y-2">
            <div className="relative w-full h-56 bg-[#F5F5F7] rounded-lg overflow-hidden group">
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
                    onMouseDown={stopPropagation}
                    className="mt-2 text-[10px] text-[#F59E0B] hover:underline cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <img
                    src={safeImageUrl}
                    alt={data.caption || 'Image'}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageError(true);
                      setImageLoading(false);
                    }}
                    className="w-full h-full object-cover"
                    style={{ display: imageLoading ? 'none' : 'block' }}
                  />
                  {/* Remove overlay button */}
                  <button
                    onClick={resetNode}
                    onMouseDown={stopPropagation}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5 text-[#6B7280] hover:text-[#EF4444]" />
                  </button>
                </>
              )}
            </div>

            {/* Caption */}
            {data.caption && (
              <div className="text-[11px] text-[#6B7280]">{data.caption}</div>
            )}

            {/* Error message */}
            {data.analysisStatus === 'error' && (
              <div className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">
                {data.analysisError || 'Analysis failed. Try again.'}
              </div>
            )}

            {/* Actions */}
            {data.imageUrl && (
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <button
                  onClick={openFullImage}
                  onMouseDown={stopPropagation}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21] transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Open
                </button>
              </div>
            )}
          </div>
        ) : mode === 'choose' ? (
          /* Choose mode - initial state */
          <div className="space-y-2">
            <button
              onClick={openUploader}
              onMouseDown={stopPropagation}
              className="w-full p-3 border border-dashed border-[#E5E7EB] rounded-lg hover:border-[#F59E0B] hover:bg-[#FEF3C7] transition-colors group cursor-pointer"
            >
              <Upload className="h-6 w-6 text-[#F59E0B] mx-auto mb-1.5" />
              <div className="text-[11px] font-medium text-[#1A1D21] text-center">Upload Image</div>
              <div className="text-[10px] text-[#6B7280] text-center mt-0.5">Local, camera, Drive, or Facebook</div>
            </button>
            <button
              onClick={() => {
                setMode('url');
                setUrl('');
              }}
              onMouseDown={stopPropagation}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors text-center text-[11px] text-[#6B7280] cursor-pointer"
            >
              Paste URL
            </button>
          </div>
        ) : mode === 'upload' ? (
          /* Upload mode - Uploadcare uploader */
          <div className="space-y-2">
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
              {UploaderComponent ? (
                <UploaderComponent
                  pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY!}
                  classNameUploader="uc-light uc-purple"
                  sourceList="local, camera, gdrive, facebook"
                  filesViewMode="grid"
                  imagesOnly={true}
                  accept="image/*"
                  userAgentIntegration="remalt-next"
                  onChange={handleUploaderChange}
                />
              ) : (
                <div className="flex h-32 items-center justify-center text-[11px] text-[#6B7280]">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </div>
              )}
            </div>
            <button
              onClick={closeUploader}
              onMouseDown={stopPropagation}
              disabled={isUploading}
              className="w-full px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? 'Uploading...' : 'Cancel'}
            </button>
          </div>
        ) : (
          /* URL mode - paste URL input */
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUrlSave();
                if (e.key === 'Escape') setMode('choose');
              }}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode('choose')}
                onMouseDown={stopPropagation}
                className="flex-1 px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded-lg transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleUrlSave}
                onMouseDown={stopPropagation}
                disabled={!url.trim()}
                className="flex-1 px-3 py-2 text-[11px] bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Add URL
              </button>
            </div>
          </div>
        )}

        {/* AI Instructions */}
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

ImageNode.displayName = 'ImageNode';
