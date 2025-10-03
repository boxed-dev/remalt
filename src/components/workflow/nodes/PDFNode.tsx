import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, BookOpen, Download } from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { PDFNodeData } from '@/types/workflow';

export function PDFNode({ id, data }: NodeProps<PDFNodeData>) {
  const [mode, setMode] = useState<'choose' | 'url'>('choose');
  const [url, setUrl] = useState(data.url || '');
  const [showDetails, setShowDetails] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const hasParsedContent = useMemo(() => data.parseStatus === 'success' && (data.parsedText || (data.segments?.length ?? 0) > 0), [data.parseStatus, data.parsedText, data.segments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        updateNodeData(id, {
          file,
          fileName: file.name,
        } as Partial<PDFNodeData>);

        await triggerParsing({ kind: 'base64', payload: base64 });
      };
      reader.readAsDataURL(file);
      setMode('choose');
    }
  };

  const handleUrlSave = async () => {
    if (url.trim()) {
      updateNodeData(id, {
        url,
        fileName: url.split('/').pop() || 'Document',
      } as Partial<PDFNodeData>);

      await triggerParsing({ kind: 'url', payload: url });
    }
    setMode('choose');
  };

  const resetNode = () => {
    setMode('choose');
    setUrl('');
  };

  const fileToBase64 = async (file: File) => await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const triggerParsing = async (source?: { kind: 'base64' | 'url'; payload: string }) => {
    try {
      let parseSource = source;

      if (!parseSource) {
        if (data.file) {
          const base64 = await fileToBase64(data.file as File);
          parseSource = { kind: 'base64', payload: base64 };
        } else if (data.url) {
          parseSource = { kind: 'url', payload: data.url };
        }
      }

      if (!parseSource)
        return;

      updateNodeData(id, {
        parseStatus: 'parsing',
        parseError: undefined,
      } as Partial<PDFNodeData>);

      const body = parseSource.kind === 'base64'
        ? { pdfData: parseSource.payload.split(',')[1] }
        : { pdfUrl: parseSource.payload };

      const response = await fetch('/api/pdf/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        updateNodeData(id, {
          parsedText: result.parsedText,
          segments: result.segments,
          parseStatus: 'success',
          parseError: undefined,
        } as Partial<PDFNodeData>);
      } else {
        updateNodeData(id, {
          parseStatus: 'error',
          parseError: result.error,
        } as Partial<PDFNodeData>);
      }
    } catch (error) {
      console.error('PDF parsing failed:', error);
      updateNodeData(id, {
        parseStatus: 'error',
        parseError: 'Failed to parse PDF',
      } as Partial<PDFNodeData>);
    }
  };

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  const renderStatus = () => {
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
    if (!data.parsedText)
      return;

    const blob = new Blob([data.parsedText], { type: 'text/plain;charset=utf-8' });
    const urlObject = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObject;
    link.download = `${data.fileName || 'document'}.txt`;
    link.click();
    URL.revokeObjectURL(urlObject);
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
              className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 hover:border-[#EF4444]"
            >
              <div className="text-[12px] font-medium text-[#1A1D21] truncate" title={data.fileName}>{data.fileName}</div>
              {data.url && (
                <div className="text-[10px] text-[#6B7280] truncate" title={data.url}>{data.url}</div>
              )}
            </div>
            {data.parseStatus === 'error' && (
              <div className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">
                {data.parseError || 'Failed to parse PDF. Try again.'}
              </div>
            )}
            {hasParsedContent && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <button
                  onClick={(event) => {
                    stopPropagation(event);
                    setShowDetails(prev => !prev);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-[#1A1D21] hover:bg-[#F3F4F6]"
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
                        className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-1 text-[10px] text-[#4338CA] hover:border-[#C7D2FE]"
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
                className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#6B7280] hover:border-[#EF4444] hover:text-[#EF4444]"
              >
                Replace PDF
              </button>
              {(data.parseStatus === 'error' || data.parseStatus === 'success') && (
                <button
                  onClick={handleReparse}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-1 text-[#B91C1C] hover:bg-[#FEE2E2]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-parse
                </button>
              )}
              {hasParsedContent && data.parsedText && (
                <button
                  onClick={downloadParsedText}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21]"
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
              className="block w-full p-4 border border-dashed border-[#E5E7EB] rounded hover:border-[#EF4444] hover:bg-[#FEF2F2] transition text-center cursor-pointer"
            >
              <Upload className="h-8 w-8 text-[#EF4444] mx-auto mb-1" />
              <div className="text-[11px] text-[#6B7280]">Upload PDF</div>
            </label>
            <button
              onClick={() => setMode('url')}
              className="w-full p-4 border border-dashed border-[#E5E7EB] rounded hover:border-[#EF4444] hover:bg-[#FEF2F2] transition text-center"
            >
              <FileText className="h-8 w-8 text-[#EF4444] mx-auto mb-1" />
              <div className="text-[11px] text-[#6B7280]">Paste URL</div>
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
              placeholder="Paste PDF URL..."
              className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#EF4444]"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode('choose')}
                className="flex-1 px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded transition"
              >
                Back
              </button>
              <button
                onClick={handleUrlSave}
                disabled={!url.trim()}
                className="flex-1 px-3 py-2 text-[11px] bg-[#EF4444] text-white rounded hover:bg-[#DC2626] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Add URL
              </button>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
