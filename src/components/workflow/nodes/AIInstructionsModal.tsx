'use client';

import { Sparkles, X, Info, Check } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface AIInstructionsModalProps {
  value?: string;
  onChange: (value: string) => void;
  nodeId: string;
  nodeType: string;
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
  maxLength?: number;
}

export function AIInstructionsModal({
  value = '',
  onChange,
  nodeId,
  nodeType,
  isOpen,
  onClose,
  placeholder = 'Guide the AI on how to process this content...',
  maxLength = 500,
}: AIInstructionsModalProps) {
  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync with prop changes (external updates)
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  // Stop event propagation to prevent ReactFlow interference
  const stopPropagation = useCallback((e: React.MouseEvent | React.WheelEvent | React.TouchEvent) => {
    e.stopPropagation();
    if ('nativeEvent' in e && typeof (e.nativeEvent as any).stopImmediatePropagation === 'function') {
      (e.nativeEvent as any).stopImmediatePropagation();
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const charCount = localValue.length;
  const isNearLimit = charCount > maxLength * 0.9;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[100]"
        onClick={onClose}
        onMouseDown={stopPropagation}
        onWheel={stopPropagation}
        onTouchStart={stopPropagation}
      />

      {/* Floating modal bubble */}
      <div
        ref={modalRef}
        className="fixed z-[101] animate-fade-in"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '90vw',
          width: '500px',
        }}
        onMouseDown={stopPropagation}
        onWheel={stopPropagation}
        onTouchStart={stopPropagation}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-[#E8ECEF] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] bg-gradient-to-r from-[#FEFCE8] to-[#FEF3C7]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Sparkles className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#1A1D21]">AI Processing Instructions</h3>
                <p className="text-[11px] text-[#6B7280]">Guide how AI should handle this {nodeType} node</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              type="button"
            >
              <X className="h-4 w-4 text-[#6B7280] hover:text-[#1A1D21]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-3">
            {/* Status indicator */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Info className="h-3.5 w-3.5" />
                <span>These instructions will be passed to the AI when processing this node</span>
              </div>
              {showSaved && (
                <span className="flex items-center gap-1 text-[#10B981] animate-fade-in">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-medium">Saved</span>
                </span>
              )}
              {isSaving && (
                <span className="text-[#9CA3AF]">Saving...</span>
              )}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={handleChange}
              placeholder={placeholder}
              maxLength={maxLength}
              className="w-full px-4 py-3 text-[13px] leading-[1.6] border border-[#E8ECEF] rounded-xl bg-[#FAFBFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] resize-none transition-all placeholder:text-[#9CA3AF]"
              rows={6}
              onMouseDown={stopPropagation}
              onWheel={stopPropagation}
              onTouchStart={stopPropagation}
            />

            {/* Footer: Examples + Character counter */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-wide">Examples:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Summarize key points',
                    'Extract statistics only',
                    'Focus on methodology',
                    'Ignore intro/outro',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setLocalValue(example);
                        setIsSaving(true);
                        setShowSaved(false);
                        debouncedSave(example);
                      }}
                      className="px-2 py-1 text-[10px] bg-[#F3F4F6] hover:bg-[#E8ECEF] text-[#6B7280] rounded-md transition-colors"
                      type="button"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
              <span
                className={`font-mono text-[11px] flex-shrink-0 transition-colors ${
                  isNearLimit ? 'text-[#F59E0B] font-semibold' : 'text-[#9CA3AF]'
                }`}
              >
                {charCount}/{maxLength}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#F3F4F6] flex items-center justify-between">
            <button
              onClick={() => {
                setLocalValue('');
                setIsSaving(true);
                setShowSaved(false);
                debouncedSave('');
              }}
              className="text-[11px] text-[#EF4444] hover:text-[#DC2626] font-medium transition-colors"
              type="button"
            >
              Clear Instructions
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] bg-[#155EEF] hover:bg-[#1249CC] text-white rounded-lg font-medium transition-colors shadow-sm"
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
