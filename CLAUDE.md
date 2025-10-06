# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Remalt is a Next.js 15 AI workflow builder platform with a visual node-based editor powered by XYFlow (ReactFlow). Users create, visualize, and execute AI-powered workflows through drag-and-drop interfaces with 11 specialized node types organized into Media (pdf, voice, youtube, image, webpage), Content (text, mindmap), AI (template, chat), and Structure (connector, group) categories.

## Common Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build with Turbopack
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Python API for YouTube transcription (separate terminal)
python transcript_api.py 5001
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15.5.4 with App Router and Turbopack
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (New York style)
- **State Management**: Zustand with Immer middleware
- **Workflow Canvas**: @xyflow/react v12
- **Authentication**: Supabase Auth with SSR support (Email + Google OAuth)
- **Database**: Supabase PostgreSQL with Row Level Security
- **AI Services**: Google Generative AI (Gemini 2.5 Flash/Pro), Deepgram SDK
- **Layout**: ELK.js for automatic graph layout

### Project Structure
```
src/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── chat/               # Gemini AI streaming chat
│   │   ├── transcribe/         # YouTube transcription
│   │   ├── voice/transcribe/   # Deepgram voice transcription
│   │   ├── image/analyze/      # Gemini Vision image analysis
│   │   ├── webpage/            # Web scraping (Jina AI + fallbacks)
│   │   └── pdf/parse/          # PDF document parsing
│   ├── flows/                  # Flow library and workflow editor
│   ├── auth/                   # Authentication pages (signin/signup/callback)
│   └── account/                # User account management
├── components/
│   ├── workflow/               # Workflow canvas, toolbar, sidebar
│   │   ├── nodes/              # 11 specialized node implementations
│   │   └── edges/              # Custom edge components
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── stores/
│   │   └── workflow-store.ts   # Zustand store for workflow state
│   ├── workflow/
│   │   ├── node-registry.ts    # Node metadata and defaults
│   │   └── context-builder.ts  # Build context from connected nodes
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client (RSC/Route Handlers)
│   │   ├── middleware.ts       # Auth middleware utilities
│   │   └── workflows.ts        # Workflow CRUD operations
│   ├── api/                    # API client utilities
│   ├── cache/                  # In-memory caching (transcript-cache)
│   └── recording-manager.ts    # Audio recording management
├── hooks/
│   ├── use-workflow-persistence.ts  # Auto-save with 2s debouncing
│   ├── use-current-user.ts          # Get authenticated user
│   └── use-keyboard-shortcuts.ts    # Global shortcuts (Cmd+S)
└── types/
    └── workflow.ts             # TypeScript definitions for workflows
```

### Path Aliases
- `@/*` → `./src/*`

### Environment Variables
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anonymous key
GEMINI_API_KEY=                     # Google Gemini API key

