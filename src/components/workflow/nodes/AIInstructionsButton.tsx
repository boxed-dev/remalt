'use client';

import { Sparkles } from 'lucide-react';
import { useState, useCallback } from 'react';
import { AIInstructionsModal } from './AIInstructionsModal';

interface AIInstructionsButtonProps {
  value?: string;
  onChange: (value: string) => void;
  nodeId: string;
  nodeType: string;
  placeholder?: string;
  maxLength?: number;
}

export function AIInstructionsButton({
  value = '',
  onChange,
  nodeId,
  nodeType,
  placeholder,
  maxLength = 500,
}: AIInstructionsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stop event propagation to prevent ReactFlow interference
  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if ('nativeEvent' in e && typeof (e.nativeEvent as any).stopImmediatePropagation === 'function') {
      (e.nativeEvent as any).stopImmediatePropagation();
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    stopPropagation(e);
    setIsModalOpen(true);
  }, [stopPropagation]);

  const hasInstructions = value && value.trim().length > 0;

  return (
    <>
      {/* Compact button that triggers modal */}
      <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
        <button
          onClick={handleClick}
          onMouseDown={stopPropagation}
          className="flex items-center gap-2 text-[11px] font-medium text-[#6B7280] hover:text-[#F59E0B] transition-colors w-full group py-1"
          type="button"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#F59E0B] group-hover:scale-110 transition-transform" />
          <span className="flex-1 text-left">
            {hasInstructions ? 'AI Instructions' : 'Add AI Instructions'}
          </span>

          {/* Visual indicator */}
          {hasInstructions && (
            <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded-full text-[10px] font-semibold">
              SET
            </span>
          )}

          <span className="text-[10px] text-[#9CA3AF] group-hover:text-[#F59E0B] transition-colors">
            Click to edit
          </span>
        </button>
      </div>

      {/* Modal */}
      <AIInstructionsModal
        value={value}
        onChange={onChange}
        nodeId={nodeId}
        nodeType={nodeType}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </>
  );
}
