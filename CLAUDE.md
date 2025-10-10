# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Remalt is a Next.js 15 AI workflow builder platform with a visual node-based editor powered by XYFlow (ReactFlow). Users create, visualize, and execute AI-powered workflows through drag-and-drop interfaces with 13 specialized node types organized into Media (pdf, voice, youtube, instagram, linkedin, image, webpage), Content (text, mindmap), AI (template, chat), and Structure (connector, group) categories.

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
python3 transcript_api.py
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
│   │   ├── pdf/parse/          # PDF document parsing
│   │   ├── instagram/reel/     # Instagram reel data fetching
│   │   ├── linkedin/post/      # LinkedIn post data fetching (Apify)
│   │   ├── linkedin/analyze/   # LinkedIn post AI analysis (Gemini)
│   │   └── templates/generate/ # Template content generation
│   ├── flows/                  # Flow library and workflow editor
│   ├── auth/                   # Authentication pages (signin/signup/callback)
│   └── account/                # User account management
├── components/
│   ├── workflow/               # Workflow canvas, toolbar, sidebar
│   │   ├── nodes/              # 13 specialized node implementations
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
APIFY_API_KEY=                      # LinkedIn post fetching (required for LinkedIn nodes)
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
13 specialized node types defined in [workflow.ts](src/types/workflow.ts):

**Media Nodes**: `pdf`, `voice`, `youtube`, `instagram`, `linkedin`, `image`, `webpage` - Process and extract content from various sources
**Content Nodes**: `text`, `mindmap` - Create and organize textual content
**AI Nodes**: `template`, `chat` - Generate AI-powered content and conversations
**Structure Nodes**: `connector`, `group` - Organize and relate other nodes

Each node type has:
- Strongly-typed data interface (discriminated union `NodeData`)
- Default data factory in `createDefaultNodeData()` ([workflow-store.ts](src/lib/stores/workflow-store.ts))
- Metadata in [node-registry.ts](src/lib/workflow/node-registry.ts) (labels, colors, dimensions)
- React component in `src/components/workflow/nodes/`

### Context Building for Chat Nodes
Chat nodes automatically receive context from connected nodes via [context-builder.ts](src/lib/workflow/context-builder.ts):

```typescript
buildChatContext(chatNodeId, workflow) → ChatContext {
  textContext, youtubeTranscripts, voiceTranscripts, pdfDocuments,
  images, webpages, instagramReels, mindMaps, templates, groupChats
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
- Middleware excludes API routes, static files, and images from auth checks
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
- **Authentication**: Required
- Accepts: `messages`, context from all 13 node types
- Returns: Server-sent events (SSE) stream with incremental responses
- Context builder assembles data from connected nodes

### `/api/transcribe` (POST)
YouTube transcription via Python API:
- Accepts: `url` (YouTube video URL)
- Returns: `transcript`, `method`, `language`, `videoId`, `cached`, `elapsed_ms`
- In-memory caching prevents duplicate API calls (24hr TTL in Python, 24hr in Next.js)
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

### `/api/instagram/reel` (POST)
Instagram post/reel/story data fetching via Apify:
- Accepts: `url` (Instagram post/reel/story URL)
- Auto-detects content type (posts, reels, stories) from URL pattern
- Supports carousel posts (Sidecar type) with multiple images
- Returns: `reelCode`, `caption`, `author`, `likes`, `views`, `comments`, `videoUrl`, `images[]`, `postType`
- **Note**: Stories expire after 24 hours and require public access or authentication

### `/api/linkedin/post` (POST)
LinkedIn post data fetching via Apify:
- Accepts: `url` (LinkedIn post URL)
- Uses Apify actor: `supreme_coder/linkedin-post`
- Returns: `postId`, `content`, `imageUrl`, `videoUrl`, `author`, `reactions`, `comments`, `reposts`, `postType`
- **Requires**: `APIFY_API_KEY` environment variable

### `/api/linkedin/analyze` (POST)
LinkedIn post AI analysis via Gemini:
- Accepts: `content`, `imageUrl` (optional)
- Returns: `summary`, `keyPoints`, `ocrText`, `fullAnalysis`
- Provides detailed professional post analysis including tone, style, target audience, and CTAs

### `/api/templates/generate` (POST)
Template content generation:
- Accepts: `templateType`, `customPrompt`, `context`
- Uses Gemini AI to generate template-based content
- Returns: `generatedContent`

## Development Practices

### ID Generation
Use `crypto.randomUUID()` for all IDs (workflows, nodes, edges). Consistent with Supabase-generated UUIDs.

### Type Safety
All workflow operations are fully typed. The `NodeData` discriminated union ensures type safety when accessing node-specific data.

### Node Implementation
When implementing or modifying nodes:
1. Update type definition in [workflow.ts](src/types/workflow.ts)
2. Add default data factory in `createDefaultNodeData()` ([workflow-store.ts](src/lib/stores/workflow-store.ts))
3. Register metadata in [node-registry.ts](src/lib/workflow/node-registry.ts)
4. Create React component in `src/components/workflow/nodes/`
5. Export from [index.ts](src/components/workflow/nodes/index.ts)
6. Add context extraction logic in [context-builder.ts](src/lib/workflow/context-builder.ts)

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
Voice nodes use browser MediaRecorder API with Deepgram live transcription:
- Proper cleanup: stop all MediaStream tracks to release microphone
- Recording manager in [recording-manager.ts](src/lib/recording-manager.ts)
- Live transcription overlay during recording via Deepgram WebSocket
- Modern animated recording UI with gradient animations
- Event-based architecture for state management

### Context Management
Chat nodes automatically detect and use context from ALL connected node types:
- Use `buildChatContext(chatNodeId, workflow)` to gather context
- Context includes text, transcripts, PDFs, images, webpages, Instagram reels, LinkedIn posts, mindmaps, templates, group chats
- No manual context wiring needed - edges define context flow

### Node Inline Editing
Most nodes support inline editing without properties panel:
- Text nodes: Click to edit with inline editor
- Voice nodes: Record directly in node with modern UI
- Image nodes: Upload via URL or file selection
- YouTube nodes: Paste URL for automatic transcript extraction
- Instagram nodes: Paste URL for automatic reel data extraction
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
3. Deepgram WebSocket connection established
4. Modern animated recording UI displays
5. Live transcription overlay shows interim results via WebSocket
6. User clicks stop → `RecordingManager.stopRecording()`
7. MediaStream tracks properly stopped to release microphone
8. Voice node created with audio blob and transcript

### Transcript Caching
YouTube transcripts cached at two levels:
- **Python API**: In-memory cache with 24hr TTL
- **Next.js**: In-memory cache ([transcript-cache.ts](src/lib/cache/transcript-cache.ts)) with 24hr TTL
- Cache key: `videoId`
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

### Python API Server
YouTube transcription requires Python API server:
- Flask server in [transcript_api.py](transcript_api.py)
- Dependencies: `flask`, `flask-cors`, `youtube-transcript-api`, `gunicorn`
- Install: `pip install -r requirements.txt`
- Run locally: `python3 transcript_api.py` (default port 5001)
- Endpoints: `/api/transcribe` (POST), `/health` (GET), `/api/clear-cache` (POST)
- Production mode auto-detected via `RAILWAY_ENVIRONMENT` env var

## Testing & Quality
- No test framework currently configured
- ESLint for code quality
- TypeScript strict mode enabled
- Build-time type checking (set to ignore in production builds via next.config.ts)