# Optional
DEEPGRAM_API_KEY=                   # Voice transcription
PYTHON_API_URL=                     # Python API URL (default: http://localhost:5001)
JINA_API_KEY=                       # Web scraping (20 RPM free, 200 RPM with key)
SCREENSHOTONE_API_KEY=              # Screenshot provider (Priority 1)
APIFLASH_API_KEY=                   # Screenshot provider (Priority 2)
URLBOX_API_KEY=                     # Screenshot provider (Priority 3)
URLBOX_SECRET=                      # Urlbox API signing secret
SCREENSHOTAPI_API_KEY=              # Screenshot provider (Priority 4)
```

## Key Architectural Patterns

### State Management with Zustand
The workflow store ([workflow-store.ts](src/lib/stores/workflow-store.ts)) uses Zustand with Immer middleware for immutable state updates:

```typescript
// Key operations
- createWorkflow(name, description)
- loadWorkflow(workflow)
- addNode(type, position, data)
- updateNodeData(id, data)
- deleteNodes(ids)
- addEdge(source, target)
- copyNodes(ids) / pasteNodes(position)
- createGroup(nodeIds, position)
- undo() / redo()
```

All workflow state modifications go through the store. Use `useWorkflowStore()` hook to access state and actions.

### Node System
11 specialized node types defined in [workflow.ts](src/types/workflow.ts):

**Media Nodes**: `pdf`, `voice`, `youtube`, `image`, `webpage` - Process and extract content from various sources
**Content Nodes**: `text`, `mindmap` - Create and organize textual content
**AI Nodes**: `template`, `chat` - Generate AI-powered content and conversations
**Structure Nodes**: `connector`, `group` - Organize and relate other nodes

Each node type has:
- Strongly-typed data interface (discriminated union `NodeData`)
- Default data factory in `createDefaultNodeData()` (workflow-store.ts:124)
- Metadata in [node-registry.ts](src/lib/workflow/node-registry.ts) (labels, colors, dimensions)
- React component in `src/components/workflow/nodes/`

### Context Building for Chat Nodes
Chat nodes automatically receive context from connected nodes via [context-builder.ts](src/lib/workflow/context-builder.ts):

```typescript
buildChatContext(chatNodeId, workflow) → ChatContext {
  textContext, youtubeTranscripts, voiceTranscripts, pdfDocuments,
  images, webpages, mindMaps, templates, groupChats
}
```

The context builder:
1. Finds all edges targeting the chat node
2. Extracts data from source nodes based on type
3. Collects text, transcripts, parsed PDFs, image analyses, etc.
4. Returns structured context for AI processing

### Workflow Persistence
[use-workflow-persistence.ts](src/hooks/use-workflow-persistence.ts) handles auto-save with:
- 2-second debounce (configurable)
- Sanitization of non-serializable data (File objects, blob URLs)
- Skip save for empty/unchanged workflows
- Upsert pattern (handles both create and update)
- Manual save via `Cmd/Ctrl+S` keyboard shortcut

All workflow operations use [workflows.ts](src/lib/supabase/workflows.ts) CRUD functions:
```typescript
getUserWorkflows(supabase)
getWorkflow(supabase, id)
createWorkflow(supabase, workflow, userId)
updateWorkflow(supabase, workflow, userId)
deleteWorkflow(supabase, id)
duplicateWorkflow(supabase, id, userId, newName?)
searchWorkflows(supabase, query)
```

### Authentication Flow
- Server Components and Route Handlers use `createServerClient()` from [server.ts](src/lib/supabase/server.ts)
- Client Components use `createClient()` from [client.ts](src/lib/supabase/client.ts)
- [middleware.ts](src/middleware.ts) protects routes by checking auth status
- User profile auto-created via database trigger on signup (see [schema.sql](supabase/schema.sql))
- RLS policies ensure users only access their own workflows

### Database Schema
Key tables in [schema.sql](supabase/schema.sql):

**profiles**: User profiles (id, email, full_name, avatar_url)
**workflows**: Workflow storage with JSONB columns for nodes/edges/viewport/metadata

RLS policies enforce:
- Users can only view/edit/delete their own workflows
- Public workflows visible to all (via `metadata->>'isPublic'`)
- Profile trigger creates profile row on user signup

## API Routes

### `/api/chat` (POST)
Streaming AI chat endpoint using Gemini 2.5 Flash:
- Accepts: `messages`, context from all 11 node types
- Returns: Server-sent events (SSE) stream with incremental responses
- Context builder assembles data from connected nodes

### `/api/transcribe` (POST)
YouTube transcription via Python API:
- Accepts: `url` (YouTube video URL)
- Returns: `transcript`, `method`, `language`, `videoId`, `cached`, `elapsed_ms`
- In-memory caching prevents duplicate API calls
- Calls Python API at `PYTHON_API_URL` (default: http://localhost:5001)

### `/api/voice/transcribe` (POST)
Voice transcription via Deepgram SDK:
- Accepts: `audio` (base64 or URL), `format` (wav/mp3/etc.)
- Returns: `transcript`, `confidence`, `words` (with timestamps)

### `/api/image/analyze` (POST)
Image analysis via Gemini Vision:
- Accepts: `imageUrl` or `imageData` (base64)
- Returns: `description`, `ocrText`, `objects`, `tags`

### `/api/webpage/analyze` (POST)
Web scraping via Jina AI Reader with fallback:
- Accepts: `url`
- Uses Jina AI Reader with automatic fallback to direct HTML fetch
- Returns: `pageTitle`, `pageContent` (markdown), `summary`, `keyPoints`, `metadata`

### `/api/webpage/preview` (POST)
Webpage metadata preview:
- Accepts: `url`
- Extracts Open Graph meta tags
- Auto-generates screenshot if no og:image available
- Returns: `title`, `description`, `imageUrl`, `themeColor`

### `/api/webpage/screenshot` (POST)
Multi-provider screenshot generation:
- Accepts: `url`
- Priority fallback: ScreenshotOne → ApiFlash → Urlbox → ScreenshotAPI → Microlink
- Returns: `success`, `imageUrl`, `provider`, `cached`

### `/api/pdf/parse` (POST)
PDF document parsing:
- Accepts: `pdfUrl` or `pdfData`
- Returns: `segments` (array of text chunks with headings)

## Development Practices

### ID Generation
Use `crypto.randomUUID()` for all IDs (workflows, nodes, edges). Consistent with Supabase-generated UUIDs.

### Type Safety
All workflow operations are fully typed. The `NodeData` discriminated union ensures type safety when accessing node-specific data.

### Node Implementation
When implementing or modifying nodes:
1. Update type definition in [workflow.ts](src/types/workflow.ts)
2. Add default data factory in [workflow-store.ts](src/lib/stores/workflow-store.ts:124)
3. Register metadata in [node-registry.ts](src/lib/workflow/node-registry.ts)
4. Create React component in `src/components/workflow/nodes/`
5. Add context extraction logic in [context-builder.ts](src/lib/workflow/context-builder.ts)

### Supabase Client Usage
- **Server Components & Route Handlers**: Always use `createServerClient()` from [server.ts](src/lib/supabase/server.ts)
- **Client Components**: Always use `createClient()` from [client.ts](src/lib/supabase/client.ts)
- Never mix client and server clients

### Design Philosophy
- Clean, minimal UI with focus on functionality
- No unnecessary decorations or complex styling
- Simple borders and subtle hover states
- Small, unobtrusive connection handles
- White background with minimal grid pattern
- Smooth animations for interactive elements (recording, loading states)
- Mobile-first responsive design approach

### Audio Recording
Voice nodes use browser MediaRecorder API:
- Proper cleanup: stop all MediaStream tracks to release microphone
- Recording manager in [recording-manager.ts](src/lib/recording-manager.ts)
- Live transcription overlay during recording
- Modern animated recording UI with gradient animations

### Context Management
Chat nodes automatically detect and use context from ALL connected node types:
- Use `buildChatContext(chatNodeId, workflow)` to gather context
- Context includes text, transcripts, PDFs, images, webpages, mindmaps, templates, group chats
- No manual context wiring needed - edges define context flow

### Node Inline Editing
Most nodes support inline editing without properties panel:
- Text nodes: Click to edit with inline editor
- Voice nodes: Record directly in node with modern UI
- Image nodes: Upload via URL or file selection
- YouTube nodes: Paste URL for automatic transcript extraction
- Group nodes: Toggle group chat inline

## Important Implementation Details

### Workflow Store History
The store maintains undo/redo history (50 item limit):
- `pushHistory()` called automatically on destructive operations (addNode, deleteNodes)
- `undo()` / `redo()` restore previous states
- `canUndo()` / `canRedo()` check if operations available

### Group Nodes
Group nodes can contain other nodes and optionally enable group chat:
- `createGroup(nodeIds, position)` creates group with specified nodes
- `addNodesToGroup(groupId, nodeIds)` adds nodes to existing group
- `groupChatEnabled` flag controls unified chat over grouped content
- Groups automatically collect context from all grouped nodes

### Voice Recording Flow
1. User clicks record button → `RecordingManager.startRecording()`
2. Browser requests microphone access
3. Modern animated recording UI displays
4. Live transcription overlay shows interim results
5. User clicks stop → `RecordingManager.stopRecording()`
6. MediaStream tracks properly stopped to release microphone
7. Voice node created with audio blob and transcript

### Transcript Caching
YouTube transcripts cached in-memory ([transcript-cache.ts](src/lib/cache/transcript-cache.ts)):
- Cache key: `videoId`
- TTL: 1 hour
- Prevents duplicate API calls for same video
- Returns `cached: true` when serving from cache

### Sanitization for Persistence
Non-serializable data sanitized before saving:
- File objects → `undefined`
- Blob URLs (starting with `blob:`) → `undefined`
- Recursive sanitization of nested objects and arrays
- See [use-workflow-persistence.ts](src/hooks/use-workflow-persistence.ts:18-49)

### Multi-Provider Fallback Pattern
Screenshot API uses multi-provider fallback:
- Try providers in priority order
- Automatic failover if provider unavailable/rate-limited
- No single point of failure
- Same pattern can be applied to other external services

## Testing & Quality
- No test framework currently configured
- ESLint for code quality
- TypeScript strict mode enabled
- Build-time type checking (set to ignore in production builds)
