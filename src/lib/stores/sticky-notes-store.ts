import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface StickyNote {
  id: string;
  workflowId: string;
  text: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  color?: string;
  createdAt: string; // Changed to string for localStorage
  updatedAt: string; // Changed to string for localStorage
}

interface StickyNotesState {
  // State
  notes: Record<string, StickyNote[]>; // Grouped by workflowId
  isActive: boolean; // Whether sticky note mode is active
  editingNoteId: string | null;

  // Actions
  toggleStickyMode: () => void;
  addNote: (workflowId: string, position: { x: number; y: number }) => string;
  updateNote: (noteId: string, updates: Partial<StickyNote>) => void;
  deleteNote: (workflowId: string, noteId: string) => void;
  setEditingNote: (noteId: string | null) => void;
  moveNote: (noteId: string, position: { x: number; y: number }) => void;
  getNotes: (workflowId: string) => StickyNote[];
  clearNotes: (workflowId: string) => void;
}

export const useStickyNotesStore = create<StickyNotesState>()(
  persist(
    (set, get) => ({
      // Initial state
      notes: {},
      isActive: false,
      editingNoteId: null,

      // Toggle sticky note mode
      toggleStickyMode: () => {
        set((state) => ({
          isActive: !state.isActive,
          editingNoteId: state.isActive ? null : state.editingNoteId
        }));
      },

      // Add a new sticky note
      addNote: (workflowId: string, position: { x: number; y: number }) => {
        const noteId = `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNote: StickyNote = {
          id: noteId,
          workflowId,
          text: '',
          position,
          size: { width: 200, height: 150 }, // Default size
          color: '#FEF3C7', // Light yellow default
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => {
          const updatedNotes = { ...state.notes };
          if (!updatedNotes[workflowId]) {
            updatedNotes[workflowId] = [];
          }
          updatedNotes[workflowId] = [...updatedNotes[workflowId], newNote];

          return {
            notes: updatedNotes,
            editingNoteId: null // Don't auto-focus, user will click to edit
          };
        });

        return noteId;
      },

      // Update a sticky note
      updateNote: (noteId: string, updates: Partial<StickyNote>) => {
        set((state) => {
          const updatedNotes = { ...state.notes };

          // Find the note across all workflows
          for (const workflowId in updatedNotes) {
            const noteIndex = updatedNotes[workflowId].findIndex(n => n.id === noteId);
            if (noteIndex !== -1) {
              updatedNotes[workflowId] = [...updatedNotes[workflowId]];
              updatedNotes[workflowId][noteIndex] = {
                ...updatedNotes[workflowId][noteIndex],
                ...updates,
                updatedAt: new Date().toISOString(),
              };
              break;
            }
          }

          return { notes: updatedNotes };
        });
      },

      // Delete a sticky note
      deleteNote: (workflowId: string, noteId: string) => {
        set((state) => {
          const updatedNotes = { ...state.notes };
          if (updatedNotes[workflowId]) {
            updatedNotes[workflowId] = updatedNotes[workflowId].filter(n => n.id !== noteId);
          }

          return {
            notes: updatedNotes,
            editingNoteId: state.editingNoteId === noteId ? null : state.editingNoteId
          };
        });
      },

      // Set which note is being edited
      setEditingNote: (noteId: string | null) => {
        set({ editingNoteId: noteId });
      },

      // Move a sticky note
      moveNote: (noteId: string, position: { x: number; y: number }) => {
        set((state) => {
          const updatedNotes = { ...state.notes };

          // Find the note across all workflows
          for (const workflowId in updatedNotes) {
            const noteIndex = updatedNotes[workflowId].findIndex(n => n.id === noteId);
            if (noteIndex !== -1) {
              updatedNotes[workflowId] = [...updatedNotes[workflowId]];
              updatedNotes[workflowId][noteIndex] = {
                ...updatedNotes[workflowId][noteIndex],
                position,
                updatedAt: new Date().toISOString()
              };
              break;
            }
          }

          return { notes: updatedNotes };
        });
      },

      // Get notes for a specific workflow
      getNotes: (workflowId: string) => {
        const state = get();
        return state.notes[workflowId] || [];
      },

      // Clear all notes for a workflow
      clearNotes: (workflowId: string) => {
        set((state) => {
          const updatedNotes = { ...state.notes };
          delete updatedNotes[workflowId];

          return {
            notes: updatedNotes,
            editingNoteId: null
          };
        });
      },
    }),
    {
      name: 'sticky-notes-storage', // Unique name for localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist notes, not UI state like isActive or editingNoteId
        notes: state.notes,
      }),
      version: 1, // Version for migration if needed in future
      migrate: (persistedState: any, version: number) => {
        // Handle migration if data structure changes in future
        if (version === 0) {
          // Migration from version 0 to 1 if needed
        }
        return persistedState;
      },
    }
  )
);