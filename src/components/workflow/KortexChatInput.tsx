'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Globe, Mic, ChevronDown, ArrowUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpenAI, Gemini, Anthropic, DeepSeek, XAI } from '@lobehub/icons';
import {
  getProviderInfo,
  getProviderForModel,
  getModelDisplayName,
  type ModelInfo,
} from '@/lib/models/model-registry';

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
  onVoiceRecord?: () => void;
  disabled?: boolean;
  placeholder?: string;
  currentModel: string;
  onModelChange: (modelId: string) => void;
  availableModels: ModelInfo[];
  theme?: 'light' | 'dark';
}

export const KortexChatInput: React.FC<KortexChatInputProps> = ({
  value,
  onChange,
  onSend,
  onVoiceRecord,
  disabled = false,
  placeholder = 'Ask AI anything, @ to mention',
  currentModel,
  onModelChange,
  availableModels,
  theme = 'light',
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '0px';
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
          {/* Add context button row */}
          <div className="w-full p-2 border-b border-gray-100">
            <button
              className={cn(
                'group select-none w-auto flex items-center gap-1.5 px-2 py-1 rounded-xl border cursor-pointer transition-colors',
                isDark
                  ? 'hover:bg-[#222] border-gray-800 text-gray-500 hover:text-gray-400'
                  : 'hover:bg-gray-50 border-transparent text-gray-500 hover:text-gray-700'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Plus className="w-3 h-3" />
              <span className="text-xs">Add context</span>
            </button>
          </div>

          {/* Textarea */}
          <div className="p-2 w-full">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled}
              placeholder={placeholder}
              className={cn(
                'bg-transparent w-full resize-none overflow-hidden px-2 py-1',
                'text-sm font-inter font-normal focus:outline-none',
                isDark
                  ? 'text-gray-300 placeholder:text-gray-600'
                  : 'text-gray-900 placeholder:text-gray-400'
              )}
              rows={1}
              style={{ minHeight: '24px', maxHeight: '200px' }}
            />
          </div>

          {/* Bottom bar */}
          <div className="w-full flex flex-row items-center justify-between px-2 pb-2">
            {/* Left side - model selector and web button */}
            <div className="flex flex-row items-center gap-1.5">
              {/* Model selector dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
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

              {/* Web button */}
              <button
                className={cn(
                  'rounded-xl h-[26px] w-[26px] flex items-center justify-center border transition-colors',
                  isDark
                    ? 'bg-[#1a1a1a] border-gray-800 text-gray-500 hover:bg-[#222]'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-4 w-4" />
              </button>
            </div>

            {/* Right side - Voice and Send buttons */}
            <div className="flex flex-row items-center gap-1">
              <button
                onClick={onVoiceRecord}
                className={cn(
                  'h-[26px] w-[26px] flex items-center justify-center rounded-lg transition-colors',
                  isDark
                    ? 'text-gray-600 hover:text-gray-400 hover:bg-[#222]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
                disabled={disabled}
              >
                <Mic className="w-4 h-4" strokeWidth={1.5} />
              </button>

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
