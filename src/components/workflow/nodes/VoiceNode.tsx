import { Mic, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import type { NodeProps } from '@xyflow/react';
import type { VoiceNodeData } from '@/types/workflow';

export function VoiceNode({ id, data }: NodeProps<VoiceNodeData>) {
  const [mode, setMode] = useState<'choose' | 'record' | 'upload'>('choose');
  const [isRecording, setIsRecording] = useState(false);
  const [url, setUrl] = useState(data.audioUrl || '');
  const [barHeights] = useState(() => Array(5).fill(0).map(() => Math.random() * 12 + 12));
  const [showTranscript, setShowTranscript] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const hasTranscript = useMemo(() => data.transcriptStatus === 'success' && !!data.transcript, [data.transcriptStatus, data.transcript]);
  const hasAudio = useMemo(() => !!data.audioUrl, [data.audioUrl]);
  const transcriptWordCount = useMemo(() => {
    if (!data.transcript)
      return 0;
    const words = data.transcript.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [data.transcript]);
  const formattedDuration = useMemo(() => {
    if (!data.duration)
      return null;
    const seconds = Math.round(data.duration);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    if (minutes === 0)
      return `${seconds}s`;
    return `${minutes}m ${remainder.toString().padStart(2, '0')}s`;
  }, [data.duration]);

  const stopPropagation = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
  };

  const fileToBase64 = async (file: File) => await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const triggerTranscription = async (source?: { kind: 'base64' | 'url'; payload: string }) => {
    try {
      let transcriptionSource = source;

      if (!transcriptionSource) {
        if (data.audioFile) {
          const base64 = await fileToBase64(data.audioFile as File);
          transcriptionSource = { kind: 'base64', payload: base64 };
        } else if (data.audioUrl) {
          transcriptionSource = { kind: 'url', payload: data.audioUrl };
        }
      }

      if (!transcriptionSource)
        return;

      updateNodeData(id, {
        transcriptStatus: 'transcribing',
        transcriptError: undefined,
      } as Partial<VoiceNodeData>);

      const body = transcriptionSource.kind === 'base64'
        ? { audioData: transcriptionSource.payload.split(',')[1] }
        : { audioUrl: transcriptionSource.payload };

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        updateNodeData(id, {
          transcript: result.transcript,
          duration: result.duration,
          transcriptStatus: 'success',
          transcriptError: undefined,
        } as Partial<VoiceNodeData>);
      } else {
        updateNodeData(id, {
          transcriptStatus: 'error',
          transcriptError: result.error,
        } as Partial<VoiceNodeData>);
      }
    } catch (error) {
      console.error('Voice transcription failed:', error);
      updateNodeData(id, {
        transcriptStatus: 'error',
        transcriptError: 'Failed to transcribe audio',
      } as Partial<VoiceNodeData>);
    }
  };

  const renderStatus = () => {
    if (data.transcriptStatus === 'transcribing')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-1 text-[10px] text-[#4338CA]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Transcribing</span>
        </div>
      );

    if (data.transcriptStatus === 'success')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-1 text-[10px] text-[#047857]">
          <CheckCircle2 className="h-3 w-3" />
          <span>Transcript ready</span>
        </div>
      );

    if (data.transcriptStatus === 'error')
      return (
        <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-1 text-[10px] text-[#B91C1C]">
          <AlertCircle className="h-3 w-3" />
          <span>Transcription failed</span>
        </div>
      );

    return null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
          });
          streamRef.current = null;
        }

        const recordingFile = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
        const base64 = await fileToBase64(recordingFile);

        setShowTranscript(false);
        updateNodeData(id, {
          audioUrl,
          audioFile: recordingFile,
          duration: 0,
        } as Partial<VoiceNodeData>);

        await triggerTranscription({ kind: 'base64', payload: base64 });

        setMode('choose');
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Tracks will be stopped in the onstop handler
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const audioUrl = URL.createObjectURL(file);

      const base64 = await fileToBase64(file);

      setShowTranscript(false);
      updateNodeData(id, {
        audioUrl,
        audioFile: file,
      } as Partial<VoiceNodeData>);

      await triggerTranscription({ kind: 'base64', payload: base64 });
      setMode('choose');
    }
  };

  const handleUrlSave = async () => {
    if (url.trim()) {
      setShowTranscript(false);
      updateNodeData(id, {
        audioUrl: url,
        audioFile: undefined,
      } as Partial<VoiceNodeData>);

      await triggerTranscription({ kind: 'url', payload: url });
    }
    setMode('choose');
  };

  const resetNode = () => {
    setMode('choose');
    setUrl('');
    setShowTranscript(false);
  };

  const handleRetranscribe = async (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    setShowTranscript(false);
    await triggerTranscription();
  };

  const downloadTranscript = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    if (!data.transcript)
      return;

    const blob = new Blob([data.transcript], { type: 'text/plain;charset=utf-8' });
    const urlObject = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObject;
    link.download = 'transcript.txt';
    link.click();
    URL.revokeObjectURL(urlObject);
  };

  const downloadAudio = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    if (!data.audioUrl)
      return;

    const link = document.createElement('a');
    link.href = data.audioUrl;
    link.download = 'audio.webm';
    link.click();
  };

  return (
    <BaseNode id={id} showTargetHandle={false}>
      <div className="w-[280px] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#8B5CF6]" />
            <span className="text-[13px] font-medium text-[#1A1D21]">Voice</span>
          </div>
          {renderStatus()}
        </div>

        {hasAudio ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              <audio
                controls
                className="h-8 w-full"
                onPointerDown={stopPropagation}
                onTouchStart={stopPropagation}
              >
                <source src={data.audioUrl!} type="audio/webm" />
                <source src={data.audioUrl!} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#6B7280]">
              {formattedDuration && <span>Duration · {formattedDuration}</span>}
              {hasTranscript && transcriptWordCount > 0 && <span>Transcript · ~{transcriptWordCount} words</span>}
            </div>
            {data.transcriptStatus === 'error' && (
              <div className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">
                {data.transcriptError || 'Failed to transcribe audio. Try again.'}
              </div>
            )}
            {hasTranscript && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white">
                <button
                  onClick={(event) => {
                    stopPropagation(event);
                    setShowTranscript(prev => !prev);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-[#1A1D21] hover:bg-[#F3F4F6]"
                >
                  <span>Transcript preview</span>
                  {showTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showTranscript && (
                  <div className="max-h-36 overflow-y-auto px-3 pb-3 text-[11px] leading-relaxed text-[#4B5563]">
                    {data.transcript}
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
                className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#6B7280] hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
              >
                Replace audio
              </button>
              {(data.transcriptStatus === 'error' || data.transcriptStatus === 'success') && (
                <button
                  onClick={handleRetranscribe}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E0E7FF] bg-[#EEF2FF] px-3 py-1 text-[#4338CA] hover:bg-[#E0E7FF]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-transcribe
                </button>
              )}
              {hasTranscript && (
                <button
                  onClick={downloadTranscript}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export transcript
                </button>
              )}
              {hasAudio && (
                <button
                  onClick={downloadAudio}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[#374151] hover:border-[#1A1D21]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save audio
                </button>
              )}
            </div>
          </div>
        ) : mode === 'choose' ? (
          <div className="space-y-2">
            <button
              onClick={() => setMode('record')}
              onMouseDown={stopPropagation}
              className="w-full p-4 border border-dashed border-[#E5E7EB] rounded hover:border-[#8B5CF6] hover:bg-[#F5F5F7] transition text-center"
            >
              <Mic className="h-8 w-8 text-[#8B5CF6] mx-auto mb-1" />
              <div className="text-[11px] text-[#6B7280]">Record audio</div>
            </button>
            <button
              onClick={() => setMode('upload')}
              onMouseDown={stopPropagation}
              className="w-full p-4 border border-dashed border-[#E5E7EB] rounded hover:border-[#8B5CF6] hover:bg-[#F5F5F7] transition text-center"
            >
              <Upload className="h-8 w-8 text-[#8B5CF6] mx-auto mb-1" />
              <div className="text-[11px] text-[#6B7280]">Upload file or URL</div>
            </button>
          </div>
        ) : mode === 'record' ? (
          <div className="space-y-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                onMouseDown={stopPropagation}
                className="w-full p-5 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white rounded-lg hover:from-[#7C3AED] hover:to-[#6D28D9] active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white rounded-full opacity-20 animate-pulse" />
                    <Mic className="h-8 w-8 relative" />
                  </div>
                  <div className="text-[13px] font-semibold tracking-wide">Start Recording</div>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative p-6 bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-lg overflow-hidden">
                  {/* Animated background waves */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-white rounded-full blur-2xl animate-pulse" style={{ animationDuration: '2s' }} />
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                  </div>

                  <div className="relative flex flex-col items-center justify-center gap-3">
                    {/* Pulsing concentric circles */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-white rounded-full opacity-20 animate-ping" />
                      <div className="absolute inset-0 bg-white rounded-full opacity-30 animate-pulse" />
                      <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center">
                        <Mic className="h-8 w-8 text-[#EF4444]" />
                      </div>
                    </div>

                    {/* Audio level bars */}
                    <div className="flex items-center gap-1">
                      {barHeights.map((height, i) => (
                        <div
                          key={i}
                          className="w-1 bg-white rounded-full"
                          style={{
                            height: `${height}px`,
                            animation: `pulse 0.7s ease-in-out infinite`,
                            animationDelay: `${i * 0.15}s`
                          }}
                        />
                      ))}
                    </div>

                    <span className="text-[13px] font-semibold text-white tracking-wide">Recording...</span>
                  </div>
                </div>

                <button
                  onClick={stopRecording}
                  onMouseDown={stopPropagation}
                  className="w-full p-3 bg-[#1A1D21] text-white rounded-lg hover:bg-[#000000] active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 shadow-lg"
                >
                  <div className="w-4 h-4 bg-white rounded-sm" />
                  <span className="text-[12px] font-medium">Stop Recording</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setMode('choose')}
              onMouseDown={stopPropagation}
              className="w-full text-[11px] text-[#6B7280] hover:text-[#1A1D21] transition"
            >
              Back
            </button>
          </div>
        ) : mode === 'upload' ? (
          <div className="space-y-2">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
              id={`audio-upload-${id}`}
            />
            <label
              htmlFor={`audio-upload-${id}`}
              onMouseDown={stopPropagation}
              className="block w-full p-4 border border-dashed border-[#E5E7EB] rounded hover:border-[#8B5CF6] hover:bg-[#F5F5F7] transition text-center cursor-pointer"
            >
              <Upload className="h-8 w-8 text-[#8B5CF6] mx-auto mb-1" />
              <div className="text-[11px] text-[#6B7280]">Choose file</div>
            </label>
            <div className="text-[11px] text-[#9CA3AF] text-center">or</div>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUrlSave();
                if (e.key === 'Escape') setMode('choose');
              }}
              placeholder="Paste audio URL..."
              className="w-full px-3 py-2 text-[12px] border border-[#E5E7EB] rounded focus:outline-none focus:border-[#8B5CF6]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode('choose')}
                onMouseDown={stopPropagation}
                className="flex-1 px-3 py-2 text-[11px] text-[#6B7280] hover:text-[#1A1D21] border border-[#E5E7EB] rounded transition"
              >
                Back
              </button>
              <button
                onClick={handleUrlSave}
                onMouseDown={stopPropagation}
                disabled={!url.trim()}
                className="flex-1 px-3 py-2 text-[11px] bg-[#8B5CF6] text-white rounded hover:bg-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Add URL
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </BaseNode>
  );
}
