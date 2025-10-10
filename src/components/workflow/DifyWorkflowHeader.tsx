'use client';

import { ChevronLeft, MoreHorizontal, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { useState, useRef, useEffect } from 'react';

export function DifyWorkflowHeader() {
  const router = useRouter();
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateWorkflowMetadata = useWorkflowStore((state) => state.updateWorkflowMetadata);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const workflowName = workflow?.name || 'New workflow';

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleStartEdit = () => {
    setEditedName(workflowName);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== workflowName) {
      updateWorkflowMetadata({ name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 flex-shrink-0">
      {/* Left section - Back button and title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/flows')}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          title="Back to flows"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveName}
                className="text-[15px] font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              />
            </div>
          ) : (
            <>
              <h1 className="text-[15px] font-semibold text-gray-900">{workflowName}</h1>
              <button
                onClick={handleStartEdit}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                title="Edit workflow name"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right section - Action buttons */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 text-[13px] font-medium">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
