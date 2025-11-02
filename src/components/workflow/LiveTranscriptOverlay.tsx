'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { recordingManager, type RecordingState } from '@/lib/recording-manager';

interface LiveTranscriptOverlayProps {
  onComplete?: (data: { audioBlob: Blob; transcript: string; duration: number }) => void;
  onCancel?: () => void;
}

export function LiveTranscriptOverlay({ onComplete, onCancel }: LiveTranscriptOverlayProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [finalTranscripts, interimTranscript]);

  // Subscribe to recording events
  useEffect(() => {
    const unsubscribeState = recordingManager.on('state-changed', (newState) => {
      setState(newState);
      if (newState === 'error') {
        setError('Recording failed. Please try again.');
      }
    });

    const unsubscribeInterim = recordingManager.on('transcript-interim', (transcript) => {
      setInterimTranscript(transcript);
    });

    const unsubscribeFinal = recordingManager.on('transcript-final', (transcript) => {
      setFinalTranscripts((prev) => [...prev, transcript]);
      setInterimTranscript(''); // Clear interim when final arrives
    });

    const unsubscribeComplete = recordingManager.on('recording-complete', (data) => {
      onComplete?.(data);
    });

    const unsubscribeError = recordingManager.on('error', (errorMessage) => {
      setError(errorMessage);
    });

    return () => {
      unsubscribeState();
      unsubscribeInterim();
      unsubscribeFinal();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [onComplete]);

  // Duration counter
  useEffect(() => {
    if (state === 'recording') {
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (state === 'idle') {
        setDuration(0);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [state]);

  const handleStop = async () => {
    try {
      await recordingManager.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError('Failed to stop recording');
    }
  };

  const handleCancel = async () => {
    try {
      await recordingManager.cancelRecording();
      setFinalTranscripts([]);
      setInterimTranscript('');
      setDuration(0);
      setError(null);
      onCancel?.();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isVisible = state !== 'idle';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed left-4 bottom-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-[#E5E7EB] overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#EF4444] to-[#DC2626] px-4 py-3">
            {/* Animated background waves */}
            <div className="absolute inset-0 opacity-20">
              <div
                className="absolute bottom-0 left-0 right-0 h-16 bg-white rounded-full blur-2xl animate-pulse"
                style={{ animationDuration: '2s' }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-20 bg-white rounded-full blur-3xl animate-pulse"
                style={{ animationDuration: '3s', animationDelay: '0.5s' }}
              />
            </div>

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                {state === 'recording' ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-white rounded-full opacity-20 animate-ping" />
                    <div className="absolute inset-0 bg-white rounded-full opacity-30 animate-pulse" />
                    <div className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <Mic className="h-5 w-5 text-[#EF4444]" />
                    </div>
                  </div>
                ) : state === 'processing' ? (
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-[#EF4444] animate-spin" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Mic className="h-5 w-5 text-[#EF4444]" />
                  </div>
                )}

                <div className="text-white">
                  <div className="text-[14px] font-semibold">
                    {state === 'recording' && 'Recording...'}
                    {state === 'requesting-permission' && 'Starting...'}
                    {state === 'processing' && 'Processing...'}
                    {state === 'error' && 'Error'}
                  </div>
                  {state === 'recording' && (
                    <div className="text-[12px] opacity-90">{formatDuration(duration)}</div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCancel}
                disabled={state === 'processing'}
                className="text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-2 rounded-lg"
                title="Cancel recording"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Transcript Display */}
          <div className="bg-white">
            {error ? (
              <div className="px-4 py-6 text-center">
                <div className="text-[#B91C1C] text-[13px] mb-3">{error}</div>
                <button
                  onClick={handleCancel}
                  className="text-[12px] px-4 py-2 bg-[#F3F4F6] text-[#374151] rounded-lg hover:bg-[#E5E7EB] transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-[240px] overflow-y-auto px-4 py-3 min-h-[120px]">
                  {finalTranscripts.length === 0 && !interimTranscript ? (
                    <div className="flex items-center justify-center h-[100px] text-[#9CA3AF] text-[13px]">
                      {state === 'requesting-permission'
                        ? 'Requesting microphone access...'
                        : state === 'recording'
                        ? 'Start speaking...'
                        : 'Waiting...'}
                    </div>
                  ) : (
                    <div className="text-[13px] leading-relaxed text-[#1F2937]">
                      <span>{finalTranscripts.join(' ')}</span>
                      {interimTranscript && (
                        <span className="text-[#6B7280] italic animate-pulse">
                          {' '}{interimTranscript}
                        </span>
                      )}
                      <div ref={transcriptEndRef} />
                    </div>
                  )}
                </div>

                {/* Word Count */}
                {(finalTranscripts.length > 0 || interimTranscript) && (
                  <div className="px-4 py-2 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                    <div className="text-[11px] text-[#6B7280]">
                      ~
                      {[...finalTranscripts.join(' ').split(/\s+/), ...interimTranscript.split(/\s+/)]
                        .filter(Boolean).length}{' '}
                      words
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          {!error && state === 'recording' && (
            <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB]">
              <button
                onClick={handleStop}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1D21] text-white rounded-lg hover:bg-black active:scale-95 transition-all duration-150 shadow-lg"
              >
                <Square className="h-4 w-4 fill-white" />
                <span className="text-[13px] font-medium">Stop & Create Node</span>
              </button>
            </div>
          )}

          {state === 'processing' && (
            <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB]">
              <div className="text-center text-[12px] text-[#6B7280]">
                Creating voice node with transcript...
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
