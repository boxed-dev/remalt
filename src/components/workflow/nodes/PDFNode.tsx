import { memo } from 'react';
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, Download, AlertTriangle, ExternalLink } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { BaseNode } from './BaseNode';
import { NodeHeader, NodeHeaderBadge } from './NodeHeader';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { UploadMediaDialog } from '../UploadMediaDialog';
import { FloatingAIInstructions } from './FloatingAIInstructions';
import type { NodeProps } from '@xyflow/react';
import type { PDFNodeData } from '@/types/workflow';

export const PDFNode = memo(({ id, data, parentId, selected }: NodeProps<PDFNodeData>) => {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const hasParsedContent = useMemo(() => data.parseStatus === 'success' && (data.parsedText || (data.segments?.length ?? 0) > 0), [data.parseStatus, data.parsedText, data.segments]);

  const pdfUrl = useMemo(() => {
    if (data.storageUrl) return data.storageUrl;
    if (data.url) return data.url;
    return null;
  }, [data.storageUrl, data.url]);

  const resetNode = () => {
    updateNodeData(id, {
      fileName: undefined,
      url: undefined,
      storagePath: undefined,
      storageUrl: undefined,
      uploadSource: undefined,
      parsedText: undefined,
      segments: undefined,
      parseStatus: 'idle',
      parseError: undefined,
    } as Partial<PDFNodeData>);
  };

  const triggerParsing = async (source?: { kind: 'storage' | 'url'; payload: string }) => {
    try {
      let parseSource = source;

      // If no source provided, use existing data
      if (!parseSource) {
        if (data.storageUrl) {
          parseSource = { kind: 'storage', payload: data.storageUrl };
        } else if (data.url) {
          parseSource = { kind: 'url', payload: data.url };
        } else {
          console.warn('[PDFNode] No source available for parsing');
          return;
        }
      }

      console.log('[PDFNode] Starting parse:', parseSource.kind);

      updateNodeData(id, {
        parseStatus: 'parsing',
        parseError: undefined,
      } as Partial<PDFNodeData>);

      // Prepare request body based on source
      const body = parseSource.kind === 'storage'
        ? {
            storageUrl: parseSource.payload,
            storagePath: data.storagePath
          }
        : { pdfUrl: parseSource.payload };

      const response = await fetch('/api/pdf/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        // Check if this is a background job
        if (result.status === 'processing' && result.jobId) {
          console.log('[PDFNode] Background job created:', result.jobId);
          // Start polling for job status
          pollJobStatus(result.jobId);
        } else {
          // Immediate success
          console.log('[PDFNode] Parse successful');
          const updates: Partial<PDFNodeData> = {
            parsedText: result.parsedText,
            segments: result.segments,
            pageCount: result.pageCount,
            parseStatus: 'success',
            parseError: undefined,
          };

          // Apply suggested title if available
          if (result.suggestedTitle) {
            console.log('[PDFNode] ✅ Applying AI-generated title:', result.suggestedTitle);
            updates.customLabel = result.suggestedTitle;
          }

          updateNodeData(id, updates);
        }
      } else {
        // Handle specific error codes
        let errorMessage = result.error || 'Failed to parse PDF';

        if (result.code === 'FILE_TOO_LARGE') {
          errorMessage = result.error;
        } else if (result.code === 'TIMEOUT') {
          errorMessage = 'Parsing timed out. The file might be too large or complex.';
        } else if (result.code === 'RATE_LIMIT') {
          errorMessage = 'API rate limit reached. Please try again in a moment.';
        } else if (result.code === 'INVALID_FILE') {
          errorMessage = 'The PDF file appears to be corrupted or invalid.';
        }

        updateNodeData(id, {
          parseStatus: 'error',
          parseError: errorMessage,
        } as Partial<PDFNodeData>);
      }
    } catch (error) {
      console.error('[PDFNode] Parse failed:', error);
      updateNodeData(id, {
        parseStatus: 'error',
        parseError: error instanceof Error ? error.message : 'Failed to parse PDF',
      } as Partial<PDFNodeData>);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 120; // 2 minutes max (120 * 1s)
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        updateNodeData(id, {
          parseStatus: 'error',
          parseError: 'Parsing timeout - job took too long to complete',
        } as Partial<PDFNodeData>);
        return;
      }

      try {
        const response = await fetch(`/api/pdf/status/${jobId}`, {
          credentials: 'include',
        });

        const result = await response.json();

        if (!response.ok) {
          updateNodeData(id, {
            parseStatus: 'error',
            parseError: result.error || 'Failed to check job status',
          } as Partial<PDFNodeData>);
          return;
        }

        if (result.status === 'completed') {
          console.log('[PDFNode] Background job completed');
          const updates: Partial<PDFNodeData> = {
            parsedText: result.result.parsedText,
            segments: result.result.segments,
            pageCount: result.result.pageCount,
            parseStatus: 'success',
            parseError: undefined,
          };

          // Apply suggested title if available
          if (result.result.suggestedTitle) {
            console.log('[PDFNode] ✅ Applying AI-generated title:', result.result.suggestedTitle);
            updates.customLabel = result.result.suggestedTitle;
          }

          updateNodeData(id, updates);
        } else if (result.status === 'failed') {
          updateNodeData(id, {
            parseStatus: 'error',
            parseError: result.error || 'Parsing failed',
          } as Partial<PDFNodeData>);
        } else {
          // Still processing, poll again
          attempts++;
          setTimeout(poll, 1000);
        }
      } catch (error) {
        updateNodeData(id, {
          parseStatus: 'error',
          parseError: 'Failed to check parsing status',
        } as Partial<PDFNodeData>);
      }
    };

    poll();
  };

  // Auto-trigger parsing when PDF is uploaded
  useEffect(() => {
    const hasPdfUrl = data.storageUrl || data.url;
    if (hasPdfUrl && data.parseStatus === 'parsing') {
      console.log('[PDFNode] Auto-triggering parse for:', data.storageUrl || data.url);
      void triggerParsing();
    }
  }, [data.storageUrl, data.url, data.parseStatus, triggerParsing]);

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const renderStatus = () => {
    if (data.parseStatus === 'parsing') {
      return (
        <NodeHeaderBadge tone="accent">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Parsing</span>
        </NodeHeaderBadge>
      );
    }

    if (data.parseStatus === 'success') {
      return (
        <NodeHeaderBadge tone="success">
          <CheckCircle2 className="h-3 w-3" />
          <span>Ready</span>
        </NodeHeaderBadge>
      );
    }

    if (data.parseStatus === 'error') {
      return (
        <NodeHeaderBadge tone="danger">
          <AlertCircle className="h-3 w-3" />
          <span>Parse failed</span>
        </NodeHeaderBadge>
      );
    }

    return null;
  };

  const statusBadge = renderStatus();
  const fileSizeLabel = formatFileSize(data.fileSize);
  const headerTrailing = statusBadge || fileSizeLabel ? (
    <div className="flex items-center gap-2">
      {fileSizeLabel && <NodeHeaderBadge tone="muted">{fileSizeLabel}</NodeHeaderBadge>}
      {statusBadge}
    </div>
  ) : null;

  const downloadParsedText = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    if (!data.parsedText) return;

    const blob = new Blob([data.parsedText], { type: 'text/plain;charset=utf-8' });
    const urlObject = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObject;
    link.download = `${data.fileName || 'document'}.txt`;
    link.click();
    URL.revokeObjectURL(urlObject);
  };

  const openFileDialog = (event: React.MouseEvent) => {
    stopPropagation(event);
    setShowUploadDialog(true);
  };

  return (
    <div className="relative w-[280px] max-h-[460px]">
      <BaseNode
        id={id}
        showTargetHandle={false}
        parentId={parentId}
        header={
          <NodeHeader
            title={data.customLabel || 'PDF'}
            subtitle={data.fileName || 'Upload or link a document'}
            icon={<FileText />}
            themeKey="pdf"
            trailing={headerTrailing}
          />
        }
        headerClassName="overflow-hidden"
      >
        <UploadMediaDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          mediaType="pdf"
          selectedNodeIds={[id]}
        />
        <div className="w-full h-full space-y-2 overflow-y-auto">

        {data.fileName ? (
          <div className="space-y-2">
            {/* PDF Preview */}
            {pdfUrl && (
              <div className="relative group">
                <div className="rounded-lg border border-[#E5E7EB] overflow-hidden bg-white flex-shrink-0">
                  <iframe
                    src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-40 pointer-events-none"
                    title="PDF Preview"
                  />
                  {/* Overlay with file info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
                    <div className="p-2 w-full">
                      <div className="text-[11px] font-medium text-white truncate" title={data.fileName}>
                        {data.fileName}
                      </div>
                      {data.fileSize && (
                        <div className="text-[9px] text-white/80">
                          {formatFileSize(data.fileSize)}
                          {data.pageCount && ` • ${data.pageCount} page${data.pageCount > 1 ? 's' : ''}`}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Click to open */}
                  <button
                    onClick={(e) => {
                      stopPropagation(e);
                      window.open(pdfUrl, '_blank');
                    }}
                    onMouseDown={stopPropagation}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white cursor-pointer"
                    title="Open PDF in new tab"
                  >
                    <ExternalLink className="h-3 w-3 text-[#1A1D21]" />
                  </button>
                </div>
              </div>
            )}

            {data.parseStatus === 'error' && (
              <div className="rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] px-3 py-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-[#B91C1C] leading-relaxed">
                    {data.parseError || 'Failed to parse PDF. Try again.'}
                  </div>
                </div>
              </div>
            )}

            {hasParsedContent && data.parsedText && (
              <button
                onClick={downloadParsedText}
                onMouseDown={stopPropagation}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[11px] text-[#374151] hover:border-[#1A1D21] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export parsed text
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={openFileDialog}
            onMouseDown={stopPropagation}
            className="w-full p-3 border border-dashed border-[#E5E7EB] rounded-lg hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-colors group cursor-pointer"
          >
            <Upload className="h-6 w-6 text-[#EF4444] mx-auto mb-1.5" />
            <div className="text-[11px] font-medium text-[#1A1D21] text-center">Upload PDF</div>
            <div className="text-[10px] text-[#6B7280] text-center mt-0.5">Click to upload or paste URL</div>
          </button>
        )}
        </div>
      </BaseNode>

      {/* Floating AI Instructions - visible once the node is active/selected */}
      {selected && (
        <FloatingAIInstructions
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<PDFNodeData>)}
          nodeId={id}
          nodeType="pdf"
        />
      )}
    </div>
  );
});

PDFNode.displayName = 'PDFNode';
