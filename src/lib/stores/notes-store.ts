import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

interface NotesState {
  // State
  isOpen: boolean;
  content: Record<string, string>; // workflowId -> content (JSON string of BlockNote blocks)
  isSaving: Record<string, boolean>; // workflowId -> saving status
  isLoading: Record<string, boolean>; // workflowId -> loading status

  // Actions
  setOpen: (open: boolean) => void;
  loadNotes: (workflowId: string, userId: string) => Promise<void>;
  saveNotes: (workflowId: string, userId: string, content: string) => Promise<void>;
  updateContent: (workflowId: string, content: string) => void;
  clearNotes: (workflowId: string) => void;
  deleteNotes: (workflowId: string, userId: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  isOpen: false,
  content: {},
  isSaving: {},
  isLoading: {},

  setOpen: (open: boolean) => {
    set({ isOpen: open });
  },

  loadNotes: async (workflowId: string, userId: string) => {
    // Don't try to load notes for "new" workflows (not yet saved)
    if (workflowId === 'new') {
      console.log('[NotesStore] Skipping load for new workflow');
      set((state) => ({
        content: { ...state.content, [workflowId]: '' },
        isLoading: { ...state.isLoading, [workflowId]: false },
      }));
      return;
    }

    // Set loading state
    set((state) => ({
      isLoading: { ...state.isLoading, [workflowId]: true },
    }));

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('workflow_notes')
        .select('content')
        .eq('workflow_id', workflowId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is okay
        console.error('Error loading notes:', { message: error.message, details: error });
        return;
      }

      const content = data?.content || '';
      set((state) => ({
        content: { ...state.content, [workflowId]: content },
        isLoading: { ...state.isLoading, [workflowId]: false },
      }));
    } catch (error) {
      console.error('Error loading notes:', { message: error instanceof Error ? error.message : 'Unknown error', details: error });
      set((state) => ({
        isLoading: { ...state.isLoading, [workflowId]: false },
      }));
    }
  },

  saveNotes: async (workflowId: string, userId: string, content: string) => {
    // Don't try to save notes for "new" workflows (not yet saved)
    // Notes will be saved once the workflow gets a proper ID
    if (workflowId === 'new') {
      console.log('[NotesStore] Skipping save for new workflow - will save after workflow creation');
      return;
    }

    // Set saving state
    set((state) => ({
      isSaving: { ...state.isSaving, [workflowId]: true },
    }));

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('workflow_notes')
        .upsert(
          {
            workflow_id: workflowId,
            user_id: userId,
            content: content,
          },
          {
            onConflict: 'workflow_id,user_id',
          }
        );

      if (error) {
        console.error('Error saving notes:', error);
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      set((state) => ({
        isSaving: { ...state.isSaving, [workflowId]: false },
      }));
    }
  },

  updateContent: (workflowId: string, content: string) => {
    set((state) => ({
      content: { ...state.content, [workflowId]: content },
    }));
  },

  clearNotes: (workflowId: string) => {
    set((state) => {
      const newContent = { ...state.content };
      const newSaving = { ...state.isSaving };
      const newLoading = { ...state.isLoading };
      
      delete newContent[workflowId];
      delete newSaving[workflowId];
      delete newLoading[workflowId];
      
      return {
        content: newContent,
        isSaving: newSaving,
        isLoading: newLoading,
      };
    });
  },

  deleteNotes: async (workflowId: string, userId: string) => {
    // Don't try to delete notes for "new" workflows (never saved)
    if (workflowId === 'new') {
      console.log('[NotesStore] Skipping delete for new workflow');
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('workflow_notes')
        .delete()
        .eq('workflow_id', workflowId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting notes:', error);
        throw error;
      }

      // Clear from local state
      get().clearNotes(workflowId);
      console.log('[NotesStore] Notes deleted for workflow:', workflowId);
    } catch (error) {
      console.error('Failed to delete notes:', error);
      throw error;
    }
  },
}));
