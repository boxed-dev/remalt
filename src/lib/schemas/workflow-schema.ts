import { z } from 'zod';

/**
 * Workflow validation schema
 *
 * This schema uses a permissive approach with .catchall(z.unknown()) to allow extra fields
 * that may exist on nodes/edges from the UI but aren't part of the core schema.
 * This prevents validation errors when saving workflows with UI-specific data.
 */

// Position schema
const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Viewport schema
const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

// Workflow metadata schema
const WorkflowMetadataSchema = z.object({
  version: z.string(),
  tags: z.array(z.string()),
  isPublic: z.boolean(),
}).catchall(z.unknown());

// Node data schema - permissive to allow any fields
const NodeDataSchema = z.record(z.string(), z.unknown());

// Workflow node schema - validates structure but allows any data
const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: PositionSchema,
  data: NodeDataSchema,
}).catchall(z.unknown());

// Workflow edge schema
const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  type: z.string().optional(),
}).catchall(z.unknown());

// Main workflow schema
export const WorkflowSchema = z.object({
  id: z.string().uuid({ version: 'v4' }),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  viewport: ViewportSchema,
  metadata: WorkflowMetadataSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ValidatedWorkflow = z.infer<typeof WorkflowSchema>;
