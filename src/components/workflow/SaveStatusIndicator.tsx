'use client';

import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SaveStatusIndicator() {
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const saveError = useWorkflowStore((state) => state.saveError);
  const lastSaved = useWorkflowStore((state) => state.lastSaved);

  const status = useMemo(() => {
    if (isSaving) return 'saving';
    if (saveError) return 'error';
    if (lastSaved) return 'saved';
    return 'idle';
  }, [isSaving, saveError, lastSaved]);

  const { Icon, text, textClassName, iconClassName, tooltip } = useMemo(() => {
    switch (status) {
      case 'saving':
        return {
          Icon: Loader2,
          text: 'Saving...',
          textClassName: 'text-gray-500',
          iconClassName: 'animate-spin',
          tooltip: 'Your workflow is currently being saved.',
        };
      case 'error':
        return {
          Icon: AlertCircle,
          text: 'Error',
          textClassName: 'text-red-500',
          iconClassName: '',
          tooltip: `Save failed: ${saveError}`,
        };
      case 'saved':
        return {
          Icon: CheckCircle,
          text: 'Saved',
          textClassName: 'text-gray-500',
          iconClassName: '',
          tooltip: `Last saved at ${new Date(lastSaved!).toLocaleTimeString()}`,
        };
      default:
        return {
          Icon: null,
          text: '',
          textClassName: '',
          iconClassName: '',
          tooltip: '',
        };
    }
  }, [status, saveError, lastSaved]);

  if (status === 'idle' || !Icon) {
    return null;
  }

  return (
    (<TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs">
            <Icon className={cn('h-3.5 w-3.5', textClassName, iconClassName)} />
            <span className={cn('font-medium', textClassName)}>{text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>)
  );
}
