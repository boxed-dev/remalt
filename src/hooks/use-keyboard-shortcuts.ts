import { useEffect } from 'react';

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

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

      // Execute matching shortcut
      if (shortcuts[combo]) {
        if (isEditableElement(event.target) && combo !== 'mod+s') {
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
