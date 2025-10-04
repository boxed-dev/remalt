'use client';

import { Sparkles, ChevronDown, ChevronUp, Info, Check } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface AIInstructionsInputProps {
  value?: string;
  onChange: (value: string) => void;
  nodeId: string;
  nodeType: string;
  placeholder?: string;
  maxLength?: number;
  autoExpand?: boolean;
}

export function AIInstructionsInput({
  value = '',
  onChange,
  nodeId,
  nodeType,
  placeholder = 'Guide the AI on how to process this content...',
  maxLength = 500,
  autoExpand = false,
}: AIInstructionsInputProps) {
  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(value);
  const [isExpanded, setIsExpanded] = useState(autoExpand || !!value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with prop changes (external updates)
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Debounced save to prevent excessive updates
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

    // Enforce max length (failsafe)
    const sanitized = newValue.slice(0, maxLength);

    setLocalValue(sanitized);
    setIsSaving(true);
    setShowSaved(false);
    debouncedSave(sanitized);
  }, [maxLength, debouncedSave]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
    // Auto-focus textarea when expanding
    if (!isExpanded && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Stop event propagation to prevent ReactFlow interference
  const stopPropagation = useCallback((e: React.MouseEvent | React.WheelEvent | React.TouchEvent) => {
    e.stopPropagation();
    if ('nativeEvent' in e && typeof (e.nativeEvent as any).stopImmediatePropagation === 'function') {
      (e.nativeEvent as any).stopImmediatePropagation();
    }
  }, []);

  const charCount = localValue.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <div
      className="mt-3 pt-3 border-t border-[#F3F4F6]"
      onMouseDown={stopPropagation}
      onWheel={stopPropagation}
      onTouchStart={stopPropagation}
    >
      {/* Collapsible Header */}
      <button
        onClick={toggleExpanded}
        className="flex items-center gap-2 text-[11px] font-medium text-[#6B7280] hover:text-[#155EEF] transition-colors w-full group"
        type="button"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#F59E0B] group-hover:text-[#155EEF] transition-colors" />
        <span className="flex-1 text-left">AI Instructions</span>

        {/* Visual indicators */}
        <div className="flex items-center gap-1.5">
          {showSaved && (
            <span className="flex items-center gap-1 text-[#10B981] animate-fade-in">
              <Check className="h-3 w-3" />
              <span className="text-[10px]">Saved</span>
            </span>
          )}
          {isSaving && (
            <span className="text-[10px] text-[#9CA3AF]">Saving...</span>
          )}
          {localValue.trim() && !isExpanded && (
            <span className="px-1.5 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded text-[10px] font-semibold">
              SET
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      </button>

      {/* Expandable Content with smooth animation */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-2">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full px-3 py-2.5 text-[12px] leading-[1.5] border border-[#E8ECEF] rounded-lg bg-[#FAFBFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] resize-none transition-all placeholder:text-[#9CA3AF]"
            rows={3}
            onMouseDown={stopPropagation}
            onWheel={stopPropagation}
            onTouchStart={stopPropagation}
            style={{ minHeight: '72px' }}
          />

          {/* Footer: Help text + Character counter */}
          <div className="flex items-start justify-between text-[10px] gap-2">
            <div className="flex items-start gap-1.5 text-[#6B7280] flex-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="leading-[1.4]">
                Examples: "Summarize key points", "Extract statistics", "Focus on methodology"
              </span>
            </div>
            <span
              className={`font-mono flex-shrink-0 transition-colors ${
                isNearLimit ? 'text-[#F59E0B] font-semibold' : 'text-[#9CA3AF]'
              }`}
            >
              {charCount}/{maxLength}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
