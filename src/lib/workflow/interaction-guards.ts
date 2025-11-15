import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';

export const FLOWY_INTERACTIVE_ATTR = 'data-flowy-interactive';

// Extended native event type with optional stopImmediatePropagation
interface NativeLikeEvent extends Event {
  stopImmediatePropagation?: () => void;
}

type SyntheticLikeEvent = {
  stopPropagation: () => void;
  preventDefault?: () => void;
  nativeEvent?: NativeLikeEvent;
} & Partial<NativeLikeEvent>;

function getNativeEvent(event: SyntheticLikeEvent): NativeLikeEvent | null {
  if ('nativeEvent' in event && event.nativeEvent) {
    return event.nativeEvent as NativeLikeEvent;
  }
  return (event as NativeLikeEvent) ?? null;
}

export function stopCanvasPointerEvent(
  event: ReactPointerEvent | ReactMouseEvent | PointerEvent | MouseEvent
): void {
  event.stopPropagation();
  const nativeEvent = getNativeEvent(event as SyntheticLikeEvent);
  nativeEvent?.stopImmediatePropagation?.();
}

export function stopCanvasWheelEvent(
  event: ReactWheelEvent | WheelEvent,
  options: { preventDefault?: boolean } = {}
): void {
  stopCanvasPointerEvent(event as unknown as ReactPointerEvent);
  if (options.preventDefault) {
    const nativeEvent = getNativeEvent(event as SyntheticLikeEvent);
    nativeEvent?.preventDefault?.();
  }
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON']);

export function isInteractiveElement(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest(`[${FLOWY_INTERACTIVE_ATTR}="true"]`)) {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (EDITABLE_TAGS.has(target.tagName)) {
    return true;
  }

  // Also treat elements with explicit tabindex >= 0 as interactive controls
  const tabIndexAttr = target.getAttribute('tabindex');
  if (tabIndexAttr !== null && Number.parseInt(tabIndexAttr, 10) >= 0) {
    return true;
  }

  return false;
}
