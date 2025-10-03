'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play,
  Undo2,
  Redo2,
  Settings,
  Save,
  Check,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useWorkflowStore } from '@/lib/stores/workflow-store';

export function WorkflowToolbar() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateWorkflowMetadata = useWorkflowStore((state) => state.updateWorkflowMetadata);
  const isSaving = useWorkflowStore((state) => state.isSaving);
  const saveError = useWorkflowStore((state) => state.saveError);
  const lastSaved = useWorkflowStore((state) => state.lastSaved);

  const [isEditingName, setIsEditingName] = useState(false);
  const [workflowName, setWorkflowName] = useState(workflow?.name || 'Untitled Workflow');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
    }
  }, [workflow]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSave = () => {
    if (workflowName.trim() && workflow) {
      updateWorkflowMetadata({ name: workflowName.trim() });
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setWorkflowName(workflow?.name || 'Untitled Workflow');
      setIsEditingName(false);
    }
  };

  const handleRun = () => {
    // TODO: Implement workflow execution
    console.log('Run workflow');
  };

  return (
    <div
      className="h-14 border-b border-[#E8ECEF] px-4 flex items-center justify-between bg-white"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif',
      }}
    >
      {/* Left: Back button + Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link
          href="/flows"
          className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-all duration-150 flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-[#6B7280]" />
        </Link>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditingName ? (
            <input
              ref={inputRef}
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="px-3 py-1.5 text-[15px] font-medium text-[#1A1D21] border border-[#E8ECEF] rounded-lg focus:outline-none focus:ring-[1.5px] focus:ring-[#007AFF] bg-white min-w-[200px] max-w-[400px]"
            />
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              className="text-[15px] font-semibold text-[#1A1D21] cursor-pointer hover:text-[#007AFF] transition-colors duration-150 truncate px-3 py-1.5 rounded-lg hover:bg-[#F5F5F7]"
            >
              {workflowName}
            </h1>
          )}

          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F5F5F7] flex-shrink-0">
            {isSaving && (
              <>
                <Save className="h-3 w-3 text-[#007AFF] animate-pulse" />
                <span className="text-[11px] font-medium text-[#6B7280]">Saving...</span>
              </>
            )}
            {!isSaving && saveError && (
              <>
                <div className="h-2 w-2 rounded-full bg-[#FF3B30]" />
                <span className="text-[11px] font-medium text-[#FF3B30]">Error</span>
              </>
            )}
            {!isSaving && !saveError && lastSaved && (
              <>
                <Check className="h-3 w-3 text-[#34C759]" />
                <span className="text-[11px] font-medium text-[#6B7280]">Saved</span>
              </>
            )}
            {!isSaving && !saveError && !lastSaved && (
              <>
                <div className="h-2 w-2 rounded-full bg-[#9CA3AF]" />
                <span className="text-[11px] font-medium text-[#6B7280]">Not saved</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center: Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          title="Undo (Cmd+Z)"
          disabled
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          title="Redo (Cmd+Shift+Z)"
          disabled
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Run + Settings */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleRun}
          className="bg-[#007AFF] hover:bg-[#0051D5] text-white rounded-lg px-4 h-9 font-medium text-[14px] transition-all duration-150"
          style={{
            boxShadow: '0 1px 3px rgba(0, 122, 255, 0.3)',
          }}
        >
          <Play className="h-4 w-4 mr-1.5 fill-white" />
          Run
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-[#F5F5F7] text-[#6B7280] hover:text-[#1A1D21]"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
