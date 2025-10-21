'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export function NovelEditorHelp() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        title="Keyboard shortcuts"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="absolute top-0 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Slash Commands</h4>
          <div className="space-y-1 text-gray-600">
            <p><kbd>/</kbd> - Open command menu</p>
            <p><kbd>/h1</kbd> - Heading 1</p>
            <p><kbd>/h2</kbd> - Heading 2</p>
            <p><kbd>/h3</kbd> - Heading 3</p>
            <p><kbd>/todo</kbd> - To-do list</p>
            <p><kbd>/code</kbd> - Code block</p>
            <p><kbd>/quote</kbd> - Quote block</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Markdown Shortcuts</h4>
          <div className="space-y-1 text-gray-600">
            <p><kbd>#</kbd> + space - Heading 1</p>
            <p><kbd>##</kbd> + space - Heading 2</p>
            <p><kbd>###</kbd> + space - Heading 3</p>
            <p><kbd>-</kbd> + space - Bullet list</p>
            <p><kbd>1.</kbd> + space - Numbered list</p>
            <p><kbd>[]</kbd> + space - To-do list</p>
            <p><kbd>&gt;</kbd> + space - Quote</p>
            <p><kbd>```</kbd> + space - Code block</p>
            <p><kbd>---</kbd> + Enter - Divider</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Text Formatting</h4>
          <div className="space-y-1 text-gray-600">
            <p><kbd>**text**</kbd> - Bold</p>
            <p><kbd>*text*</kbd> - Italic</p>
            <p><kbd>`code`</kbd> - Inline code</p>
            <p><kbd>~~text~~</kbd> - Strikethrough</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Keyboard Shortcuts</h4>
          <div className="space-y-1 text-gray-600">
            <p><kbd>Cmd/Ctrl</kbd> + <kbd>B</kbd> - Bold</p>
            <p><kbd>Cmd/Ctrl</kbd> + <kbd>I</kbd> - Italic</p>
            <p><kbd>Cmd/Ctrl</kbd> + <kbd>K</kbd> - Add link</p>
            <p><kbd>Cmd/Ctrl</kbd> + <kbd>Z</kbd> - Undo</p>
            <p><kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> - Redo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
