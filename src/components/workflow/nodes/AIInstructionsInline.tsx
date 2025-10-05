'use client';

import { Sparkles, Check, X } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { VoiceTextarea } from '../VoiceInput';

interface AIInstructionsInlineProps {
  value?: string;
  onChange: (value: string) => void;
  nodeId: string;
  nodeType: string;
  placeholder?: string;
  maxLength?: number;
}

export function AIInstructionsInline({
  value = '',
  onChange,
  nodeId,
  nodeType,
  placeholder = 'Guide the AI on how to process this content...',
  maxLength = 500,
}: AIInstructionsInlineProps) {
  const [isActive, setIsActive] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Auto-focus when activated
  useEffect(() => {
    if (isActive && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isActive]);

  // Debounced save
  const debouncedSave = useDebouncedCallback((newValue: string) => {
    try {
      onChange(newValue);
      setIsSaving(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      console.error(`[AIInstructions] Save failed for ${nodeType}:${nodeId}:`, error);
      setIsSaving(false);
    }
  }, 800);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const sanitized = newValue.slice(0, maxLength);

    setLocalValue(sanitized);
    setIsSaving(true);
    setShowSaved(false);
    debouncedSave(sanitized);
  }, [maxLength, debouncedSave]);

  const handleActivate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if ('nativeEvent' in e && typeof (e.nativeEvent as any).stopImmediatePropagation === 'function') {
      (e.nativeEvent as any).stopImmediatePropagation();
    }
    setIsActive(true);
  }, []);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if ('nativeEvent' in e && typeof (e.nativeEvent as any).stopImmediatePropagation === 'function') {
      (e.nativeEvent as any).stopImmediatePropagation();
    }
    setIsActive(false);
  }, []);

  const stopPropagation = useCallback((e: React.MouseEvent | React.WheelEvent | React.TouchEvent) => {
    e.stopPropagation();
    if ('nativeEvent' in e && typeof (e.nativeEvent as any).stopImmediatePropagation === 'function') {
      (e.nativeEvent as any).stopImmediatePropagation();
    }
  }, []);

  const charCount = localValue.length;
  const isNearLimit = charCount > maxLength * 0.9;

  // Not active and no value - show subtle trigger on hover
  if (!isActive && !value?.trim()) {
    return (
      <div
        ref={containerRef}
        onClick={handleActivate}
        onMouseDown={stopPropagation}
        className="mt-2 group cursor-pointer"
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1.5 text-[11px] border border-dashed border-[#E8ECEF] group-hover:border-[#F59E0B]/30 rounded bg-transparent group-hover:bg-[#FAFBFC] flex items-center gap-1.5 text-[#D1D5DB] group-hover:text-[#F59E0B]">
          <Sparkles className="h-3 w-3" />
          <span>Click or use voice to add AI instructions...</span>
        </div>
      </div>
    );
  }

  // Not active but has value - show compact indicator
  if (!isActive) {
    return (
      <div className="mt-2">
        <button
          onClick={handleActivate}
          onMouseDown={stopPropagation}
          className="w-full px-2.5 py-1.5 text-[11px] border border-[#F59E0B]/20 bg-[#FEF3C7] rounded flex items-center gap-1.5 text-[#92400E] hover:border-[#F59E0B]/40 hover:bg-[#FDE68A] transition-all group"
          type="button"
        >
          <Sparkles className="h-3 w-3 text-[#F59E0B]" />
          <span className="flex-1 text-left truncate">{value}</span>
          <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Click to edit
          </span>
        </button>
      </div>
    );
  }

  // Active state - show full input
  return (
    <div
      className="mt-2"
      onMouseDown={stopPropagation}
      onWheel={stopPropagation}
      onTouchStart={stopPropagation}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-[#F59E0B]" />
          <span className="text-[10px] font-medium text-[#6B7280]">AI Instructions</span>
        </div>
        <div className="flex items-center gap-2">
          {showSaved && (
            <span className="flex items-center gap-1 text-[#10B981]">
              <Check className="h-2.5 w-2.5" />
              <span className="text-[9px] font-medium">Saved</span>
            </span>
          )}
          {isSaving && (
            <span className="text-[9px] text-[#9CA3AF]">Saving...</span>
          )}
          <button
            onClick={handleClose}
            className="p-0.5 hover:bg-[#F3F4F6] rounded transition-colors"
            type="button"
          >
            <X className="h-3 w-3 text-[#6B7280]" />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <VoiceTextarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        showVoice
        voiceMode="append"
        className="px-2.5 py-2 text-[11px] leading-[1.4] border border-[#E8ECEF] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] resize-none transition-all placeholder:text-[#9CA3AF]"
        rows={3}
        onMouseDown={stopPropagation}
        onWheel={stopPropagation}
        onTouchStart={stopPropagation}
      />

      {/* Footer */}
      <div className="flex items-center justify-end mt-1">
        <span
          className={`font-mono text-[9px] transition-colors ${
            isNearLimit ? 'text-[#F59E0B] font-semibold' : 'text-[#9CA3AF]'
          }`}
        >
          {charCount}/{maxLength}
        </span>
      </div>
    </div>
  );
}
