'use client';

import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { WorkflowToolbar } from './WorkflowToolbar';

export function WorkflowControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const setControlMode = useWorkflowStore((state) => state.setControlMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is in an editable element
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      // Control mode shortcuts
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setControlMode('pointer');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setControlMode('hand');
      }
      // Zoom shortcuts
      else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn({ duration: 200 });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut({ duration: 200 });
      } else if (e.key === '1') {
        e.preventDefault();
        fitView({ duration: 200, padding: 0.2 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, fitView, setControlMode]);

  return <WorkflowToolbar />;
}
