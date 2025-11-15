'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Mic, ChevronDown, ArrowUp, Sparkles, Youtube, Instagram, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { OpenAI, Gemini, Anthropic, DeepSeek, XAI } from '@lobehub/icons';
import {
  getProviderInfo,
  getProviderForModel,
  getModelDisplayName,
  type ModelInfo,
} from '@/lib/models/model-registry';
import { useSimpleVoiceRecording } from '@/hooks/use-simple-voice-recording';
import { VoiceWaveVisualizer } from './VoiceWaveVisualizer';
import { stopCanvasPointerEvent, stopCanvasWheelEvent } from '@/lib/workflow/interaction-guards';
import { getTextInputProps } from '@/lib/workflow/text-input-helpers';

const detectYouTubeUrl = (text: string) => {
  const match = text.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const detectInstagramUrl = (text: string) => {
  const match = text.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  OpenAI: OpenAI,
  Google: Gemini,
  Anthropic: Anthropic,
  DeepSeek: DeepSeek,
  XAi: XAI,
};

interface KortexChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  currentModel: string;
  onModelChange: (modelId: string) => void;
  availableModels: ModelInfo[];
  theme?: 'light' | 'dark';
  webSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
}

export const KortexChatInput: React.FC<KortexChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Ask AI anything, @ to mention',
  currentModel,
  onModelChange,
  availableModels,
  theme = 'light',
  webSearchEnabled = false,
  onWebSearchChange,
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Voice recording
  const {
    isRecording,
    mediaStream,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recordingError,
  } = useSimpleVoiceRecording();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const providerId = getProviderForModel(currentModel);
  const provider = getProviderInfo(providerId);
  const ProviderIcon = provider ? PROVIDER_ICONS[provider.iconName] : null;
  const modelDisplayName = getModelDisplayName(currentModel);

  const isDark = theme === 'dark';
  const characterCount = value.length;
  const characterLabel = characterCount === 1 ? 'character' : 'characters';

  const youtubeId = detectYouTubeUrl(value);
  const instagramId = detectInstagramUrl(value);
  const hasDetectedLinks = youtubeId || instagramId;

  const textareaProps = getTextInputProps();

  // Handle voice recording start
  const handleStartVoiceRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Handle voice recording finalize (tick button)
  const handleFinalizeRecording = async () => {
    try {
      setIsTranscribing(true);
      const { audioBlob } = await stopRecording();

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      // Call transcription API
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: base64Audio }),
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();
      const transcript = result.transcript || '';

      // Append transcript to input
      const newValue = value ? `${value} ${transcript}`.trim() : transcript.trim();
      onChange(newValue);

    } catch (error) {
      console.error('Failed to transcribe:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle voice recording cancel (cross button)
  const handleCancelRecording = () => {
    cancelRecording();
  };

  return (
    <div className="w-full px-3 pb-6">
      <div className="w-full md:max-w-[800px] mx-auto">
        {/* Floating Card Container */}
        <div
          className={cn(
            'w-full rounded-2xl shadow-lg border transition-all duration-200',
            isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200',
            isFocused && 'ring-2 ring-blue-500/20'
          )}
        >
          {/* Textarea */}
          <div className="p-2 w-full relative">
            {/* Show wave visualizer when recording */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/98 backdrop-blur-sm rounded-xl z-10 overflow-hidden">
                <VoiceWaveVisualizer mediaStream={mediaStream} isRecording={isRecording} />
              </div>
            )}

            {/* Show transcribing state */}
            {isTranscribing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-xl z-10">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-[#0C7A53] border-t-transparent rounded-full animate-spin"></div>
                  <span>Transcribing...</span>
                </div>
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled || isRecording || isTranscribing}
              placeholder={placeholder}
              className={cn(
                'min-h-[40px] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 px-3 py-2',
                'text-sm font-normal',
                isDark ? 'bg-transparent text-gray-300 placeholder:text-gray-600' : 'bg-transparent text-gray-900 placeholder:text-gray-400'
              )}
              rows={1}
              style={{ resize: 'none' }}
              {...textareaProps}
            />

            {/* Detected Links Indicator */}
            {hasDetectedLinks && (
              <div className="flex flex-wrap gap-1.5 px-2 pb-1">
                {youtubeId && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700">
                    <Youtube className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">YouTube detected</span>
                  </div>
                )}
                {instagramId && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-pink-50 border border-pink-200 text-pink-700">
                    <Instagram className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Instagram detected</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="w-full flex flex-row items-center justify-between px-2 pb-2">
            {/* Left side - model selector and web button */}
            <div className="flex flex-row items-center gap-1.5">
              {/* Model selector dropdown */}
              <div className="relative" ref={dropdownRef} data-flowy-interactive="true">
                <button
                  onClick={(event) => {
                    stopCanvasPointerEvent(event);
                    setIsModelDropdownOpen(!isModelDropdownOpen);
                  }}
                  onMouseDown={stopCanvasPointerEvent}
                  onPointerDown={stopCanvasPointerEvent}
                  className={cn(
                    'flex select-none h-[26px] items-center shadow-sm gap-1.5 px-3 py-1.5 rounded-xl border focus:outline-none transition-colors',
                    isDark
                      ? 'bg-[#1a1a1a] border-gray-800 text-gray-300 hover:bg-[#222]'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {ProviderIcon && (
                    <ProviderIcon
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: provider?.colors.primary }}
                    />
                  )}
                  <span className="text-xs truncate max-w-[180px]">{modelDisplayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                {/* Dropdown menu */}
                {isModelDropdownOpen && (
                  <div
                    className={cn(
                      'absolute bottom-full mb-2 left-0 w-64 rounded-xl shadow-xl border p-1.5 z-50 max-h-[320px] overflow-y-auto',
                      isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'
                    )}
                    data-flowy-interactive="true"
                    onMouseDown={stopCanvasPointerEvent}
                    onPointerDown={stopCanvasPointerEvent}
                    onClick={stopCanvasPointerEvent}
                    onWheel={stopCanvasWheelEvent}
                    onWheelCapture={stopCanvasWheelEvent}
                  >
                    {availableModels.map(model => {
                      const modelProviderId = getProviderForModel(model.id);
                      const modelProvider = getProviderInfo(modelProviderId);
                      const ModelProviderIcon = modelProvider ? PROVIDER_ICONS[modelProvider.iconName] : null;
                      const isSelected = model.id === currentModel;

                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            onModelChange(model.id);
                            setIsModelDropdownOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors',
                            isSelected
                              ? isDark
                                ? 'bg-blue-600/20 text-blue-300'
                                : 'bg-blue-50 text-blue-700'
                              : isDark
                              ? 'text-gray-300 hover:bg-[#222]'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          {ModelProviderIcon && (
                            <ModelProviderIcon
                              className="h-4 w-4 flex-shrink-0"
                              style={{ color: modelProvider?.colors.primary }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{model.displayName}</div>
                            <div className="text-xs text-gray-500 truncate">{model.description}</div>
                          </div>
                          {model.recommended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium flex-shrink-0">
                              ★
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Web search toggle button */}
              <button
                className={cn(
                  'rounded-xl h-[26px] w-[26px] flex items-center justify-center border transition-all',
                  webSearchEnabled
                    ? 'bg-[#0C7A53]/10 border-[#0C7A53] text-[#0C7A53]'
                    : isDark
                    ? 'bg-[#1a1a1a] border-gray-800 text-gray-500 hover:bg-[#222]'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onWebSearchChange?.(!webSearchEnabled);
                }}
                title={webSearchEnabled ? 'Web search enabled' : 'Enable web search'}
              >
                <Globe className="h-4 w-4" />
              </button>
            </div>

            {/* Right side - Voice and Send buttons */}
            <div className="flex flex-row items-center gap-1">
              {/* Voice recording controls */}
              {isRecording ? (
                <>
                  {/* Cancel button (X) */}
                  <button
                    onClick={handleCancelRecording}
                    className="h-[26px] w-[26px] flex items-center justify-center rounded-lg transition-colors bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                    title="Cancel recording"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>

                  {/* Finalize button (Check) */}
                  <button
                    onClick={handleFinalizeRecording}
                    className="h-[26px] w-[26px] flex items-center justify-center rounded-lg transition-colors bg-green-50 border border-green-200 text-green-600 hover:bg-green-100"
                    title="Finalize recording"
                  >
                    <Check className="w-4 h-4" strokeWidth={2} />
                  </button>
                </>
              ) : (
                /* Mic button - start recording */
                <button
                  onClick={handleStartVoiceRecording}
                  disabled={disabled || isTranscribing}
                  className={cn(
                    'h-[26px] w-[26px] flex items-center justify-center rounded-lg transition-colors',
                    disabled || isTranscribing
                      ? 'text-gray-400 cursor-not-allowed'
                      : isDark
                      ? 'text-gray-600 hover:text-gray-400 hover:bg-[#222]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Mic className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}

              {/* Send button - Kortex style with Remalt brand colors */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!disabled && value.trim()) {
                    onSend();
                  }
                }}
                disabled={disabled || !value.trim()}
                className={cn(
                  'inline-flex items-center justify-center h-[26px] px-4 rounded-full border transition-all font-medium text-xs',
                  disabled || !value.trim()
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#0C7A53] to-[#19B17A] text-white border-transparent hover:from-[#0C7A53]/90 hover:to-[#19B17A]/90 shadow-sm'
                )}
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Helper text */}
        <div className={cn(
          'text-[11px] flex items-center justify-between select-none pt-1.5 px-1',
          isDark ? 'text-gray-500' : 'text-gray-500'
        )}>
          <span>
            {characterCount} {characterLabel}
          </span>
          <span>
            <span className="font-semibold">Shift + Enter</span> to add a new line
          </span>
        </div>
      </div>
    </div>
  );
};
