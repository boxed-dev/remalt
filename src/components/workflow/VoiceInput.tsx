'use client';

import { forwardRef } from 'react';
import { VoiceInputButton } from './VoiceInputButton';
import { cn } from '@/lib/utils';

interface VoiceInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  voiceMode?: 'append' | 'replace';
  showVoice?: boolean;
}

interface VoiceTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  voiceMode?: 'append' | 'replace';
  showVoice?: boolean;
}

/**
 * Input with integrated voice input button
 */
export const VoiceInput = forwardRef<HTMLInputElement, VoiceInputProps>(
  ({
    value,
    onChange,
    voiceMode = 'replace',
    showVoice = true,
    disabled,
    className,
    ...props
  }, ref) => {
    const handleVoiceTranscript = (transcript: string) => {
      // In replace mode, always use the transcript as-is
      // In append mode, add to existing value
      const newValue = voiceMode === 'append' && value
        ? `${value} ${transcript}`.trim()
        : transcript.trim();

      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);
    };

    return (
      <div className="relative w-full flex-1">
        <input
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-full',
            showVoice && 'pr-12',
            className,
          )}
          {...props}
        />
        {showVoice && (
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <div className="pointer-events-auto">
              <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                disabled={disabled}
                mode={voiceMode}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

VoiceInput.displayName = 'VoiceInput';

/**
 * Textarea with integrated voice input button
 */
export const VoiceTextarea = forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  ({
    value,
    onChange,
    voiceMode = 'append',
    showVoice = true,
    disabled,
    className,
    ...props
  }, ref) => {
    const handleVoiceTranscript = (transcript: string) => {
      const newValue = voiceMode === 'append' && value
        ? `${value}\n${transcript}`.trim()
        : transcript.trim();

      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);
    };

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-full',
            showVoice && 'pr-12',
            className,
          )}
          {...props}
        />
        {showVoice && (
          <div className="absolute top-2 right-2">
            <VoiceInputButton
              onTranscript={handleVoiceTranscript}
              disabled={disabled}
              mode={voiceMode}
              size="sm"
            />
          </div>
        )}
      </div>
    );
  }
);

VoiceTextarea.displayName = 'VoiceTextarea';
