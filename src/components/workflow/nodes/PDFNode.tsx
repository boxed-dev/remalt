import { memo } from 'react';
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, BookOpen, Download, AlertTriangle } from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { AIInstructionsInline } from './AIInstructionsInline';
import type { NodeProps } from '@xyflow/react';
import type { PDFNodeData } from '@/types/workflow';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const PDFNode = memo(({ id, data }: NodeProps<PDFNodeData>) => {
  const [mode, setMode] = useState<'choose' | 'url'>('choose');
  const [url, setUrl] = useState(data.url || '');
  const [showDetails, setShowDetails] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const hasParsedContent = useMemo(() => data.parseStatus === 'success' && (data.parsedText || (data.segments?.length ?? 0) > 0), [data.parseStatus, data.parsedText, data.segments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      updateNodeData(id, {
        parseStatus: 'error',
        parseError: 'Please select a PDF file',
      } as Partial<PDFNodeData>);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      updateNodeData(id, {
        parseStatus: 'error',
        parseError: `File too large (${sizeMB}MB). Maximum size is 50MB.`,
      } as Partial<PDFNodeData>);
      return;
    }

    try {
      // Update UI to show uploading state
      updateNodeData(id, {
        fileName: file.name,
        parseStatus: 'uploading',
        parseError: undefined,
      } as Partial<PDFNodeData>);

      console.log('[PDFNode] Uploading file:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)}MB)`);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to Supabase Storage
      const uploadResponse = await fetch('/api/pdf/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Failed to upload PDF');
      }

      console.log('[PDFNode] Upload successful:', uploadResult.storagePath);

      // Update with storage path and start parsing
      updateNodeData(id, {
        storagePath: uploadResult.storagePath,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        parseStatus: 'parsing',
      } as Partial<PDFNodeData>);

      // Trigger parsing with storage path
      await triggerParsing({ kind: 'storage', payload: uploadResult.storagePath });

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMode('choose');

    } catch (error) {
      console.error('[PDFNode] Upload failed:', error);
      updateNodeData(id, {
        parseStatus: 'error',
        parseError: error instanceof Error ? error.message : 'Failed to upload PDF',
      } as Partial<PDFNodeData>);
    } finally {
      setUploadProgress(0);
    }
  };

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
      parseStatus: 'parsing',
      parseError: undefined,
    } as Partial<PDFNodeData>);

    await triggerParsing({ kind: 'url', payload: url });
    setMode('choose');
  };

  const resetNode = () => {
    setMode('choose');
    setUrl('');
    setShowDetails(false);
    setShowSegments(false);
    updateNodeData(id, {
      fileName: undefined,
      url: undefined,
      storagePath: undefined,
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
        if (data.storagePath) {
          parseSource = { kind: 'storage', payload: data.storagePath };
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
        ? { storagePath: parseSource.payload }
        : { pdfUrl: parseSource.payload };

      const response = await fetch('/api/pdf/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('[PDFNode] Parse successful');
        updateNodeData(id, {
          parsedText: result.parsedText,
          segments: result.segments,
          pageCount: result.pageCount,
          parseStatus: 'success',
          parseError: undefined,
        } as Partial<PDFNodeData>);
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

  const handleReparse = async (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    setShowDetails(false);
    setShowSegments(false);
    await triggerParsing();
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

  return (
    <BaseNode id={id} showTargetHandle={false}>
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
            <div
              onClick={resetNode}
              onMouseDown={stopPropagation}
              className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 hover:border-[#EF4444] transition-colors"
            >
              <div className="text-[12px] font-medium text-[#1A1D21] truncate" title={data.fileName}>
                {data.fileName}
              </div>
              {data.url && (
                <div className="text-[10px] text-[#6B7280] truncate" title={data.url}>{data.url}</div>
              )}
              {data.fileSize && (
                <div className="text-[10px] text-[#6B7280] mt-1">
                  Size: {formatFileSize(data.fileSize)}
                  {data.pageCount && ` • ${data.pageCount} page${data.pageCount > 1 ? 's' : ''}`}
                </div>
              )}
            </div>

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

            {hasParsedContent && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <button
                  onClick={(event) => {
                    stopPropagation(event);
                    setShowDetails(prev => !prev);
                  }}
                  onMouseDown={stopPropagation}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-[#1A1D21] hover:bg-[#F3F4F6] transition-colors rounded-t-lg"
                >
                  <span>Parsed summary</span>
                  {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showDetails && (
                  <div className="space-y-2 px-3 pb-3 text-[11px] text-[#4B5563]">
                    {data.parsedText && (
                      <p className="line-clamp-3 leading-relaxed" title={data.parsedText}>
                        {data.parsedText}
                      </p>
                    )}
                    {data.segments && data.segments.length > 0 && (
                      <button
                        onClick={(event) => {
                          stopPropagation(event);
                          setShowSegments(prev => !prev);
                        }}
                        onMouseDown={stopPropagation}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1 text-[10px] text-[#4338CA] hover:border-[#C7D2FE] transition-colors"
                      >
                        <BookOpen className="h-3 w-3" />
                        {showSegments ? 'Hide segments' : `${data.segments.length} segments`}
                      </button>
                    )}
                    {showSegments && data.segments && (
                      <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-2">
                        {data.segments.map((segment, index) => {
                          const segmentContent = typeof segment === 'string' ? segment : segment.content;
                          const page = typeof segment === 'string' ? undefined : segment.page;
                          return (
                            <div key={index} className="text-[10px] text-[#4B5563]">
                              <strong className="mr-1 text-[#1F2937]">#{index + 1}{page !== undefined ? ` · p.${page}` : ''}:</strong>
                              <span>{segmentContent}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <button
                onClick={(event) => {
                  stopPropagation(event);
                  resetNode();
                }}
                onMouseDown={stopPropagation}
                className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#6B7280] hover:border-[#EF4444] hover:text-[#EF4444] transition-colors"
              >
                Replace PDF
              </button>
              {(data.parseStatus === 'error' || data.parseStatus === 'success') && (
                <button
                  onClick={handleReparse}
                  onMouseDown={stopPropagation}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-1 text-[#B91C1C] hover:bg-[#FEE2E2] transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-parse
                </button>
              )}
              {hasParsedContent && data.parsedText && (
                <button
                  onClick={downloadParsedText}
                  onMouseDown={stopPropagation}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21] transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export text
                </button>
              )}
            </div>
          </div>
        ) : mode === 'choose' ? (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id={`pdf-upload-${id}`}
            />
            <label
              htmlFor={`pdf-upload-${id}`}
              className="block w-full p-4 border-2 border-dashed border-[#E5E7EB] rounded-lg hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-all cursor-pointer group"
            >
              <Upload className="h-8 w-8 text-[#EF4444] mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-[11px] font-medium text-[#1A1D21] text-center">Upload PDF</div>
              <div className="text-[9px] text-[#6B7280] text-center mt-1">Max 50MB</div>
            </label>
            <button
              onClick={() => setMode('url')}
              onMouseDown={stopPropagation}
              className="w-full p-4 border-2 border-dashed border-[#E5E7EB] rounded-lg hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-all text-center group"
            >
              <FileText className="h-8 w-8 text-[#EF4444] mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-[11px] font-medium text-[#1A1D21]">Paste URL</div>
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
                className="flex-1 px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleUrlSave}
                onMouseDown={stopPropagation}
                disabled={!url.trim()}
                className="flex-1 px-3 py-2 text-[11px] bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
