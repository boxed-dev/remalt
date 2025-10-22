'use client';

import { Copy, Check, Edit2, RotateCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/workflow';

interface MessageActionsProps {
  message: ChatMessage;
  onCopy?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  className?: string;
}

/**
 * ChatGPT-style message action buttons
 * Appears on hover, provides Copy, Edit, Regenerate, Delete actions
 */
export function MessageActions({
  message,
  onCopy,
  onEdit,
  onRegenerate,
  onDelete,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else {
      // Default copy behavior
      await navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUserMessage = message.role === 'user';

  return (
    <div className={cn(
      'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
      className
    )}>
      {/* Copy - always available */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md hover:bg-[#F5F5F7] transition-colors"
        title="Copy message"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[#10B981]" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-[#6B7280] hover:text-[#1A1D21]" />
        )}
      </button>

      {/* Edit - only for user messages */}
      {isUserMessage && onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-[#F5F5F7] transition-colors"
          title="Edit message"
        >
          <Edit2 className="h-3.5 w-3.5 text-[#6B7280] hover:text-[#1A1D21]" />
        </button>
      )}

      {/* Regenerate - only for AI messages */}
      {!isUserMessage && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-md hover:bg-[#F5F5F7] transition-colors"
          title="Regenerate response"
        >
          <RotateCw className="h-3.5 w-3.5 text-[#6B7280] hover:text-[#1A1D21]" />
        </button>
      )}

      {/* Delete - always available */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-[#FEE2E2] transition-colors"
          title="Delete message"
        >
          <Trash2 className="h-3.5 w-3.5 text-[#6B7280] hover:text-[#EF4444]" />
        </button>
      )}
    </div>
  );
}
