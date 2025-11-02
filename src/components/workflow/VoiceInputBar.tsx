'use client';

import { Plus, Mic, Check, Loader2, Send } from 'lucide-react';
import { useState, useEffect, useRef, forwardRef } from 'react';
import { recordingManager, type RecordingState } from '@/lib/recording-manager';
import { cn } from '@/lib/utils';

interface VoiceInputBarProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onSend?: () => void;
  voiceMode?: 'append' | 'replace';
  showAddButton?: boolean;
  onAddClick?: () => void;
  showRecordingHint?: boolean;
}

/**
 * Modern voice input bar with dark pill design and live waveform
 */
export const VoiceInputBar = forwardRef<HTMLTextAreaElement, VoiceInputBarProps>(
  ({
    value,
    onChange,
    onSend,
    voiceMode = 'replace',
    showAddButton = true,
    onAddClick,
    showRecordingHint = true,
    disabled,
    placeholder = 'Ask anything',
    className,
    ...props
  }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isActiveRecorder, setIsActiveRecorder] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Audio visualization - store real frequency data for each bar (reduced to 16 for performance)
    const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(16));
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);

    // Track accumulated transcripts (don't show until confirmed)
    const accumulatedTranscriptRef = useRef<string[]>([]);
    const currentInterimRef = useRef<string>('');

    // Subscribe to recording events
    useEffect(() => {
      const unsubscribeState = recordingManager.on('state-changed', (newState) => {
        if (isActiveRecorder) {
          setRecordingState(newState);
          if (newState === 'idle') {
            setIsRecording(false);
            setIsActiveRecorder(false);
            stopAudioVisualization();
          }
        }
      });

      const unsubscribeInterim = recordingManager.on('transcript-interim', (transcript) => {
        if (isActiveRecorder && transcript.trim()) {
          // Store interim transcript but DON'T update input field
          currentInterimRef.current = transcript.trim();
        }
      });

      const unsubscribeFinal = recordingManager.on('transcript-final', (transcript) => {
        if (isActiveRecorder && transcript.trim()) {
          // Accumulate final transcripts but DON'T update input field yet
          accumulatedTranscriptRef.current.push(transcript.trim());
          currentInterimRef.current = '';
        }
      });

      const unsubscribeComplete = recordingManager.on('recording-complete', (recordingData) => {
        if (isActiveRecorder) {
          // Only NOW update the input field with final transcript
          const finalTranscript = accumulatedTranscriptRef.current.length > 0
            ? accumulatedTranscriptRef.current.join(' ')
            : (recordingData.transcript || '').trim();

          if (finalTranscript) {
            onChange(finalTranscript);
          }

          accumulatedTranscriptRef.current = [];
          currentInterimRef.current = '';
          setIsRecording(false);
          setIsActiveRecorder(false);
          setError(null);
          stopAudioVisualization();
        }
      });

      const unsubscribeError = recordingManager.on('error', (errorMessage) => {
        if (isActiveRecorder) {
          setError(errorMessage);
          setIsRecording(false);
          setIsActiveRecorder(false);
          accumulatedTranscriptRef.current = [];
          currentInterimRef.current = '';
          stopAudioVisualization();
        }
      });

      return () => {
        unsubscribeState();
        unsubscribeInterim();
        unsubscribeFinal();
        unsubscribeComplete();
        unsubscribeError();
      };
    }, [isActiveRecorder, onChange]);

    // Audio visualization setup - optimized with throttling and reduced bars
    const startAudioVisualization = async (stream: MediaStream) => {
      try {
        mediaStreamRef.current = stream;
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 64; // Reduced from 128 for better performance
        analyzerRef.current.smoothingTimeConstant = 0.7;
        source.connect(analyzerRef.current);

        const updateFrequencyData = (timestamp: number) => {
          if (!analyzerRef.current) return;

          // Throttle to ~30fps (33ms between updates) for better performance
          const elapsed = timestamp - lastUpdateTimeRef.current;
          if (elapsed < 33) {
            animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
            return;
          }
          lastUpdateTimeRef.current = timestamp;

          // Get 32 frequency bins from the analyzer
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);

          // Take first 16 bins for visualization (covers most voice frequencies)
          const displayData = new Uint8Array(16);
          for (let i = 0; i < 16; i++) {
            displayData[i] = dataArray[i];
          }

          setFrequencyData(displayData);
          animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
        };

        animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
      } catch (error) {
        console.error('Failed to setup audio visualization:', error);
      }
    };

    const stopAudioVisualization = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      analyzerRef.current = null;
      setFrequencyData(new Uint8Array(16)); // Reset to zeros (16 bars)
      lastUpdateTimeRef.current = 0;
    };

    // Start recording
    const handleStartRecording = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

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

        // Get the media stream from recording manager for visualization
        const stream = recordingManager.getMediaStream();
        if (stream) {
          startAudioVisualization(stream);
        }
      } catch (error) {
        console.error('Failed to start recording:', error);
        setError('Failed to start recording. Check microphone permissions.');
        setIsRecording(false);
        setIsActiveRecorder(false);
      }
    };

    // Stop recording and confirm
    const handleConfirmRecording = async (e: React.MouseEvent) => {
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
        stopAudioVisualization();
      }
    };

    // Cancel recording
    const handleCancelRecording = async () => {
      if (!isActiveRecorder) return;

      try {
        await recordingManager.cancelRecording();
        accumulatedTranscriptRef.current = [];
        currentInterimRef.current = '';
        setIsRecording(false);
        setIsActiveRecorder(false);
        setError(null);
        stopAudioVisualization();
        onChange(''); // Clear input
      } catch (error) {
        console.error('Failed to cancel recording:', error);
      }
    };

    // Auto-resize textarea based on content
    const adjustTextareaHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';

      // Set height based on scrollHeight, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
      textarea.style.height = `${newHeight}px`;
    };

    // Adjust height when value changes
    useEffect(() => {
      adjustTextareaHeight();
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && onSend) {
        e.preventDefault();
        onSend();
      }
      if (e.key === 'Escape' && isRecording) {
        e.preventDefault();
        handleCancelRecording();
      }
    };

    return (
      <div className="relative w-full">
        {/* Main container - Thinner and centered */}
        <div className={cn('flex flex-row items-center gap-2', className)}>
          <div className="flex items-center flex-1 min-w-0">
            <div className="w-full">
              <div className="relative overflow-hidden w-full flex items-center min-h-[32px]">
                {/* Textarea - Thinner */}
                <textarea
                  ref={(node) => {
                    textareaRef.current = node;
                    if (typeof ref === 'function') {
                      ref(node);
                    } else if (ref) {
                      ref.current = node;
                    }
                  }}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled || isRecording}
                  placeholder={placeholder}
                  rows={1}
                  className={cn(
                    'pl-2 pr-2 py-2 max-h-[200px] w-full resize-none overflow-auto',
                    'placeholder-gray-400 border-none bg-transparent text-gray-800 font-normal',
                    'focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none',
                    'focus-visible:outline-none leading-5',
                    isRecording && 'opacity-0',
                    disabled && 'cursor-not-allowed'
                  )}
                  style={{ fontSize: '14px' }}
                  {...props}
                />

                {/* Full-width waveform during recording */}
                {isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
                    <FullWidthWaveform frequencyData={frequencyData} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recording controls - show tick and cross when recording */}
          {isRecording ? (
            <>
              {/* Cancel button - X */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelRecording();
                }}
                disabled={recordingState === 'processing'}
                className={cn(
                  'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full',
                  'transition-all duration-200 shadow-sm',
                  'bg-[#FF3B30] hover:bg-[#FF2D1F]',
                  recordingState === 'processing' && 'opacity-50 cursor-not-allowed'
                )}
                title="Cancel recording"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Confirm button - Tick */}
              <button
                type="button"
                onClick={handleConfirmRecording}
                disabled={recordingState === 'processing'}
                className={cn(
                  'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full',
                  'transition-all duration-200 shadow-sm',
                  'bg-[#095D40] hover:bg-[#074A32]',
                  recordingState === 'processing' && 'opacity-50 cursor-not-allowed'
                )}
                title="Confirm recording"
              >
                {recordingState === 'processing' ? (
                  <Loader2 className="text-white w-4 h-4 animate-spin" strokeWidth={2.5} />
                ) : (
                  <Check className="text-white w-4 h-4" strokeWidth={2.5} />
                )}
              </button>
            </>
          ) : (
            /* Microphone or Send button */
            <button
              type="button"
              onClick={
                value.trim() && onSend
                  ? onSend
                  : handleStartRecording
              }
              disabled={disabled}
              className={cn(
                'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full',
                'transition-all duration-200 shadow-sm',
                'bg-[#095D40] hover:bg-[#074A32]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={value.trim() ? 'Send message' : 'Start voice input'}
            >
              {value.trim() && onSend ? (
                <Send className="text-white w-4 h-4" strokeWidth={2.5} />
              ) : (
                <Mic className="text-white w-4 h-4" strokeWidth={2.5} />
              )}
            </button>
          )}
        </div>

        {/* Error message only */}
        {error && (
          <div className="mt-2 text-center">
            <span className="text-[11px] text-red-500">{error}</span>
          </div>
        )}
      </div>
    );
  }
);

VoiceInputBar.displayName = 'VoiceInputBar';

/**
 * Full-width waveform that fills the entire input box
 */
function FullWidthWaveform({ frequencyData }: { frequencyData: Uint8Array }) {
  // Use more bars to fill width
  const barCount = 24;
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Sample frequency data evenly across the array
    const sampleIndex = Math.floor((i / barCount) * frequencyData.length);
    return frequencyData[sampleIndex] || 0;
  });

  return (
    <div className="flex items-center justify-between w-full h-full gap-[2px]">
      {bars.map((value, i) => {
        // Normalize and amplify
        const normalizedValue = value / 255;
        const amplified = Math.min(normalizedValue * 2.5, 1);

        // Variable heights for visual interest
        const baseHeight = 16;
        const scaleY = amplified > 0.05 ? Math.max(0.25, amplified) : 0.2;
        const finalHeight = baseHeight * scaleY;

        return (
          <div
            key={i}
            className="flex-1 bg-[#095D40] rounded-full transition-all duration-75 ease-out"
            style={{
              height: `${finalHeight}px`,
              opacity: amplified > 0.05 ? 0.7 : 0.3,
              minWidth: '2px',
            }}
          />
        );
      })}
    </div>
  );
}
