'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SyntheticEvent } from 'react';
import { Info } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface FloatingAIInstructionsProps {
  value?: string;
  onChange: (value: string) => void;
  nodeId: string;
  nodeType: string;
  placeholder?: string;
  maxLength?: number;
}

export function FloatingAIInstructions({
  value = '',
  onChange,
  nodeId,
  nodeType,
  placeholder = 'Add notes for AI to use...',
  maxLength = 500,
}: FloatingAIInstructionsProps) {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(42, textareaRef.current.scrollHeight)}px`;
    }
  }, [localValue]);

  // Debounced save
  const debouncedSave = useDebouncedCallback((newValue: string) => {
    try {
      onChange(newValue);
    } catch (error) {
      console.error(`[FloatingAIInstructions] Save failed for ${nodeType}:${nodeId}:`, error);
    }
  }, 800);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const sanitized = newValue.slice(0, maxLength);
      setLocalValue(sanitized);
      debouncedSave(sanitized);
    },
    [maxLength, debouncedSave]
  );

  const stopPropagation = useCallback((event: SyntheticEvent) => {
    // Allow pinch/zoom gestures to pass through to React Flow
    if ('nativeEvent' in event && event.nativeEvent instanceof WheelEvent) {
      const wheelEvent = event.nativeEvent;
      const isPinchGesture = wheelEvent.ctrlKey || wheelEvent.metaKey || Math.abs(wheelEvent.deltaZ ?? 0) > 0;
      if (isPinchGesture) {
        return; // Let React Flow handle zoom
      }
    }

    event.stopPropagation();

    const nativeEvent = event.nativeEvent as Event & {
      stopImmediatePropagation?: () => void;
    };

    nativeEvent.stopImmediatePropagation?.();
  }, []);

  const stopPropagationAndPreventDefault = useCallback(
    (event: SyntheticEvent) => {
      stopPropagation(event);
      event.preventDefault();
    },
    [stopPropagation]
  );

  return (
    <div
      className="absolute w-full bg-white rounded-lg shadow-md flex nodrag nopan"
      style={{
        zIndex: 100,
        top: '100%',
        marginTop: '8px',
        padding: 0,
        overflow: 'hidden',
      }}
      onMouseDown={stopPropagation}
      onPointerDown={stopPropagation}
      onDragStart={stopPropagationAndPreventDefault}
    >
      <div className="w-full overflow-auto relative" style={{ maxHeight: '200px' }}>
        {/* Info icon */}
        <div className="absolute right-2 top-1 z-[999]">
          <button
            type="button"
            onMouseDown={stopPropagation}
            className="cursor-help"
            title="AI Instructions: Guide how the AI should process this content"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              />
            </svg>
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={1}
          onMouseDown={stopPropagation}
          onPointerDown={stopPropagation}
          onDragStart={stopPropagationAndPreventDefault}
          onWheel={stopPropagationAndPreventDefault}
          onTouchStart={stopPropagationAndPreventDefault}
          onFocus={stopPropagation}
          className="
            w-full px-4 bg-white rounded-lg resize-none text-base
            focus:outline-none focus:ring-0 focus:border-transparent
            border-none shadow-none py-2.5 leading-normal font-sans
            h-auto min-h-[42px] overflow-y-hidden
            opacity-100 nodrag nopan
          "
          style={{ height: '44px' }}
        />
      </div>
    </div>
  );
}
