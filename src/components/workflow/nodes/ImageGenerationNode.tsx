"use client";

import { memo, useState, useCallback, useMemo } from 'react';
import { Sparkles, Loader2, Download, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeHeader, NodeHeaderBadge } from './NodeHeader';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { ImageGenerationNodeData } from '@/types/workflow';
import { FloatingAIInstructions } from './FloatingAIInstructions';

export const ImageGenerationNode = memo(({ id, data, parentId, selected }: NodeProps<ImageGenerationNodeData>) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const activeNodeId = useWorkflowStore((state) => state.activeNodeId);
  const isActive = activeNodeId === id;
  const [localPrompt, setLocalPrompt] = useState(data.prompt || '');
  const [isDownloadHovered, setIsDownloadHovered] = useState(false);

  const isGenerating = data.generationStatus === 'generating';
  const hasImage = !!data.generatedImageBase64 && data.generationStatus === 'success';

  // Construct data URL for image display
  const imageDataUrl = useMemo(() => {
    if (data.generatedImageBase64) {
      // Check if it already has data URI prefix
      if (data.generatedImageBase64.startsWith('data:')) {
        return data.generatedImageBase64;
      }
      // Otherwise add it
      return `data:image/png;base64,${data.generatedImageBase64}`;
    }
    return null;
  }, [data.generatedImageBase64]);

  const generateImage = useCallback(async () => {
    const prompt = localPrompt.trim();
    if (!prompt) {
      return;
    }

    console.log('[ImageGenerationNode] Starting image generation...', prompt);

    updateNodeData(id, {
      generationStatus: 'generating',
      generationError: undefined,
      prompt: prompt,
    } as Partial<ImageGenerationNodeData>);

    try {
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt,
          aspectRatio: data.aspectRatio || '16:9',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate image');
      }

      console.log('[ImageGenerationNode] ✅ Image generated successfully');

      updateNodeData(id, {
        generationStatus: 'success',
        generatedImageBase64: result.imageBase64,
        generatedImageUrl: `data:${result.mimeType};base64,${result.imageBase64}`,
        generatedAt: new Date().toISOString(),
        generationError: undefined,
      } as Partial<ImageGenerationNodeData>);
    } catch (error) {
      console.error('[ImageGenerationNode] Generation error:', error);
      updateNodeData(id, {
        generationStatus: 'error',
        generationError: error instanceof Error ? error.message : 'Failed to generate image',
      } as Partial<ImageGenerationNodeData>);
    }
  }, [localPrompt, id, updateNodeData, data.aspectRatio]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalPrompt(e.target.value);
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isGenerating) {
      e.preventDefault();
      void generateImage();
    }
  };

  const handleDownload = useCallback(() => {
    if (!imageDataUrl) return;

    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageDataUrl]);

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  const statusBadge = useMemo(() => {
    if (data.generationStatus === 'generating') {
      return (
        <NodeHeaderBadge tone="accent">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Generating</span>
        </NodeHeaderBadge>
      );
    }

    if (data.generationStatus === 'success') {
      return (
        <NodeHeaderBadge tone="success">
          <CheckCircle2 className="h-3 w-3" />
          <span>Generated</span>
        </NodeHeaderBadge>
      );
    }

    if (data.generationStatus === 'error') {
      return (
        <NodeHeaderBadge tone="danger">
          <AlertCircle className="h-3 w-3" />
          <span>Failed</span>
        </NodeHeaderBadge>
      );
    }

    return null;
  }, [data.generationStatus]);

  return (
    <div className="relative w-[480px]">
      <BaseNode
        id={id}
        parentId={parentId}
        header={
          <NodeHeader
            title={data.customLabel || 'AI Image Generator'}
            subtitle="Powered by Nano Banana (Gemini 2.5 Flash Image)"
            icon={<Sparkles />}
            themeKey="image-generation"
            trailing={statusBadge}
          />
        }
        headerClassName="overflow-hidden"
      >
        <div className="w-full space-y-3">
          {/* Prompt Input */}
          {!hasImage && (
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#374151]">
                Describe the image you want to generate
              </label>
              <textarea
                value={localPrompt}
                onChange={handlePromptChange}
                onKeyDown={handlePromptKeyDown}
                onMouseDown={stopPropagation}
                onPointerDown={stopPropagation}
                placeholder="A futuristic cityscape at sunset with flying cars and neon lights..."
                disabled={isGenerating}
                className="nodrag nopan w-full min-h-[100px] px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent resize-none disabled:bg-[#F9FAFB] disabled:cursor-not-allowed"
              />

              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-[#374151]">
                  Aspect Ratio:
                </label>
                <select
                  value={data.aspectRatio || '16:9'}
                  onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value as any } as Partial<ImageGenerationNodeData>)}
                  onMouseDown={stopPropagation}
                  disabled={isGenerating}
                  className="nodrag text-[11px] px-2 py-1 border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] disabled:bg-[#F9FAFB]"
                >
                  <option value="1:1">1:1 (Square)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                  <option value="21:9">21:9 (Ultrawide)</option>
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateImage}
                onMouseDown={stopPropagation}
                disabled={isGenerating || !localPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-[12px] font-medium rounded-lg hover:from-[#7C3AED] hover:to-[#6D28D9] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>Generate Image</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Generated Image Display */}
          {hasImage && imageDataUrl && (
            <div className="space-y-2">
              <div
                className="relative w-full rounded-lg overflow-hidden group bg-[#F5F5F7]"
                onMouseEnter={() => setIsDownloadHovered(true)}
                onMouseLeave={() => setIsDownloadHovered(false)}
              >
                <img
                  src={imageDataUrl}
                  alt={data.prompt || 'Generated image'}
                  className="w-full h-auto"
                />

                {/* Download Button Overlay */}
                {isDownloadHovered && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity">
                    <button
                      onClick={handleDownload}
                      onMouseDown={stopPropagation}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A1D21] text-[12px] font-medium rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Prompt Display */}
              {data.prompt && (
                <div className="text-[11px] text-[#6B7280] italic">
                  "{data.prompt}"
                </div>
              )}

              {/* Regenerate Button */}
              <button
                onClick={() => {
                  updateNodeData(id, {
                    generationStatus: 'idle',
                    generatedImageBase64: undefined,
                    generatedImageUrl: undefined,
                  } as Partial<ImageGenerationNodeData>);
                }}
                onMouseDown={stopPropagation}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-[#E5E7EB] text-[#374151] text-[11px] font-medium rounded-lg hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors cursor-pointer"
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Generate New Image</span>
              </button>
            </div>
          )}

          {/* Error Display */}
          {data.generationStatus === 'error' && (
            <div className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">
              {data.generationError || 'Failed to generate image. Please try again.'}
            </div>
          )}
        </div>
      </BaseNode>

      {/* Floating AI Instructions - visible once the node is active/selected */}
      {(isActive || selected) && (
        <FloatingAIInstructions
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<ImageGenerationNodeData>)}
          nodeId={id}
          nodeType="image-generation"
        />
      )}
    </div>
  );
});

ImageGenerationNode.displayName = 'ImageGenerationNode';
