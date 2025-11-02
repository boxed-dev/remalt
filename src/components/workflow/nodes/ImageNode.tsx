"use client";

import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { Image as ImageIcon, Loader2, Eye, CheckCircle2, AlertCircle, Upload, X } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { UploadMediaDialog } from '../UploadMediaDialog';
import type { NodeProps } from '@xyflow/react';
import type { ImageNodeData } from '@/types/workflow';
import { AIInstructionsInline } from './AIInstructionsInline';

export const ImageNode = memo(({ id, data, parentId }: NodeProps<ImageNodeData>) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const safeImageUrl = useMemo(() => data.storageUrl || data.imageUrl || data.thumbnail, [data.storageUrl, data.imageUrl, data.thumbnail]);

  // Reset error state when image URL changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [data.imageUrl, data.storageUrl, data.thumbnail]);

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
        } else if (safeImageUrl) {
          analysisSource = { kind: 'url', payload: safeImageUrl };
        }
      }

      if (!analysisSource) {
        console.warn('[ImageNode] No analysis source available');
        return;
      }

      console.log('[ImageNode] Starting STREAMING image analysis...', analysisSource.kind === 'url' ? analysisSource.payload : 'base64');

      updateNodeData(id, {
        analysisStatus: 'analyzing',
        analysisError: undefined,
      } as Partial<ImageNodeData>);

      const body = analysisSource.kind === 'base64'
        ? { imageData: analysisSource.payload.split(',')[1] }
        : { imageUrl: analysisSource.payload };

      // Use streaming endpoint for real-time progress
      const response = await fetch('/api/image/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status === 'complete' && data.success) {
                console.log('[ImageNode] STREAMING analysis completed successfully');
                updateNodeData(id, {
                  ocrText: data.ocrText,
                  analysisData: {
                    description: data.description,
                    tags: data.tags,
                    colors: data.colors,
                  },
                  analysisStatus: 'success',
                  analysisError: undefined,
                } as Partial<ImageNodeData>);
              } else if (data.status === 'error') {
                throw new Error(data.error || 'Analysis failed');
              }
              // Progress updates are handled but don't update node data
            } catch (e) {
              console.error('[ImageNode] Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('[ImageNode] Image analysis exception:', error);
      updateNodeData(id, {
        analysisStatus: 'error',
        analysisError: error instanceof Error ? error.message : 'Failed to analyze image',
      } as Partial<ImageNodeData>);
    }
  }, [data.imageFile, safeImageUrl, id, updateNodeData]);

  // Auto-trigger analysis when image is uploaded
  useEffect(() => {
    if (safeImageUrl && (data.analysisStatus === 'idle' || data.analysisStatus === 'loading')) {
      console.log('[ImageNode] Auto-triggering analysis for image:', safeImageUrl);
      void triggerAnalysis({ kind: 'url', payload: safeImageUrl });
    }
  }, [safeImageUrl, data.analysisStatus, triggerAnalysis]);

  const resetNode = () => {
    setImageError(false);
    setImageLoading(true);
    updateNodeData(id, {
      imageUrl: undefined,
      thumbnail: undefined,
      storagePath: undefined,
      storageUrl: undefined,
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
    if (safeImageUrl)
      window.open(safeImageUrl, '_blank', 'noopener,noreferrer');
  };

  const openFileDialog = (event: React.MouseEvent) => {
    stopPropagation(event);
    setShowUploadDialog(true);
  };

  return (
    <BaseNode id={id} parentId={parentId}>
      <UploadMediaDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        mediaType="image"
        selectedNodeIds={[id]}
      />
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
          </div>
        ) : (
          /* Choose mode - initial state */
          <button
            onClick={openFileDialog}
            onMouseDown={stopPropagation}
            disabled={isUploading}
            className="w-full p-3 border border-dashed border-[#E5E7EB] rounded-lg hover:border-[#F59E0B] hover:bg-[#FEF3C7] transition-colors group cursor-pointer disabled:opacity-50"
          >
            <Upload className="h-6 w-6 text-[#F59E0B] mx-auto mb-1.5" />
            <div className="text-[11px] font-medium text-[#1A1D21] text-center">Upload Image</div>
            <div className="text-[10px] text-[#6B7280] text-center mt-0.5">Click to upload or paste URL</div>
          </button>
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
