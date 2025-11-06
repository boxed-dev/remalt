import type { WorkflowNode, Position } from '@/types/workflow';

/**
 * Checks if a rectangle overlaps with any existing node
 */
function isOverlapping(
  x: number,
  y: number,
  width: number,
  height: number,
  nodes: WorkflowNode[],
  padding: number = 40
): boolean {
  const rect1 = {
    left: x - padding,
    right: x + width + padding,
    top: y - padding,
    bottom: y + height + padding,
  };

  for (const node of nodes) {
    // Estimate node dimensions based on type
    const nodeWidth = (node.style?.width as number) || 300;
    const nodeHeight = (node.style?.height as number) || 200;

    const rect2 = {
      left: node.position.x,
      right: node.position.x + nodeWidth,
      top: node.position.y,
      bottom: node.position.y + nodeHeight,
    };

    // Check if rectangles overlap
    if (
      rect1.left < rect2.right &&
      rect1.right > rect2.left &&
      rect1.top < rect2.bottom &&
      rect1.bottom > rect2.top
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Finds blank space on the canvas for placing new nodes
 * @param nodes - Existing nodes on the canvas
 * @param nodeWidth - Width of the node to be placed (default: 300)
 * @param nodeHeight - Height of the node to be placed (default: 200)
 * @param preferredPosition - Optional preferred starting position
 * @returns Position where the node can be placed without overlap
 */
export function findBlankSpace(
  nodes: WorkflowNode[],
  nodeWidth: number = 300,
  nodeHeight: number = 200,
  preferredPosition?: Position
): Position {
  // If no nodes exist, use preferred position or default
  if (nodes.length === 0) {
    return preferredPosition || { x: 100, y: 100 };
  }

  // If preferred position is provided and doesn't overlap, use it
  if (preferredPosition) {
    if (!isOverlapping(preferredPosition.x, preferredPosition.y, nodeWidth, nodeHeight, nodes)) {
      return preferredPosition;
    }
  }

  // Find the rightmost and bottommost positions
  let maxRight = 0;
  let maxBottom = 0;

  for (const node of nodes) {
    const nodeWidth = (node.style?.width as number) || 300;
    const nodeHeight = (node.style?.height as number) || 200;
    maxRight = Math.max(maxRight, node.position.x + nodeWidth);
    maxBottom = Math.max(maxBottom, node.position.y + nodeHeight);
  }

  // Try positions in a grid pattern starting from top-left
  const startX = 100;
  const startY = 100;
  const stepX = 350; // Horizontal step
  const stepY = 250; // Vertical step
  const maxAttempts = 100;

  let attempts = 0;
  let row = 0;
  let col = 0;

  while (attempts < maxAttempts) {
    const x = startX + col * stepX;
    const y = startY + row * stepY;

    if (!isOverlapping(x, y, nodeWidth, nodeHeight, nodes)) {
      return { x, y };
    }

    // Move to next position in grid
    col++;
    if (x > maxRight + 400) {
      col = 0;
      row++;
    }

    attempts++;
  }

  // Fallback: place to the right of all existing nodes
  return {
    x: maxRight + 100,
    y: startY,
  };
}

/**
 * Finds positions for multiple nodes to be placed horizontally
 * @param nodes - Existing nodes on the canvas
 * @param count - Number of nodes to place
 * @param nodeWidth - Width of each node (default: 300)
 * @param nodeHeight - Height of each node (default: 200)
 * @param spacing - Horizontal spacing between nodes (default: 320)
 * @param preferredPosition - Optional preferred starting position
 * @returns Array of positions for the new nodes
 */
export function findBlankSpaceForMultiple(
  nodes: WorkflowNode[],
  count: number,
  nodeWidth: number = 300,
  nodeHeight: number = 200,
  spacing: number = 320,
  preferredPosition?: Position
): Position[] {
  if (count === 0) return [];
  if (count === 1) {
    return [findBlankSpace(nodes, nodeWidth, nodeHeight, preferredPosition)];
  }

  // Calculate total width needed for all nodes
  const totalWidth = nodeWidth * count + spacing * (count - 1);

  // Find a starting position that can fit all nodes horizontally
  let startPosition = findBlankSpace(nodes, totalWidth, nodeHeight, preferredPosition);

  // Check if all positions in the row are clear
  const positions: Position[] = [];
  let needsNewRow = false;

  for (let i = 0; i < count; i++) {
    const x = startPosition.x + i * spacing;
    const y = startPosition.y;

    // Check if this position overlaps
    if (isOverlapping(x, y, nodeWidth, nodeHeight, nodes)) {
      needsNewRow = true;
      break;
    }

    positions.push({ x, y });
  }

  // If we need a new row, find blank space to the right or below all existing nodes
  if (needsNewRow) {
    positions.length = 0; // Clear positions

    // Find the rightmost position
    let maxRight = 0;
    for (const node of nodes) {
      const w = (node.style?.width as number) || 300;
      maxRight = Math.max(maxRight, node.position.x + w);
    }

    // Start from right of all nodes
    startPosition = { x: maxRight + 100, y: 100 };

    // Generate positions horizontally
    for (let i = 0; i < count; i++) {
      positions.push({
        x: startPosition.x + i * spacing,
        y: startPosition.y,
      });
    }
  }

  return positions;
}
