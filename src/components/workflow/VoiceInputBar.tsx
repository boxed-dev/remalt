'use client';

import { Plus, Mic, Check, Loader2, Send } from 'lucide-react';
import { useState, useEffect, useRef, forwardRef } from 'react';
import { recordingManager, type RecordingState } from '@/lib/recording-manager';
import { cn } from '@/lib/utils';

interface VoiceInputBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onSend?: () => void;
  voiceMode?: 'append' | 'replace';
  showAddButton?: boolean;
  onAddClick?: () => void;
}

/**
 * Modern voice input bar with dark pill design and live waveform
 */
export const VoiceInputBar = forwardRef<HTMLInputElement, VoiceInputBarProps>(
  ({
    value,
    onChange,
    onSend,
    voiceMode = 'replace',
    showAddButton = true,
    onAddClick,
    disabled,
    placeholder = 'Ask anything',
    className,
    ...props
  }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isActiveRecorder, setIsActiveRecorder] = useState(false);

    // Audio visualization
    const [audioLevel, setAudioLevel] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

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

    // Audio visualization setup
    const startAudioVisualization = async (stream: MediaStream) => {
      try {
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 256;
        analyzerRef.current.smoothingTimeConstant = 0.8;
        source.connect(analyzerRef.current);

        const updateAudioLevel = () => {
          if (!analyzerRef.current) return;

          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);

          // Calculate average audio level
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalized = Math.min(average / 128, 1); // Normalize to 0-1
          setAudioLevel(normalized);

          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
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
      analyzerRef.current = null;
      setAudioLevel(0);
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

        // Get the media stream for visualization
        const session = recordingManager.getSession();
        if (session) {
          // Access the stream from the recording manager
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        {/* Main pill container */}
        <div
          className={cn(
            'relative flex items-center gap-3 px-4 py-3 rounded-[28px] transition-all duration-300',
            'bg-white border-2 border-[#D4AF7F]/40',
            'shadow-sm hover:shadow-md',
            isRecording && 'border-[#095D40]/50 shadow-[0_0_0_3px_rgba(9,93,64,0.12)]',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          {/* Left: Add button */}
          {showAddButton && (
            <button
              type="button"
              onClick={onAddClick}
              disabled={disabled}
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-[#D4AF7F]/10 transition-all duration-200 disabled:cursor-not-allowed group"
              title="Add attachment"
            >
              <Plus className="h-4 w-4 text-[#D4AF7F] group-hover:text-[#095D40] transition-colors" strokeWidth={2.5} />
            </button>
          )}

          {/* Middle: Input with waveform overlay */}
          <div className="relative flex-1 flex items-center">
            <input
              ref={ref}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isRecording}
              placeholder={placeholder}
              className={cn(
                'w-full bg-transparent border-none outline-none',
                'text-[14px] text-[#333333] placeholder:text-[#D4AF7F]/60',
                'transition-all duration-300',
                isRecording && 'opacity-40',
                disabled && 'cursor-not-allowed'
              )}
              {...props}
            />

            {/* Waveform visualization */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Waveform audioLevel={audioLevel} />
              </div>
            )}
          </div>

          {/* Confirm button (appears during recording) */}
          <button
            type="button"
            onClick={handleConfirmRecording}
            disabled={!isRecording || recordingState === 'processing'}
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
              'bg-[#D4AF7F] hover:bg-[#c9a06d]',
              'shadow-[0_0_8px_rgba(212,175,127,0.4)]',
              'transition-all duration-200',
              isRecording ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
            )}
            title="Confirm and send"
          >
            <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
          </button>

          {/* Right: Mic/Send button (rightmost position) */}
          <button
            type="button"
            onClick={
              isRecording
                ? handleConfirmRecording
                : value.trim() && onSend
                  ? onSend
                  : handleStartRecording
            }
            disabled={disabled || recordingState === 'processing'}
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
              'transition-all duration-200',
              !isRecording && !value.trim() && 'hover:bg-[#095D40]/5 border border-[#D4AF7F]/50',
              !isRecording && value.trim() && [
                'bg-[#095D40] border-[#095D40]',
                'hover:bg-[#074A32]',
                'shadow-sm hover:shadow-md',
              ],
              isRecording && [
                'bg-[#095D40] border-[#095D40]',
                'shadow-[0_0_8px_rgba(9,93,64,0.4),0_0_16px_rgba(9,93,64,0.2)]',
                'hover:shadow-[0_0_12px_rgba(9,93,64,0.5),0_0_20px_rgba(9,93,64,0.25)]',
              ],
              disabled && 'cursor-not-allowed'
            )}
            title={
              isRecording
                ? 'Stop recording'
                : value.trim()
                  ? 'Send message'
                  : 'Start voice input'
            }
          >
            {recordingState === 'processing' ? (
              <Loader2 className="h-4 w-4 text-[#095D40] animate-spin" strokeWidth={2.5} />
            ) : isRecording ? (
              <Mic className="h-4 w-4 text-white" strokeWidth={2.5} />
            ) : value.trim() ? (
              <Send className="h-4 w-4 text-white" strokeWidth={2.5} />
            ) : (
              <Mic className="h-4 w-4 text-[#095D40]" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="absolute top-full mt-2 left-0 right-0 text-center">
            <span className="text-[11px] text-red-500">{error}</span>
          </div>
        )}

        {/* Recording hint */}
        {isRecording && (
          <div className="absolute top-full mt-2 left-0 right-0 text-center">
            <span className="text-[11px] text-[#6B7280]">
              Press ESC to cancel · Click mic or check to finish
            </span>
          </div>
        )}
      </div>
    );
  }
);

VoiceInputBar.displayName = 'VoiceInputBar';

/**
 * Animated waveform visualization
 */
function Waveform({ audioLevel }: { audioLevel: number }) {
  const barCount = 32; // More bars for smoother animation
  const bars = Array.from({ length: barCount });

  return (
    <div className="flex items-center justify-center gap-1.5 h-full px-4">
      {bars.map((_, i) => {
        // Create multiple wave patterns for more dynamic movement
        const phase1 = (i / barCount) * Math.PI * 4;
        const phase2 = (i / barCount) * Math.PI * 2;
        const time = Date.now() / 300; // Faster animation

        // Combine multiple wave patterns for complex movement
        const wave1 = Math.sin(phase1 + time) * 0.5;
        const wave2 = Math.sin(phase2 - time * 0.7) * 0.3;
        const wave3 = Math.cos(phase1 * 0.5 + time * 1.2) * 0.2;

        // Base height with minimum movement
        const baseHeight = 0.4;
        const audioBoost = Math.max(0.3, audioLevel); // Minimum 30% audio level for visibility
        const waveHeight = baseHeight + (wave1 + wave2 + wave3) * audioBoost;
        const heightPercent = Math.max(25, Math.min(100, waveHeight * 100));

        return (
          <div
            key={i}
            className="w-1 bg-[#095D40] rounded-full shadow-sm"
            style={{
              height: `${heightPercent}%`,
              opacity: 0.7 + (audioBoost * 0.3),
              transform: `scaleY(${0.8 + audioBoost * 0.2})`,
              transition: 'all 100ms ease-out',
              animationDelay: `${i * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
