import { Mic, Loader2, CheckCircle2, ChevronDown, ChevronUp, Download, Square } from 'lucide-react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { AIInstructionsInline } from './AIInstructionsInline';
import type { NodeProps } from '@xyflow/react';
import type { VoiceNodeData } from '@/types/workflow';
import { recordingManager, type RecordingState } from '@/lib/recording-manager';

// Global state to track which node is currently recording
let currentRecordingNodeId: string | null = null;

export function VoiceNode({ id, data }: NodeProps<VoiceNodeData>) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [isRecordingThisNode, setIsRecordingThisNode] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
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

  // Subscribe to recording events - but only act if this is the recording node
  useEffect(() => {
    const unsubscribeState = recordingManager.on('state-changed', (newState) => {
      if (currentRecordingNodeId === id) {
        setRecordingState(newState);
        if (newState === 'error') {
          setRecordingError('Recording failed. Please try again.');
        }
        if (newState === 'idle') {
          setIsRecordingThisNode(false);
          currentRecordingNodeId = null;
        }
      }
    });

    const unsubscribeInterim = recordingManager.on('transcript-interim', (transcript) => {
      if (currentRecordingNodeId === id) {
        setInterimTranscript(transcript);
      }
    });

    const unsubscribeFinal = recordingManager.on('transcript-final', (transcript) => {
      if (currentRecordingNodeId === id) {
        setFinalTranscripts((prev) => [...prev, transcript]);
        setInterimTranscript('');
      }
    });

    const unsubscribeComplete = recordingManager.on('recording-complete', (recordingData) => {
      if (currentRecordingNodeId === id) {
        // Auto-insert audio and transcript into this node
        const audioUrl = URL.createObjectURL(recordingData.audioBlob);

        updateNodeData(id, {
          audioUrl,
          transcript: recordingData.transcript,
          duration: recordingData.duration,
          transcriptStatus: 'success',
          transcriptError: undefined,
        } as Partial<VoiceNodeData>);

        // Reset recording UI state
        setFinalTranscripts([]);
        setInterimTranscript('');
        setDuration(0);
        setRecordingError(null);
        setIsRecordingThisNode(false);
        currentRecordingNodeId = null;
      }
    });

    const unsubscribeError = recordingManager.on('error', (errorMessage) => {
      if (currentRecordingNodeId === id) {
        setRecordingError(errorMessage);
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeInterim();
      unsubscribeFinal();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [id, updateNodeData]);

  // Duration counter - only for this node
  useEffect(() => {
    if (isRecordingThisNode && recordingState === 'recording') {
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (recordingState === 'idle') {
        setDuration(0);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecordingThisNode, recordingState]);

  // Auto-scroll transcripts
  useEffect(() => {
    if (isRecordingThisNode) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [finalTranscripts, interimTranscript, isRecordingThisNode]);

  const handleStartRecording = async (event: React.MouseEvent) => {
    stopPropagation(event);

    // Check if another node is already recording
    if (currentRecordingNodeId && currentRecordingNodeId !== id) {
      alert('Another voice node is already recording. Please stop that recording first.');
      return;
    }

    try {
      // Mark this node as the recording node
      currentRecordingNodeId = id;
      setIsRecordingThisNode(true);

      // Clear old data
      updateNodeData(id, {
        audioUrl: undefined,
        transcript: undefined,
        duration: undefined,
        transcriptStatus: 'idle',
        transcriptError: undefined,
      } as Partial<VoiceNodeData>);

      await recordingManager.startRecording();
      setRecordingError(null);
      setFinalTranscripts([]);
      setInterimTranscript('');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingError('Failed to start recording. Please check microphone permissions.');
      currentRecordingNodeId = null;
      setIsRecordingThisNode(false);
    }
  };

  const handleStopRecording = async (event: React.MouseEvent) => {
    stopPropagation(event);
    try {
      await recordingManager.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecordingError('Failed to stop recording');
    }
  };

  const handleCancelRecording = async (event: React.MouseEvent) => {
    stopPropagation(event);
    try {
      await recordingManager.cancelRecording();
      setFinalTranscripts([]);
      setInterimTranscript('');
      setDuration(0);
      setRecordingError(null);
      setIsRecordingThisNode(false);
      currentRecordingNodeId = null;
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const liveWordCount = [...finalTranscripts.join(' ').split(/\s+/), ...interimTranscript.split(/\s+/)].filter(Boolean).length;

  // Only show recording UI if this specific node is recording
  const showRecordingUI = isRecordingThisNode && recordingState !== 'idle';

  return (
    <BaseNode id={id} showTargetHandle={false}>
      <div className="w-[320px] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#8B5CF6]" />
            <span className="text-[13px] font-medium text-[#1A1D21]">Voice</span>
          </div>
          {isRecordingThisNode && recordingState === 'recording' && (
            <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-1 text-[10px] text-[#EF4444]">
              <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
              <span>Recording</span>
            </div>
          )}
          {isRecordingThisNode && recordingState === 'processing' && (
            <div className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-1 text-[10px] text-[#4338CA]">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Processing</span>
            </div>
          )}
          {data.transcriptStatus === 'success' && !isRecordingThisNode && (
            <div className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-1 text-[10px] text-[#047857]">
              <CheckCircle2 className="h-3 w-3" />
              <span>Ready</span>
            </div>
          )}
        </div>

        {/* Recording UI - only shown for the recording node */}
        {showRecordingUI && (
          <div className="space-y-3 rounded-lg border-2 border-[#EF4444] bg-gradient-to-br from-[#FEF2F2] to-white p-4">
            {/* Waveform visualization */}
            <div className="flex items-center justify-center gap-1 h-16">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#EF4444] rounded-full"
                  style={{
                    height: recordingState === 'recording'
                      ? `${Math.random() * 60 + 10}%`
                      : '20%',
                    animationName: recordingState === 'recording' ? 'waveform' : 'none',
                    animationDuration: recordingState === 'recording' ? `${0.5 + Math.random() * 0.5}s` : '0s',
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>

            {/* Duration */}
            {recordingState === 'recording' && (
              <div className="text-center">
                <div className="text-[20px] font-mono font-semibold text-[#1F2937]">
                  {formatDuration(duration)}
                </div>
              </div>
            )}

            {/* Live transcript */}
            {!recordingError && (
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-3">
                <div className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                  Live Transcript
                </div>
                <div className="max-h-[120px] overflow-y-auto">
                  {finalTranscripts.length === 0 && !interimTranscript ? (
                    <div className="text-center py-4 text-[#9CA3AF] text-[12px]">
                      {recordingState === 'requesting-permission'
                        ? 'Requesting access...'
                        : recordingState === 'recording'
                        ? 'Start speaking...'
                        : recordingState === 'processing'
                        ? 'Processing audio...'
                        : 'Waiting...'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-[12px] leading-relaxed">
                      {finalTranscripts.map((transcript, index) => (
                        <div key={index} className="text-[#1F2937]">
                          {transcript}
                        </div>
                      ))}
                      {interimTranscript && (
                        <div className="text-[#6B7280] italic animate-pulse">
                          {interimTranscript}
                        </div>
                      )}
                      <div ref={transcriptEndRef} />
                    </div>
                  )}
                </div>
                {liveWordCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#E5E7EB]">
                    <div className="text-[10px] text-[#6B7280]">~{liveWordCount} words</div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {recordingError && (
              <div className="rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] px-3 py-2">
                <p className="text-[#B91C1C] text-[11px]">{recordingError}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {recordingState === 'recording' && (
                <>
                  <button
                    onClick={handleStopRecording}
                    onMouseDown={stopPropagation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1D21] text-white rounded-lg hover:bg-black transition-all shadow-lg"
                  >
                    <Square className="h-4 w-4 fill-white" />
                    <span className="text-[13px] font-medium">Stop Recording</span>
                  </button>
                  <button
                    onClick={handleCancelRecording}
                    onMouseDown={stopPropagation}
                    className="w-full px-3 py-2 text-[12px] text-[#6B7280] hover:text-[#1F2937] hover:bg-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
              {recordingState === 'processing' && (
                <div className="text-center text-[11px] text-[#6B7280] py-2">
                  Creating voice node...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Existing audio display */}
        {hasAudio && !showRecordingUI && (
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
            {(hasTranscript || hasAudio) && (
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
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
            )}
          </div>
        )}

        {/* Initial state - click to record */}
        {!hasAudio && !showRecordingUI && (
          <button
            onClick={handleStartRecording}
            onMouseDown={stopPropagation}
            className="w-full p-4 border-2 border-dashed border-[#E5E7EB] rounded-lg hover:border-[#8B5CF6] hover:bg-[#F5F5F7] transition-all group"
          >
            <Mic className="h-8 w-8 text-[#8B5CF6] mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-[12px] font-medium text-[#1A1D21] mb-1">Click to Record</div>
            <div className="text-[10px] text-[#6B7280]">Live transcription with Deepgram</div>
          </button>
        )}

        <AIInstructionsInline
          value={data.aiInstructions}
          onChange={(value) => updateNodeData(id, { aiInstructions: value } as Partial<VoiceNodeData>)}
          nodeId={id}
          nodeType="voice"
        />
      </div>

      <style jsx>{`
        @keyframes waveform {
          0%, 100% { height: 20%; }
          50% { height: 80%; }
        }
      `}</style>
    </BaseNode>
  );
}
