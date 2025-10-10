'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
import { useEffect } from 'react';

interface BlockNoteEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function BlockNoteEditor({
  initialContent,
  onChange,
  onBlur,
  placeholder = 'Type / for commands...',
  className = '',
}: BlockNoteEditorProps) {
  // Parse initial content - convert from plain text to BlockNote format
  const parseInitialContent = (content: string | undefined) => {
    if (!content) return undefined;

    // Try to parse as JSON first (BlockNote format)
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not JSON, treat as plain text
    }

    // Convert plain text to BlockNote blocks
    const lines = content.split('\n');
    return lines.map((line) => ({
      type: 'paragraph' as const,
      content: line || undefined,
    }));
  };

  const editor = useCreateBlockNote({
    initialContent: parseInitialContent(initialContent) as any,
  });

  // Handle changes
  useEffect(() => {
    if (!onChange) return;

    const handleUpdate = async () => {
      const blocks = editor.document;

      // Convert blocks to JSON string for storage
      const jsonContent = JSON.stringify(blocks);
      onChange(jsonContent);
    };

    // Subscribe to editor changes
    const unsubscribe = editor.onChange(handleUpdate);

    return () => {
      unsubscribe();
    };
  }, [editor, onChange]);

  return (
    <>
      <BlockNoteView
        editor={editor as any}
        theme="light"
        className={`blocknote-wrapper ${className}`}
        onBlur={onBlur}
      />
      <style jsx global>{`
        /* Ensure the direct child of bn-container is transparent */
        .bn-container > div {
          background: transparent !important;
        }

        /* Container styling */
        .blocknote-wrapper {
          --bn-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 15px;
          line-height: 1.6;
          cursor: text;
        }

        /* Clean editor background */
        .bn-container {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
        }

        .bn-editor {
          padding: 12px 16px !important;
          font-size: 15px !important;
          color: #1A1D21 !important;
          cursor: text !important;
          min-height: 200px;
        }

        /* Block spacing - compact like the image */
        .bn-block-outer {
          margin-bottom: 0px !important;
          cursor: text !important;
        }

        .bn-block-content {
          font-size: 15px !important;
          line-height: 1.6 !important;
          color: #1A1D21 !important;
          padding: 2px 0 !important;
          min-height: 26px !important;
        }

        /* Headings - Bold and properly sized */
        .bn-block-content[data-content-type="heading"][data-level="1"] {
          font-size: 24px !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          color: #1A1D21 !important;
          margin: 12px 0 6px 0 !important;
        }

        .bn-block-content[data-content-type="heading"][data-level="2"] {
          font-size: 18px !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          color: #1A1D21 !important;
          margin: 10px 0 4px 0 !important;
        }

        .bn-block-content[data-content-type="heading"][data-level="3"] {
          font-size: 16px !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          color: #1A1D21 !important;
          margin: 8px 0 2px 0 !important;
        }

        /* SLASH MENU - Exactly like the image */
        .bn-suggestion-menu {
          background: white !important;
          border: 1px solid #E5E7EB !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          padding: 6px !important;
          min-width: 280px !important;
          max-width: 320px !important;
          max-height: 400px !important;
          overflow-y: auto !important;
          z-index: 9999 !important;
          pointer-events: auto !important;
        }

        /* Scrollbar for slash menu */
        .bn-suggestion-menu::-webkit-scrollbar {
          width: 8px !important;
        }

        .bn-suggestion-menu::-webkit-scrollbar-track {
          background: #F9FAFB !important;
          border-radius: 4px !important;
        }

        .bn-suggestion-menu::-webkit-scrollbar-thumb {
          background: #D1D5DB !important;
          border-radius: 4px !important;
        }

        .bn-suggestion-menu::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF !important;
        }

        /* Menu section labels */
        .bn-suggestion-menu-label {
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.06em !important;
          color: #9CA3AF !important;
          font-weight: 600 !important;
          padding: 10px 12px 6px 12px !important;
          margin-top: 4px !important;
        }

        .bn-suggestion-menu-label:first-child {
          margin-top: 0 !important;
        }

        /* Menu items - Clean and subtle */
        .bn-suggestion-menu-item {
          font-size: 13px !important;
          padding: 8px 12px !important;
          border-radius: 6px !important;
          color: #374151 !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          transition: all 0.12s ease !important;
          cursor: pointer !important;
          margin: 2px 0 !important;
        }

        .bn-suggestion-menu-item:hover {
          background: #F9FAFB !important;
          color: #111827 !important;
        }

        .bn-suggestion-menu-item[data-selected="true"] {
          background: #EFF6FF !important;
          color: #1E40AF !important;
        }

        /* Menu item icons - subtle gray */
        .bn-suggestion-menu-item .bn-suggestion-menu-item-icon {
          width: 20px !important;
          height: 20px !important;
          opacity: 0.6 !important;
          flex-shrink: 0 !important;
        }

        .bn-suggestion-menu-item[data-selected="true"] .bn-suggestion-menu-item-icon {
          opacity: 0.9 !important;
        }

        /* Menu item text */
        .bn-suggestion-menu-item-title {
          flex: 1 !important;
          font-weight: 500 !important;
        }

        .bn-suggestion-menu-item-subtitle {
          font-size: 12px !important;
          color: #6B7280 !important;
          display: block !important;
          margin-top: 2px !important;
        }

        /* Keyboard shortcuts */
        .bn-suggestion-menu-item-badge {
          margin-left: auto !important;
          font-size: 11px !important;
          color: #9CA3AF !important;
          font-family: 'SF Mono', Monaco, 'Courier New', monospace !important;
          background: #F3F4F6 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-weight: 500 !important;
        }

        /* Placeholder */
        .bn-inline-content[data-content-type="paragraph"] > span[data-is-empty="true"]::before {
          content: "${placeholder}";
          color: #9CA3AF !important;
          font-size: 15px !important;
          font-weight: 400 !important;
        }

        /* FORMATTING TOOLBAR (bubble menu) - Dark like image */
        .bn-formatting-toolbar {
          background: rgba(31, 41, 55, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
          padding: 4px !important;
          display: flex !important;
          gap: 2px !important;
        }

        .bn-formatting-toolbar button {
          color: rgba(255, 255, 255, 0.9) !important;
          border-radius: 5px !important;
          padding: 6px 8px !important;
          min-width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.15s ease !important;
          background: transparent !important;
        }

        .bn-formatting-toolbar button:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          color: white !important;
        }

        .bn-formatting-toolbar button[data-active="true"] {
          background: rgba(59, 130, 246, 0.5) !important;
          color: white !important;
        }

        /* Side menu (+ button) - subtle */
        .bn-side-menu {
          opacity: 0 !important;
          transition: opacity 0.2s !important;
        }

        .bn-block-outer:hover .bn-side-menu {
          opacity: 1 !important;
        }

        .bn-side-menu button {
          color: #9CA3AF !important;
          width: 24px !important;
          height: 24px !important;
          border-radius: 4px !important;
        }

        .bn-side-menu button:hover {
          background: #F3F4F6 !important;
          color: #374151 !important;
        }

        /* Drag handle - very subtle */
        .bn-drag-handle {
          opacity: 0 !important;
          transition: opacity 0.2s !important;
          color: #D1D5DB !important;
        }

        .bn-block-outer:hover .bn-drag-handle {
          opacity: 0.4 !important;
        }

        .bn-drag-handle:hover {
          opacity: 0.7 !important;
          color: #9CA3AF !important;
        }

        /* Quote blocks */
        .bn-block-content[data-content-type="quote"] {
          border-left: 3px solid #E5E7EB !important;
          padding-left: 16px !important;
          color: #6B7280 !important;
          font-style: italic !important;
        }

        /* Code blocks */
        .bn-block-content[data-content-type="code"] {
          background: #F9FAFB !important;
          border: 1px solid #E5E7EB !important;
          border-radius: 6px !important;
          padding: 12px 14px !important;
          font-family: 'SF Mono', Monaco, 'Courier New', monospace !important;
          font-size: 13px !important;
          color: #374151 !important;
        }

        /* Lists */
        .bn-block-content ul,
        .bn-block-content ol {
          margin: 4px 0 !important;
          padding-left: 24px !important;
        }

        .bn-block-content li {
          margin: 2px 0 !important;
        }

        /* Checkboxes */
        .bn-block-content input[type="checkbox"] {
          width: 16px !important;
          height: 16px !important;
          margin-right: 8px !important;
          border-radius: 4px !important;
          border: 1.5px solid #D1D5DB !important;
          accent-color: #3B82F6 !important;
        }

        /* Links */
        .bn-inline-content a {
          color: #3B82F6 !important;
          text-decoration: underline !important;
          text-underline-offset: 2px !important;
        }

        .bn-inline-content a:hover {
          color: #2563EB !important;
        }

        /* Bold */
        .bn-inline-content strong {
          font-weight: 700 !important;
          color: #1A1D21 !important;
        }

        /* Italic */
        .bn-inline-content em {
          font-style: italic !important;
        }

        /* Code inline */
        .bn-inline-content code {
          background: #F3F4F6 !important;
          color: #EF4444 !important;
          padding: 2px 6px !important;
          border-radius: 3px !important;
          font-family: 'SF Mono', Monaco, monospace !important;
          font-size: 0.9em !important;
        }

        /* Focus state */
        .bn-editor:focus-visible {
          outline: none !important;
        }

        .bn-container:focus-within {
          outline: none !important;
        }
      `}</style>
    </>
  );
}
