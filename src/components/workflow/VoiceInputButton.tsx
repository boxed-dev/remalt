'use client';

import { Mic, Loader2, Square } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { recordingManager, type RecordingState } from '@/lib/recording-manager';

interface VoiceInputButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  mode?: 'append' | 'replace';
}

/**
 * Minimal voice input button with Deepgram live transcription
 * Integrates with existing recordingManager singleton
 */
export function VoiceInputButton({
  onTranscript,
  disabled = false,
  size = 'sm',
  mode = 'append',
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Track if this button is the active recorder
  const [isActiveRecorder, setIsActiveRecorder] = useState(false);

  // Use ref to accumulate transcripts without causing re-renders
  const accumulatedTranscriptRef = useRef<string[]>([]);
  const onTranscriptRef = useRef(onTranscript);
  const currentInterimRef = useRef<string>('');

  // Keep callback ref updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Subscribe to recording events
  useEffect(() => {
    const unsubscribeState = recordingManager.on('state-changed', (newState) => {
      if (isActiveRecorder) {
        setRecordingState(newState);

        if (newState === 'processing') {
          setIsRecording(false);
        }

        if (newState === 'idle') {
          setIsRecording(false);
          setIsActiveRecorder(false);
        }
      }
    });

    const unsubscribeInterim = recordingManager.on('transcript-interim', (transcript) => {
      if (isActiveRecorder && transcript.trim()) {
        // Store interim transcript
        currentInterimRef.current = transcript.trim();

        // Build current text: accumulated finals + current interim
        const fullText = [
          ...accumulatedTranscriptRef.current,
          currentInterimRef.current
        ].join(' ');

        // Update input field in real-time
        if (fullText) {
          onTranscriptRef.current(fullText);
        }
      }
    });

    const unsubscribeFinal = recordingManager.on('transcript-final', (transcript) => {
      if (isActiveRecorder && transcript.trim()) {
        // Move final transcript to accumulated array
        accumulatedTranscriptRef.current.push(transcript.trim());
        currentInterimRef.current = ''; // Clear interim

        // Update input with accumulated finals only
        const fullText = accumulatedTranscriptRef.current.join(' ');
        if (fullText) {
          onTranscriptRef.current(fullText);
        }
      }
    });

    const unsubscribeComplete = recordingManager.on('recording-complete', (recordingData) => {
      if (isActiveRecorder) {
        // Get final transcript - prefer accumulated over recordingData
        const finalTranscript = accumulatedTranscriptRef.current.length > 0
          ? accumulatedTranscriptRef.current.join(' ')
          : (recordingData.transcript || '').trim();

        // Send final transcript one last time
        if (finalTranscript) {
          onTranscriptRef.current(finalTranscript);
        }

        // Reset state
        accumulatedTranscriptRef.current = [];
        currentInterimRef.current = '';
        setIsRecording(false);
        setIsActiveRecorder(false);
        setError(null);
      }
    });

    const unsubscribeError = recordingManager.on('error', (errorMessage) => {
      if (isActiveRecorder) {
        setError(errorMessage);
        setIsRecording(false);
        setIsActiveRecorder(false);
        accumulatedTranscriptRef.current = [];
        currentInterimRef.current = '';
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeInterim();
      unsubscribeFinal();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [isActiveRecorder]);

  const handleStartRecording = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    // Check if already recording somewhere else
    if (recordingManager.isRecording()) {
      alert('Already recording in another field. Please stop that recording first.');
      return;
    }

    try {
      setIsActiveRecorder(true);
      setIsRecording(true);
      accumulatedTranscriptRef.current = [];
      currentInterimRef.current = '';
      setError(null);

      await recordingManager.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start recording. Check microphone permissions.');
      setIsRecording(false);
      setIsActiveRecorder(false);
    }
  }, [disabled]);

  const handleStopRecording = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isActiveRecorder) return;

    try {
      await recordingManager.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError('Failed to stop recording');
      setIsRecording(false);
      setIsActiveRecorder(false);
    }
  }, [isActiveRecorder]);

  const handleCancelRecording = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isActiveRecorder) return;

    try {
      await recordingManager.cancelRecording();
      accumulatedTranscriptRef.current = [];
      currentInterimRef.current = '';
      setIsRecording(false);
      setIsActiveRecorder(false);
      setError(null);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  }, [isActiveRecorder]);

  const sizeClasses = size === 'sm'
    ? 'w-7 h-7'
    : 'w-9 h-9';

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (recordingState === 'processing' && isActiveRecorder) {
    return (
      <div className={`${sizeClasses} relative flex items-center justify-center rounded-full bg-[#4338CA] shadow-lg`} title="Finishing recording...">
        <span className="absolute inline-flex h-full w-full rounded-full border-2 border-t-transparent border-[#818CF8] animate-spin" />
        <Mic className={`${iconSize} text-white relative z-10`} />
      </div>
    );
  }

  if (!isRecording) {
    return (
      <button
        type="button"
        onClick={handleStartRecording}
        disabled={disabled || recordingState === 'processing'}
        className={`${sizeClasses} flex items-center justify-center rounded-full border border-[#095D40]/20 bg-[#095D40]/5 hover:bg-[#095D40]/10 hover:border-[#095D40] transition-all disabled:opacity-40 disabled:cursor-not-allowed group shadow-sm`}
        title={error ? error : 'Voice input (click to record)'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Mic className={`${iconSize} text-[#095D40] group-hover:text-[#074830] transition-colors`} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {recordingState === 'recording' && (
        <>
          <button
            type="button"
            onClick={handleStopRecording}
            className={`${sizeClasses} relative flex items-center justify-center rounded-full bg-[#EF4444] hover:bg-[#DC2626] transition-all shadow-lg animate-pulse-soft`}
            title="Stop recording"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Pulsing rings */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75 animate-ping-slow" />
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-50 animate-ping-slower" />

            {/* Mic icon */}
            <Mic className={`${iconSize} text-white relative z-10`} />
          </button>
          <button
            type="button"
            onClick={handleCancelRecording}
            className="text-[11px] text-[#6B7280] hover:text-[#1F2937] px-1.5 transition-colors"
            title="Cancel recording"
            onMouseDown={(e) => e.stopPropagation()}
          >
            Cancel
          </button>
        </>
      )}
      {error && (
        <div className="text-[10px] text-[#EF4444] max-w-[120px]">
          {error}
        </div>
      )}
    </div>
  );
}
