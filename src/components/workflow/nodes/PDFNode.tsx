import { memo } from 'react';
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, Download, AlertTriangle, ExternalLink } from 'lucide-react';
import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { AIInstructionsInline } from './AIInstructionsInline';
import type { NodeProps } from '@xyflow/react';
import type { PDFNodeData } from '@/types/workflow';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const PDFNode = memo(({ id, data, parentId }: NodeProps<PDFNodeData>) => {
  const [mode, setMode] = useState<'choose' | 'url' | 'upload'>('choose');
  const [url, setUrl] = useState(data.url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [UploaderComponent, setUploader] = useState<React.ComponentType<any> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const hasParsedContent = useMemo(() => data.parseStatus === 'success' && (data.parsedText || (data.segments?.length ?? 0) > 0), [data.parseStatus, data.parsedText, data.segments]);

  const pdfUrl = useMemo(() => {
    if (data.uploadcareCdnUrl) return data.uploadcareCdnUrl;
    if (data.url) return data.url;
    return null;
  }, [data.uploadcareCdnUrl, data.url]);

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
        parseStatus: 'error',
        parseError: 'Invalid URL format',
      } as Partial<PDFNodeData>);
      return;
    }

    updateNodeData(id, {
      url,
      fileName: url.split('/').pop() || 'Document',
      uploadSource: 'url',
      parseStatus: 'parsing',
      parseError: undefined,
      uploadcareCdnUrl: undefined,
      uploadcareUuid: undefined,
    } as Partial<PDFNodeData>);

    await triggerParsing({ kind: 'url', payload: url });
    setMode('choose');
  };

  const resetNode = () => {
    setMode('choose');
    setUrl('');
    updateNodeData(id, {
      fileName: undefined,
      url: undefined,
      storagePath: undefined,
      uploadcareCdnUrl: undefined,
      uploadcareUuid: undefined,
      uploadSource: undefined,
      parsedText: undefined,
      segments: undefined,
      parseStatus: 'idle',
      parseError: undefined,
    } as Partial<PDFNodeData>);
  };

  const triggerParsing = async (source?: { kind: 'uploadcare' | 'url'; payload: string }) => {
    try {
      let parseSource = source;

      // If no source provided, use existing data
      if (!parseSource) {
        if (data.uploadcareCdnUrl) {
          parseSource = { kind: 'uploadcare', payload: data.uploadcareCdnUrl };
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

      // Prepare request body based on source (include uploadcareUuid for caching)
      const body = parseSource.kind === 'uploadcare'
        ? {
            uploadcareCdnUrl: parseSource.payload,
            uploadcareUuid: data.uploadcareUuid // Include UUID for cache lookup
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
          updateNodeData(id, {
            parsedText: result.parsedText,
            segments: result.segments,
            pageCount: result.pageCount,
            parseStatus: 'success',
            parseError: undefined,
          } as Partial<PDFNodeData>);
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
          updateNodeData(id, {
            parsedText: result.result.parsedText,
            segments: result.result.segments,
            pageCount: result.result.pageCount,
            parseStatus: 'success',
            parseError: undefined,
          } as Partial<PDFNodeData>);
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
    const hasPdfUrl = data.uploadcareCdnUrl || data.url;
    if (hasPdfUrl && data.parseStatus === 'parsing') {
      console.log('[PDFNode] Auto-triggering parse for:', data.uploadcareCdnUrl || data.url);
      void triggerParsing();
    }
  }, [data.uploadcareCdnUrl, data.url, data.parseStatus, triggerParsing]);

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  const renderStatus = () => {
    if (data.parseStatus === 'uploading')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] text-[#1D4ED8]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Uploading</span>
        </div>
      );

    if (data.parseStatus === 'parsing')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-1 text-[10px] text-[#1D4ED8]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Parsing</span>
        </div>
      );

    if (data.parseStatus === 'success')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-1 text-[10px] text-[#047857]">
          <CheckCircle2 className="h-3 w-3" />
          <span>Content extracted</span>
        </div>
      );

    if (data.parseStatus === 'error')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-1 text-[10px] text-[#B91C1C]">
          <AlertCircle className="h-3 w-3" />
          <span>Parse failed</span>
        </div>
      );

    return null;
  };

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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const handleUploaderChange = useCallback(({ allEntries }: { allEntries?: Array<{ status: string; cdnUrl?: string; uuid?: string; name?: string; size?: number }> }) => {
    console.log('[PDFNode] Uploader change event:', allEntries);

    const firstCompleted = allEntries?.find((entry) => entry.status === 'success' && entry.cdnUrl);

    if (firstCompleted?.cdnUrl) {
      console.log('[PDFNode] Upload complete:', firstCompleted.cdnUrl);
      setIsUploading(false);
      setMode('choose');

      updateNodeData(id, {
        fileName: firstCompleted.name || 'Document.pdf',
        fileSize: firstCompleted.size,
        uploadcareCdnUrl: firstCompleted.cdnUrl,
        uploadcareUuid: firstCompleted.uuid,
        uploadSource: 'uploadcare',
        parseStatus: 'parsing',
        parseError: undefined,
        url: undefined,
        storagePath: undefined,
      } as Partial<PDFNodeData>);

      // Trigger parsing with Uploadcare URL
      void triggerParsing({ kind: 'uploadcare', payload: firstCompleted.cdnUrl });
    } else if (allEntries && allEntries.some((entry) => entry.status === 'uploading')) {
      setIsUploading(true);
      updateNodeData(id, {
        parseStatus: 'uploading',
      } as Partial<PDFNodeData>);
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
    }
  };

  return (
    <BaseNode id={id} showTargetHandle={false} parentId={parentId}>
      <div className="w-[280px] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#EF4444]" />
            <span className="text-[13px] font-medium text-[#1A1D21]">PDF</span>
          </div>
          {renderStatus()}
        </div>

        {data.fileName ? (
          <div className="space-y-2">
            {/* PDF Preview */}
            {pdfUrl && (
              <div className="relative group">
                <div className="rounded-lg border border-[#E5E7EB] overflow-hidden bg-white">
                  <iframe
                    src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-32 pointer-events-none"
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
        ) : mode === 'choose' ? (
          <div className="space-y-2">
            <button
              onClick={openUploader}
              onMouseDown={stopPropagation}
              className="w-full p-3 border border-dashed border-[#E5E7EB] rounded-lg hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-colors group cursor-pointer"
            >
              <Upload className="h-6 w-6 text-[#EF4444] mx-auto mb-1.5" />
              <div className="text-[11px] font-medium text-[#1A1D21] text-center">Upload PDF</div>
              <div className="text-[10px] text-[#6B7280] text-center mt-0.5">Local, URL, Drive, or Dropbox</div>
            </button>
            <button
              onClick={() => setMode('url')}
              onMouseDown={stopPropagation}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg hover:border-[#EF4444] hover:text-[#EF4444] transition-colors text-center text-[11px] text-[#6B7280] cursor-pointer"
            >
              Paste URL
            </button>
          </div>
        ) : mode === 'upload' ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
              {UploaderComponent ? (
                <UploaderComponent
                  pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY!}
                  classNameUploader="uc-light uc-purple"
                  sourceList="local, url, gdrive, dropbox"
                  accept="application/pdf"
                  maxFileSize={MAX_FILE_SIZE}
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
              placeholder="https://example.com/document.pdf"
              className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444] transition-all"
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
                className="flex-1 px-3 py-2 text-[11px] bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Add URL
              </button>
            </div>
          </div>
        )}

        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<PDFNodeData>)}
          nodeId={id}
          nodeType="pdf"
        />
      </div>
    </BaseNode>
  );
});

PDFNode.displayName = 'PDFNode';
