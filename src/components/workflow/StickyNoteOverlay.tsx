'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

interface StickyNote {
  id: string;
  text: string;
  position: { x: number; y: number };
  color?: string;
}

interface StickyNoteOverlayProps {
  enabled?: boolean;
  notes?: StickyNote[];
}

export function StickyNoteOverlay({ enabled = false, notes = [] }: StickyNoteOverlayProps) {
  const [hiddenNotes, setHiddenNotes] = useState<Set<string>>(new Set());

  // Don't render anything if not enabled or no notes
  if (!enabled || notes.length === 0) {
    return null;
  }

  const hideNote = (id: string) => {
    setHiddenNotes(prev => new Set([...prev, id]));
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {notes.map((note) => {
        if (hiddenNotes.has(note.id)) return null;

        return (
          <div
            key={note.id}
            className="pointer-events-auto absolute"
            style={{
              left: `${note.position.x}px`,
              top: `${note.position.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="relative px-3 py-2 rounded-lg shadow-sm text-[11px] leading-relaxed min-w-[140px] max-w-[180px]"
              style={{
                backgroundColor: note.color || '#FEF3C7',
                border: '1px solid rgba(0, 0, 0, 0.05)',
              }}
            >
              <button
                onClick={() => hideNote(note.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="h-2.5 w-2.5 text-gray-500" />
              </button>
              <div
                className="text-gray-700 whitespace-pre-line text-center font-medium"
                style={{ fontSize: '11px', lineHeight: '1.4' }}
              >
                {note.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
