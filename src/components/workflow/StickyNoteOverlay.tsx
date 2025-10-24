'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStickyNotesStore } from '@/lib/stores/sticky-notes-store';

interface StickyNoteOverlayProps {
  workflowId: string;
  onNoteMove?: (noteId: string, position: { x: number; y: number }) => void;
}

// Export function to check if a sticky note is selected (for WorkflowCanvas)
export let isStickyNoteSelected = false;

export function StickyNoteOverlay({ workflowId, onNoteMove }: StickyNoteOverlayProps) {
  // Use the store directly
  const allNotes = useStickyNotesStore((state) => state.notes);
  const notes = allNotes[workflowId] || [];
  const deleteNote = useStickyNotesStore((state) => state.deleteNote);
  const updateNote = useStickyNotesStore((state) => state.updateNote);
  const editingNoteId = useStickyNotesStore((state) => state.editingNoteId);
  const setEditingNote = useStickyNotesStore((state) => state.setEditingNote);
  const moveNote = useStickyNotesStore((state) => state.moveNote);
  const isStickyActive = useStickyNotesStore((state) => state.isActive);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });

  // Refs for note elements
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Update global flag when selection changes
  useEffect(() => {
    isStickyNoteSelected = selectedNoteId !== null;
  }, [selectedNoteId]);

  // Handle keyboard shortcuts for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle delete if we have a selected note and we're not editing
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId && editingNoteId !== selectedNoteId) {
        // Check if the target is not an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent React Flow from also handling this

        deleteNote(workflowId, selectedNoteId);
        setSelectedNoteId(null);
        return false; // Extra prevention
      }

      if (e.key === 'Escape') {
        setSelectedNoteId(null);
        setEditingNote(null);
      }
    };

    // Use capture phase to handle before React Flow
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedNoteId, editingNoteId, workflowId, deleteNote, setEditingNote]);

  // Handle click outside to deselect - use capture phase
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is within any sticky note
      const clickedOnNote = Object.keys(noteRefs.current).some(noteId => {
        const noteEl = noteRefs.current[noteId];
        return noteEl && noteEl.contains(target);
      });

      // Check if click is on the overlay itself
      const clickedOnOverlay = overlayRef.current && overlayRef.current === target;

      if (!clickedOnNote && !clickedOnOverlay) {
        setSelectedNoteId(null);
        setEditingNote(null);
      }
    };

    // Use capture phase to run before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [setEditingNote]);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, noteId: string, notePosition: { x: number; y: number }) => {
    // Don't start drag if clicking on resize handle
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }

    e.stopPropagation();
    setDraggingId(noteId);
    setDragOffset({
      x: e.clientX - notePosition.x,
      y: e.clientY - notePosition.y,
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingId) {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      };
      moveNote(draggingId, newPosition);
      if (onNoteMove) {
        onNoteMove(draggingId, newPosition);
      }
    }

    if (resizingId && noteRefs.current[resizingId]) {
      const deltaX = e.clientX - initialMousePos.x;
      const deltaY = e.clientY - initialMousePos.y;

      const newWidth = Math.max(150, initialSize.width + deltaX);
      const newHeight = Math.max(100, initialSize.height + deltaY);

      const noteEl = noteRefs.current[resizingId];
      if (noteEl) {
        noteEl.style.width = `${newWidth}px`;
        noteEl.style.height = `${newHeight}px`;

        // Save size to note data
        updateNote(resizingId, {
          size: { width: newWidth, height: newHeight }
        });
      }
    }
  }, [draggingId, dragOffset, moveNote, onNoteMove, resizingId, initialMousePos, initialSize, updateNote]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
    setResizingId(null);
  }, []);

  useEffect(() => {
    if (draggingId || resizingId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, resizingId, handleMouseMove, handleMouseUp]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const noteEl = noteRefs.current[noteId];
    if (noteEl) {
      const rect = noteEl.getBoundingClientRect();
      setResizingId(noteId);
      setInitialSize({ width: rect.width, height: rect.height });
      setInitialMousePos({ x: e.clientX, y: e.clientY });
      setSelectedNoteId(noteId);
    }
  }, []);

  // Handle note click for selection and editing
  const handleNoteClick = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();

    // If already selected and not editing, start editing
    if (selectedNoteId === noteId && editingNoteId !== noteId) {
      setEditingNote(noteId);
    } else {
      // Otherwise just select
      setSelectedNoteId(noteId);
    }
  }, [selectedNoteId, editingNoteId, setEditingNote]);

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-[50]">
      {/* Visual indicator for sticky mode */}
      {isStickyActive && notes.length === 0 && (
        <div className="pointer-events-none absolute top-20 left-1/2 transform -translate-x-1/2 bg-[#095D40] text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          Sticky mode active - Click anywhere on canvas to add a note
        </div>
      )}

      {/* Render sticky notes */}
      {notes.map((note) => {
        const isSelected = selectedNoteId === note.id;
        const isEditing = editingNoteId === note.id;
        const isDragging = draggingId === note.id;
        const isResizing = resizingId === note.id;

        return (
          <div
            key={note.id}
            ref={(el) => { noteRefs.current[note.id] = el; }}
            className="pointer-events-auto absolute"
            style={{
              left: `${note.position.x}px`,
              top: `${note.position.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: isSelected ? 101 : 100,
              width: note.size?.width || 200,
              height: note.size?.height || 150,
            }}
            onMouseDown={(e) => {
              if (!isEditing && !isResizing) {
                handleMouseDown(e, note.id, note.position);
              }
            }}
            onClick={(e) => handleNoteClick(e, note.id)}
          >
            <div
              className={`
                relative w-full h-full rounded-lg transition-all duration-200
                ${isSelected ? 'ring-2 ring-[#095D40] shadow-xl' : 'shadow-md hover:shadow-lg'}
                ${isDragging || isResizing ? 'cursor-grabbing opacity-90' : 'cursor-grab'}
              `}
              style={{
                backgroundColor: note.color || '#FEF3C7',
                border: isSelected ? '2px solid #095D40' : '1px solid #e5e7eb',
              }}
            >
              {/* Note content */}
              {isEditing ? (
                <textarea
                  autoFocus
                  className="w-full h-full px-3 py-2 text-sm leading-relaxed resize-none outline-none bg-transparent text-gray-800 rounded-lg"
                  value={note.text}
                  onChange={(e) => updateNote(note.id, { text: e.target.value })}
                  onBlur={() => setEditingNote(null)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Escape') {
                      setEditingNote(null);
                    }
                    // Prevent delete key from propagating when editing
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      e.stopPropagation();
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Type your note..."
                />
              ) : (
                <div
                  className="w-full h-full px-3 py-2 text-sm leading-relaxed text-gray-800 cursor-text overflow-auto rounded-lg"
                >
                  {note.text || <span className="text-gray-400 italic">Click to add text...</span>}
                </div>
              )}

              {/* Resize handle - only visible when selected */}
              {isSelected && !isEditing && (
                <div
                  className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                  onMouseDown={(e) => handleResizeStart(e, note.id)}
                  style={{
                    background: 'linear-gradient(135deg, transparent 50%, #095D40 50%)',
                    borderBottomRightRadius: '0.5rem',
                  }}
                />
              )}

              {/* Selection indicator text */}
              {isSelected && !isEditing && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                  Press Delete to remove • Click to edit
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}