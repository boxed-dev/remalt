import { useEffect } from 'react';
import { isInteractiveElement } from '@/lib/workflow/interaction-guards';

const EDITABLE_SAFE_SHORTCUTS = new Set([
  'mod+a',
  'mod+c',
  'mod+x',
  'mod+v',
  'mod+shift+v',
]);

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Build the key combination string
      let combo = '';
      if (modifier) combo += 'mod+';
      if (event.shiftKey) combo += 'shift+';
      if (event.altKey) combo += 'alt+';
      combo += event.key.toLowerCase();

      // Check if user is in an editable element
      const inEditableElement = isInteractiveElement(event.target);

      // Execute matching shortcut
      if (shortcuts[combo]) {
        // Always allow mod+s (save) and mod+k (boards menu)
        // For single-key shortcuts (node additions), only work when not in editable element
        const isModifierShortcut = combo.includes('mod+') || combo.includes('shift+') || combo.includes('alt+');

        if (
          inEditableElement &&
          (!isModifierShortcut || EDITABLE_SAFE_SHORTCUTS.has(combo)) &&
          combo !== 'mod+s' &&
          combo !== 'mod+k'
        ) {
          return;
        }

        event.preventDefault();
        shortcuts[combo]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
