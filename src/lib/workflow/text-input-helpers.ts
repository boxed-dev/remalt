/**
 * Text Input Helpers
 *
 * Utilities to make text inputs (input, textarea, contentEditable) work properly
 * within ReactFlow nodes without interference from dragging/panning.
 *
 * Inspired by clean patterns from Chatbot-flow-builder-React where text selection
 * works naturally without special handling.
 */

import type { SyntheticEvent } from 'react';

/**
 * Stop event propagation to prevent ReactFlow from capturing the event.
 * Use this for input fields, textareas, and any editable content.
 *
 * @example
 * <input
 *   onMouseDown={stopTextInputPropagation}
 *   onPointerDown={stopTextInputPropagation}
 * />
 */
export function stopTextInputPropagation(event: SyntheticEvent) {
  event.stopPropagation();

  // Also stop immediate propagation for nested event handlers
  if ('nativeEvent' in event && typeof (event.nativeEvent as any).stopImmediatePropagation === 'function') {
    (event.nativeEvent as any).stopImmediatePropagation();
  }
}

/**
 * Props to spread on input/textarea elements for proper text selection.
 * Prevents ReactFlow drag from interfering with text selection.
 *
 * @example
 * <input {...getTextInputProps()} />
 * <textarea {...getTextInputProps()} />
 */
export function getTextInputProps() {
  return {
    onMouseDown: stopTextInputPropagation,
    onPointerDown: stopTextInputPropagation,
    onClick: stopTextInputPropagation,
    onDoubleClick: stopTextInputPropagation,
    style: {
      userSelect: 'text' as const,
      WebkitUserSelect: 'text' as const,
      cursor: 'text' as const,
    },
    className: 'select-text',
  };
}

/**
 * Props to spread on scrollable containers (with textareas/inputs inside).
 * Prevents ReactFlow from capturing scroll/wheel events.
 *
 * @example
 * <div {...getScrollableContainerProps()}>
 *   <textarea />
 * </div>
 */
export function getScrollableContainerProps() {
  return {
    onWheel: stopTextInputPropagation,
    onWheelCapture: stopTextInputPropagation,
    onTouchMove: stopTextInputPropagation,
    onTouchStart: stopTextInputPropagation,
  };
}

/**
 * Combined props for text input wrapper divs.
 * Use this on container divs that wrap input fields.
 *
 * @example
 * <div {...getTextInputWrapperProps()}>
 *   <input />
 * </div>
 */
export function getTextInputWrapperProps() {
  return {
    ...getScrollableContainerProps(),
    onMouseDown: stopTextInputPropagation,
    onPointerDown: stopTextInputPropagation,
    style: {
      userSelect: 'text' as const,
      WebkitUserSelect: 'text' as const,
    },
  };
}
