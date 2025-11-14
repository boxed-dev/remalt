import type { Workflow, WorkflowNode } from '@/types/workflow';

/**
 * DependencyResolver - Resolves node execution order and dependencies
 *
 * This class handles:
 * - Topological sorting for correct execution order
 * - Cycle detection in workflows
 * - Finding upstream/downstream nodes
 * - Calculating execution paths
 */

/**
 * Sort workflow nodes in topological order using Kahn's algorithm
 * Returns array of node IDs in execution order
 *
 * @throws Error if workflow contains circular dependencies
 */
export function topologicalSort(workflow: Workflow): string[] {
  const { nodes, edges } = workflow;

  // Build adjacency list and in-degree map
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize graph structure
  for (const node of nodes) {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Build the graph from edges
  for (const edge of edges) {
    // Add edge from source to target
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);

    // Increment in-degree for target
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Kahn's algorithm for topological sorting
  const queue: string[] = [];
  const result: string[] = [];

  // Add all nodes with no incoming edges (source nodes)
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Process nodes level by level
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    // Reduce in-degree for all neighbors
    const neighbors = graph.get(nodeId) || [];
    for (const neighborId of neighbors) {
      const newDegree = (inDegree.get(neighborId) || 0) - 1;
      inDegree.set(neighborId, newDegree);

      // If in-degree becomes 0, add to queue
      if (newDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // Check for cycles
  if (result.length !== nodes.length) {
    const cycleNodes = nodes
      .filter((n) => !result.includes(n.id))
      .map((n) => n.id);

    throw new Error(
      `Workflow contains circular dependencies involving nodes: ${cycleNodes.join(', ')}`
    );
  }

  return result;
}

/**
 * Sort nodes in topological order, grouped by execution level
 * Returns array of arrays, where each inner array contains nodes that can execute in parallel
 */
export function topologicalSortLevels(workflow: Workflow): string[][] {
  const { nodes, edges } = workflow;

  // Build adjacency list and in-degree map
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize graph structure
  for (const node of nodes) {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Build the graph from edges
  for (const edge of edges) {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const levels: string[][] = [];
  const processed = new Set<string>();

  // Process level by level
  while (processed.size < nodes.length) {
    const currentLevel: string[] = [];

    // Find all nodes with no remaining dependencies
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0 && !processed.has(nodeId)) {
        currentLevel.push(nodeId);
      }
    }

    // No nodes can execute - we have a cycle
    if (currentLevel.length === 0 && processed.size < nodes.length) {
      const cycleNodes = nodes
        .filter((n) => !processed.has(n.id))
        .map((n) => n.id);

      throw new Error(
        `Workflow contains circular dependencies involving nodes: ${cycleNodes.join(', ')}`
      );
    }

    // Mark current level as processed
    for (const nodeId of currentLevel) {
      processed.add(nodeId);

      // Reduce in-degree for all neighbors
      const neighbors = graph.get(nodeId) || [];
      for (const neighborId of neighbors) {
        inDegree.set(neighborId, (inDegree.get(neighborId) || 0) - 1);
      }
    }

    if (currentLevel.length > 0) {
      levels.push(currentLevel);
    }
  }

  return levels;
}

/**
 * Detect if workflow has circular dependencies
 * Returns array of node IDs involved in cycles, or empty array if no cycles
 */
export function detectCycles(workflow: Workflow): string[] {
  try {
    topologicalSort(workflow);
    return []; // No cycles found
  } catch (error) {
    // Extract node IDs from error message
    const message = error instanceof Error ? error.message : '';
    const match = message.match(/nodes: (.+)$/);
    if (match) {
      return match[1].split(', ');
    }
    return [];
  }
}

/**
 * Get execution order starting from a specific node
 * Useful for "Run from here" feature
 *
 * Returns array of node IDs in execution order, including the start node
 */
export function getExecutionOrderFromNode(
  startNodeId: string,
  workflow: Workflow
): string[] {
  const { nodes, edges } = workflow;
  const node = nodes.find((n) => n.id === startNodeId);

  // Get all downstream nodes
  const downstream = getDownstreamNodes(startNodeId, workflow);

  // Start/Trigger nodes should only trigger execution, not execute themselves
  if (node?.type === 'start') {
    if (downstream.length === 0) {
      console.warn('⚠️ Start node has no downstream connections');
      return [];
    }

    // Execute only downstream nodes, exclude the Start node itself
    const filteredWorkflow: Workflow = {
      ...workflow,
      nodes: nodes.filter((n) => downstream.includes(n.id)),
      edges: edges.filter(
        (e) => downstream.includes(e.source) && downstream.includes(e.target)
      ),
    };

    return topologicalSort(filteredWorkflow);
  }

  // For regular nodes, include the node itself + downstream
  const relevantNodes = [startNodeId, ...downstream];

  const filteredWorkflow: Workflow = {
    ...workflow,
    nodes: nodes.filter((n) => relevantNodes.includes(n.id)),
    edges: edges.filter(
      (e) => relevantNodes.includes(e.source) && relevantNodes.includes(e.target)
    ),
  };

  return topologicalSort(filteredWorkflow);
}

/**
 * Get all downstream nodes (nodes that depend on this node)
 * Uses BFS traversal
 */
export function getDownstreamNodes(nodeId: string, workflow: Workflow): string[] {
  const { edges } = workflow;
  const downstream = new Set<string>();
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Find all outgoing edges from current node
    const outgoingEdges = edges.filter((e) => e.source === currentId);

    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        downstream.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return Array.from(downstream);
}

/**
 * Get all upstream nodes (nodes that this node depends on)
 * Uses BFS traversal
 */
export function getUpstreamNodes(nodeId: string, workflow: Workflow): string[] {
  const { edges } = workflow;
  const upstream = new Set<string>();
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Find all incoming edges to current node
    const incomingEdges = edges.filter((e) => e.target === currentId);

    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        upstream.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return Array.from(upstream);
}

/**
 * Get direct parent nodes (immediate dependencies)
 */
export function getParentNodes(nodeId: string, workflow: Workflow): WorkflowNode[] {
  const { nodes, edges } = workflow;

  // Find all incoming edges
  const incomingEdges = edges.filter((e) => e.target === nodeId);

  // Get source nodes
  const parentIds = incomingEdges.map((e) => e.source);

  return nodes.filter((n) => parentIds.includes(n.id));
}

/**
 * Get direct child nodes (immediate dependents)
 */
export function getChildNodes(nodeId: string, workflow: Workflow): WorkflowNode[] {
  const { nodes, edges } = workflow;

  // Find all outgoing edges
  const outgoingEdges = edges.filter((e) => e.source === nodeId);

  // Get target nodes
  const childIds = outgoingEdges.map((e) => e.target);

  return nodes.filter((n) => childIds.includes(n.id));
}

/**
 * Check if a node has any dependencies (incoming edges)
 */
export function hasDependencies(nodeId: string, workflow: Workflow): boolean {
  return workflow.edges.some((e) => e.target === nodeId);
}

/**
 * Check if a node has any dependents (outgoing edges)
 */
export function hasDependents(nodeId: string, workflow: Workflow): boolean {
  return workflow.edges.some((e) => e.source === nodeId);
}

/**
 * Get source nodes (nodes with no incoming edges)
 */
export function getSourceNodes(workflow: Workflow): WorkflowNode[] {
  const { nodes, edges } = workflow;

  // Find nodes with no incoming edges
  const nodesWithIncoming = new Set(edges.map((e) => e.target));

  return nodes.filter((n) => !nodesWithIncoming.has(n.id));
}

/**
 * Get sink nodes (nodes with no outgoing edges)
 */
export function getSinkNodes(workflow: Workflow): WorkflowNode[] {
  const { nodes, edges } = workflow;

  // Find nodes with no outgoing edges
  const nodesWithOutgoing = new Set(edges.map((e) => e.source));

  return nodes.filter((n) => !nodesWithOutgoing.has(n.id));
}

/**
 * Check if output of upstream nodes is stale compared to current node
 * Returns true if any upstream node has been executed more recently
 */
export function isOutputStale(nodeId: string, workflow: Workflow): boolean {
  const node = workflow.nodes.find((n) => n.id === nodeId);
  if (!node || !node.data.lastExecutedAt) {
    return false; // No execution yet, not stale
  }

  const nodeExecutionTime = new Date(node.data.lastExecutedAt).getTime();
  const parentNodes = getParentNodes(nodeId, workflow);

  for (const parent of parentNodes) {
    // If parent has no execution, output is stale
    if (!parent.data.lastExecutedAt) {
      return true;
    }

    const parentExecutionTime = new Date(parent.data.lastExecutedAt).getTime();

    // If parent executed after this node, output is stale
    if (parentExecutionTime > nodeExecutionTime) {
      return true;
    }
  }

  return false;
}

/**
 * Mark downstream nodes as stale after a node executes
 * This should be called after successful node execution
 */
export function markDownstreamStale(nodeId: string, workflow: Workflow): void {
  const downstreamIds = getDownstreamNodes(nodeId, workflow);

  for (const id of downstreamIds) {
    const node = workflow.nodes.find((n) => n.id === id);
    if (node) {
      node.data.outputStale = true;
    }
  }
}

/**
 * Build execution graph metadata
 * Useful for visualization and debugging
 */
export interface ExecutionGraphMeta {
  totalNodes: number;
  sourceNodes: string[]; // Nodes with no dependencies
  sinkNodes: string[]; // Nodes with no dependents
  executionLevels: string[][];
  maxParallelism: number; // Max nodes that can execute in parallel
  criticalPath: string[]; // Longest execution path
  hasCycles: boolean;
  cycleNodes: string[];
}

export function buildExecutionGraphMeta(workflow: Workflow): ExecutionGraphMeta {
  const sourceNodes = getSourceNodes(workflow).map((n) => n.id);
  const sinkNodes = getSinkNodes(workflow).map((n) => n.id);
  const cycleNodes = detectCycles(workflow);
  const hasCycles = cycleNodes.length > 0;

  let executionLevels: string[][] = [];
  let maxParallelism = 0;

  if (!hasCycles) {
    executionLevels = topologicalSortLevels(workflow);
    maxParallelism = Math.max(...executionLevels.map((level) => level.length), 0);
  }

  // Calculate critical path (longest path from source to sink)
  const criticalPath = calculateCriticalPath(workflow);

  return {
    totalNodes: workflow.nodes.length,
    sourceNodes,
    sinkNodes,
    executionLevels,
    maxParallelism,
    criticalPath,
    hasCycles,
    cycleNodes,
  };
}

/**
 * Calculate the critical path (longest path through the workflow)
 * This represents the minimum time needed to execute the entire workflow
 */
function calculateCriticalPath(workflow: Workflow): string[] {
  try {
    const levels = topologicalSortLevels(workflow);
    const { nodes, edges } = workflow;

    // Distance map (number of nodes in longest path to reach each node)
    const distance = new Map<string, number>();
    const parent = new Map<string, string>();

    // Initialize distances
    for (const node of nodes) {
      distance.set(node.id, 0);
    }

    // Process nodes level by level
    for (const level of levels) {
      for (const nodeId of level) {
        // Find all incoming edges
        const incomingEdges = edges.filter((e) => e.target === nodeId);

        // Update distance based on longest path from parents
        for (const edge of incomingEdges) {
          const sourceDistance = distance.get(edge.source) || 0;
          const newDistance = sourceDistance + 1;

          if (newDistance > (distance.get(nodeId) || 0)) {
            distance.set(nodeId, newDistance);
            parent.set(nodeId, edge.source);
          }
        }
      }
    }

    // Find the node with maximum distance (end of critical path)
    let maxDistance = 0;
    let endNode = '';

    for (const [nodeId, dist] of distance.entries()) {
      if (dist > maxDistance) {
        maxDistance = dist;
        endNode = nodeId;
      }
    }

    // Backtrack to build the path
    const path: string[] = [];
    let currentNode: string | undefined = endNode;

    while (currentNode) {
      path.unshift(currentNode);
      currentNode = parent.get(currentNode);
    }

    return path;
  } catch {
    // If there's a cycle, return empty path
    return [];
  }
}
