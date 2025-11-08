# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Remalt is a Next.js 15 AI workflow builder platform with a visual node-based editor powered by XYFlow (ReactFlow). Users create, visualize, and execute AI-powered workflows through drag-and-drop interfaces with 13 specialized node types organized into Media (pdf, voice, youtube, instagram, linkedin, image, webpage), Content (text, mindmap), AI (template, chat), and Structure (connector, group) categories.

## Common Development Commands

**IMPORTANT**: This project uses **pnpm** as the package manager. Always use `pnpm` commands, never `npm` or `yarn`.

```bash
# Development server with Turbopack
pnpm dev

# Production build with Turbopack
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Supabase Commands (requires Supabase CLI)
supabase db push              # Push local schema to remote database
supabase db pull              # Pull remote schema to local migrations
supabase functions deploy <name>  # Deploy edge function
supabase functions serve      # Run edge functions locally

# Run maintenance scripts
node scripts/cleanup-empty-workflows.ts    # Remove empty workflows
node scripts/inspect-workflows.ts          # Debug workflow data
```

**Note**: YouTube transcription uses Supadata API - no Python API needed

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15.5.4 with App Router and Turbopack
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (New York style)
- **Rich Text Editing**: Novel (Notion-style editor), BlockNote with shadcn styling
- **State Management**: Zustand with Immer middleware and persist
- **Workflow Canvas**: @xyflow/react v12
- **Authentication**: Supabase Auth with SSR support (Email + Google OAuth)
- **Database**: Supabase PostgreSQL with Row Level Security
- **AI Services**: Multi-LLM support via OpenRouter (OpenAI GPT-5/4.1, Google Gemini 2.5, Anthropic Claude 3.5, DeepSeek V3.2), Direct Gemini integration, Deepgram SDK
- **AI Provider Icons**: @lobehub/icons for official provider branding
- **Media Storage**: Supabase Storage for permanent file storage
- **Layout**: ELK.js for automatic graph layout

### Project Structure
```
src/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── chat/               # Multi-LLM streaming chat (Gemini + OpenRouter)
│   │   ├── transcribe/         # YouTube transcription
│   │   ├── voice/transcribe/   # Deepgram voice transcription
│   │   ├── image/analyze/      # Gemini Vision image analysis
│   │   ├── webpage/            # Web scraping (Jina AI + Google Docs support)
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

# AI Model Providers (at least one required)
GEMINI_API_KEY=                     # Google Gemini API key (for direct Gemini access)
OPENROUTER_API_KEY=                 # OpenRouter API key (for OpenAI, Anthropic, DeepSeek, etc.)

# OpenRouter Optional (for usage tracking)
NEXT_PUBLIC_SITE_URL=               # Your site URL for OpenRouter dashboard
NEXT_PUBLIC_APP_NAME=               # Your app name for OpenRouter dashboard

# Media Processing (Optional)
DEEPGRAM_API_KEY=                   # Voice transcription
SUPADATA_API_KEY=                   # YouTube transcription via Supadata API
APIFY_API_TOKEN=                    # Apify API token (Instagram + LinkedIn nodes)

# Web Scraping & Screenshots (Optional)
JINA_API_KEY=                       # Web scraping (20 RPM free, 200 RPM with key)
GOOGLE_DOCS_API_KEY=                # Google Docs API key (for fetching public Google Docs)
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

## Multi-LLM Support

### Overview
Remalt supports multiple AI providers through a unified chat interface:
- **Direct Integration**: Google Gemini (via `@google/generative-ai`)
- **OpenRouter Integration**: OpenAI, Anthropic Claude, DeepSeek, and 300+ models

### Model Registry
All available models are defined in [model-registry.ts](src/lib/models/model-registry.ts):
- **Provider branding**: Official icons and colors from @lobehub/icons
- **Model metadata**: Context windows, pricing, capabilities, categories
- **15+ models**: GPT-5, GPT-4.1, Gemini 2.5 Pro/Flash, Claude 3.5 Sonnet, DeepSeek V3.2, etc.

### Model Selection
Chat nodes feature a branded model selector dialog:
- Provider grouping with official icons and colors
- Searchable/filterable model list
- Model cards showing context window, pricing, and capabilities
- Recommended badges for flagship models

### Provider Routing
The chat API ([chat/route.ts](src/app/api/chat/route.ts)) automatically routes requests:
```typescript
if (provider === 'openrouter') {
  // OpenRouter client (OpenAI SDK with custom baseURL)
  // Supports: OpenAI, Anthropic, DeepSeek, Meta, etc.
} else {
  // Direct Gemini client
  // Optimized for Google models
}
```

### Backward Compatibility
- Existing workflows with `'gemini-flash-latest'` automatically migrate to `'google/gemini-2.5-flash'`
- Legacy model mapping in [model-registry.ts](src/lib/models/model-registry.ts)
- Default provider: Gemini (for users without OpenRouter key)

## API Routes

### `/api/chat` (POST)
Multi-LLM streaming chat endpoint with provider routing:
- **Authentication**: Required
- Accepts: `messages`, `model`, `provider`, context from all 13 node types
- Returns: Server-sent events (SSE) stream with incremental responses
- Context builder assembles data from connected nodes

### `/api/transcribe` (POST)
YouTube transcription via Supadata API:
- **Authentication**: Required
- Accepts: `url` (YouTube video URL)
- Returns: `transcript`, `method` (supadata), `videoId`, `cached`, `elapsed_ms`
- In-memory caching prevents duplicate API calls (24hr TTL)
- Uses Supadata API with native transcript extraction (no Python backend required)
- **Requires**: `SUPADATA_API_KEY` environment variable

### `/api/voice/transcribe` (POST)
Voice transcription via Deepgram SDK:
- Accepts: `audio` (base64 or URL), `format` (wav/mp3/etc.)
- Returns: `transcript`, `confidence`, `words` (with timestamps)

### `/api/image/analyze` (POST)
Image analysis via Gemini Vision:
- Accepts: `imageUrl` or `imageData` (base64)
- Returns: `description`, `ocrText`, `objects`, `tags`

### `/api/webpage/analyze` (POST)
Web scraping via Jina AI Reader with Google Docs support:
- Accepts: `url` (regular webpage or Google Docs URL)
- **Google Docs Support**: Automatically detects Google Docs URLs and fetches content using export API
- Uses Jina AI Reader for regular webpages with automatic fallback to direct HTML fetch
- Returns: `pageTitle`, `pageContent` (markdown), `summary`, `keyPoints`, `metadata`
- **Google Docs Requirements**: Document must be publicly shared ("Anyone with the link" can view)
- **Optional**: `GOOGLE_DOCS_API_KEY` for metadata verification (uses hardcoded key as fallback)

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
Instagram post/reel/story data fetching via Apify Instagram Scraper:
- Accepts: `url` (Instagram post/reel/story URL)
- Uses `apify/instagram-scraper` actor via run-sync-get-dataset-items API
- Auto-detects content type (posts, reels, stories) from URL pattern
- Supports carousel posts (Sidecar type) with multiple images
- Returns: `reelCode`, `caption`, `author`, `likes`, `views`, `comments`, `videoUrl`, `images[]`, `postType`, `isStory`, `takenAt`, `expiresAt`
- **Note**: Stories expire after 24 hours and require public access
- **Requires**: `APIFY_API_TOKEN` environment variable
- **Processing**: Uses `/lib/instagram-processor.ts` for Gemini Vision/Flash analysis of images/videos

### `/api/instagram/dual-transcribe` (POST)
**NEW**: Dual transcription comparing Google Gemini and Deepgram for Instagram videos:
- **Purpose**: Get transcriptions from BOTH Gemini and Deepgram, compare results
- Accepts: `url` (Instagram video/reel URL only - images not supported)
- Returns comprehensive JSON with:
  - `gemini`: Full multimodal analysis (transcript + visual description + summary)
  - `deepgram`: Pure audio transcription with word-level timestamps and confidence scores
  - `comparison`: Side-by-side metrics (word count, length, similarity analysis)
  - `metadata`: Processing times, video size, timestamps
- **Use Case**: Compare AI transcription quality, get both context-aware and pure audio transcripts
- **Requires**: `APIFY_API_TOKEN`, `GEMINI_API_KEY`, `DEEPGRAM_API_KEY`
- **Processing**: Parallel processing (Gemini + Deepgram run simultaneously)
- **Max Duration**: 60 seconds
- **Test Script**: `node test-dual-transcribe.js <instagram-url>`

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

### Error Handling & Security
- **Supabase RLS**: Row-Level Security policies enforce data access control at the database level
- **Auth Middleware**: All non-public routes protected via [middleware.ts](src/middleware.ts)
- **Type Safety**: Strict TypeScript mode prevents many runtime errors
- **API Authentication**: All API routes check authentication status using `createServerClient()`

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
- Text nodes: Novel editor (Notion-style) with slash commands, markdown shortcuts, and AI-powered features
- Voice nodes: Record directly in node with modern UI and live transcription
- Image nodes: Upload via URL or file selection with Uploadcare CDN storage
- YouTube nodes: Paste URL for automatic transcript extraction
- Instagram nodes: Paste URL for automatic reel data extraction
- PDF nodes: Upload via Uploadcare for permanent storage
- Group nodes: Toggle group chat inline

### Rich Text Editing with Novel
Text nodes use Novel editor for Notion-style editing experience:
- **Slash Commands**: Type `/` to access formatting and content blocks
- **Markdown Shortcuts**: Support for standard markdown syntax (**, *, #, etc.)
- **Inline Formatting**: Bold, italic, code, links via keyboard shortcuts
- **Block Types**: Headings, lists, code blocks, quotes
- **AI Instructions**: Every node supports optional AI instructions for context-aware processing

### Critical Development Guidelines
When making changes to the codebase, always follow these patterns:

#### Always Fix Root Causes
- NEVER apply temporary fixes or patches - always fix the root cause
- Treat every fix as if it's going directly to production
- Search for latest information before implementing features (don't assume)
- Write super clean, minimal code without over-engineering

#### When Adding New Node Types
Follow this exact sequence:
1. Define the node type and data interface in [workflow.ts](src/types/workflow.ts) using discriminated unions
2. Add default data factory in `createDefaultNodeData()` in [workflow-store.ts](src/lib/stores/workflow-store.ts)
3. Register node metadata in [node-registry.ts](src/lib/workflow/node-registry.ts) (label, icon, color, dimensions)
4. Create the React component in `src/components/workflow/nodes/`
5. Export the component in [index.ts](src/components/workflow/nodes/index.ts)
6. Add context extraction logic in [context-builder.ts](src/lib/workflow/context-builder.ts) if the node provides data to chat nodes

#### Supabase Client Pattern
CRITICAL: Always use the correct Supabase client:
```typescript
// ❌ WRONG - Never mix clients
import { createClient } from '@/lib/supabase/server' // In a client component

// ✅ CORRECT - Server Components & Route Handlers
import { createServerClient } from '@/lib/supabase/server'
const supabase = await createServerClient()

// ✅ CORRECT - Client Components
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

#### API Route Pattern
All API routes should follow this structure:
```typescript
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Your logic here
}
```

#### State Updates Pattern
Always use Immer-based updates in the workflow store:
```typescript
// ✅ CORRECT - Immer automatically handles immutability
updateNodeData: (nodeId, newData) =>
  set((state) => {
    const node = state.workflow?.nodes.find(n => n.id === nodeId)
    if (node) {
      node.data = { ...node.data, ...newData }
    }
  }),
```

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
YouTube transcripts cached in Next.js:
- **In-memory cache**: ([transcript-cache.ts](src/lib/cache/transcript-cache.ts)) with 24hr TTL
- Cache key: `videoId`
- Prevents duplicate API calls to Supadata for same video
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

### Supadata Transcription Service
YouTube transcription powered by Supadata API:
- **Service Location**: [supadata.ts](src/lib/api/supadata.ts)
- **API Endpoint**: `https://api.supadata.ai/v1/transcript`
- **Features**: Native transcript extraction, multi-language support, fast response times
- **No Backend Required**: Direct API integration, no Python server needed
- **Response Format**: Returns `content` field with full transcript text
- **Error Handling**: Graceful fallback with detailed error messages

### Google Docs Integration
Fetch content from public Google Docs:
- **Service Location**: [google-docs.ts](src/lib/api/google-docs.ts)
- **Export URL Format**: `https://docs.google.com/document/d/{ID}/export?format=txt`
- **Features**: Automatic document ID extraction, HTML to plain text conversion, metadata fetching
- **Authentication**: Uses export URL (no auth for public docs) + optional Drive API for metadata
- **Supported Formats**: Plain text (txt) with automatic fallback to HTML
- **Requirements**: Document must be publicly shared with "Anyone with the link" permissions
- **API Key**: Optional `GOOGLE_DOCS_API_KEY` for Drive API metadata (uses hardcoded fallback)
- **Important**: Google Docs API requires OAuth for private documents; this integration only works with public documents

### Uploadcare Media Storage
Permanent media storage handled via Uploadcare CDN:
- **Service Location**: [upload-service.ts](src/lib/uploadcare/upload-service.ts)
- **Upload Methods**: From URL (`uploadFromUrl`) with automatic status polling
- **Storage Options**: Temporary (0), Permanent (1), Auto
- **Features**: Duplicate detection, metadata support, project-specific CDN URLs
- **Used By**: PDF nodes, Image nodes, Instagram video storage
- **CDN Format**: `https://ucarecdn.com/{uuid}/{filename}`
- **Upload Flow**: Upload from URL → Poll status → Get permanent CDN URL

### Google Workspace Integration
The platform supports fetching content from Google Workspace documents:
- **Service Location**: [google-workspace.ts](src/lib/api/google-workspace.ts)
- **Supported Services**: Google Docs, Google Sheets, Google Slides
- **Features**: Automatic document ID extraction, content export, metadata fetching
- **Requirements**: Documents must be publicly shared ("Anyone with the link" can view)
- **API Key**: Optional `GOOGLE_DOCS_API_KEY` for enhanced metadata access
- **Export Formats**:
  - Google Docs → Plain text (txt)
  - Google Sheets → CSV
  - Google Slides → Plain text
- **Integration**: Used by Webpage nodes when Google Workspace URLs are detected
- **Test Script**: `node test-google-workspace.mjs <google-docs-url>`

## Next.js Configuration
Key configuration in [next.config.ts](next.config.ts):
- **Image Domains**: YouTube thumbnails (`img.youtube.com`, `i.ytimg.com`), Microlink, Supabase Storage CDN
- **Transpiled Packages**: `@deepgram/sdk` for WebSocket support
- **Webpack Config**: Excludes Node.js-only modules (`ws`, `utf-8-validate`, `bufferutil`) from browser bundle
- **Build Settings**: ESLint and TypeScript errors ignored during builds (`ignoreDuringBuilds: true`)

## Supabase Edge Functions

The project includes Supabase Edge Functions for serverless operations:
- **Location**: `supabase/functions/`
- **Functions**:
  - `parse-pdf`: Server-side PDF parsing (alternative to client-side parsing)
  - `analyze-instagram`: Instagram content analysis
- **Deployment**: Deploy with `supabase functions deploy <function-name>`
- **Local Testing**: Run locally with `supabase functions serve`

## Database Migrations & Scripts

The `scripts/` directory contains utilities for database management:
- **Schema Management**:
  - `apply-schema.js` / `apply-schema.mjs` - Apply schema changes
  - `check-schema.js` / `check-schema.mjs` - Verify schema state
- **Data Migrations**:
  - `apply-pdf-migration.js` - Migrate PDF node data
  - `apply-notes-migration.mjs` - Migrate notes to TipTap format
  - `migrate-notes-to-tiptap.mjs` - Convert BlockNote to TipTap
- **Maintenance**:
  - `cleanup-empty-workflows.ts` - Remove empty workflows
  - `fix-missing-profiles.mjs` - Create missing user profiles
  - `inspect-workflows.ts` - Debug workflow data

## Testing & Quality
- No test framework currently configured
- ESLint for code quality
- TypeScript strict mode enabled
- Build-time type checking (set to ignore in production builds via next.config.ts)

### Manual Testing Scripts
The repository includes test scripts for API endpoints:
- **`test-dual-transcribe.js`**: Test Instagram dual transcription (Gemini vs Deepgram comparison)
- **`test-google-docs.mjs`**: Test Google Docs content fetching
- **`test-google-workspace.mjs`**: Test Google Workspace integration (Docs, Sheets, Slides)

### Example Workflows
The `examples/` directory contains sample workflow configurations to demonstrate platform capabilities and serve as templates for common use cases.

## Important UI/UX Patterns

### Keyboard Shortcuts
Global shortcuts managed via [use-keyboard-shortcuts.ts](src/hooks/use-keyboard-shortcuts.ts):
- `Cmd/Ctrl+S`: Manual save trigger
- `Cmd/Ctrl+Z`: Undo workflow changes
- `Cmd/Ctrl+Shift+Z`: Redo workflow changes
- `Cmd/Ctrl+C`: Copy selected nodes
- `Cmd/Ctrl+V`: Paste copied nodes
- `Delete/Backspace`: Delete selected nodes
- Access shortcuts modal via `?` key

### Quick Add Menu
Canvas interaction for rapid node creation:
- Right-click on canvas → Quick Add Menu ([QuickAddMenu.tsx](src/components/workflow/QuickAddMenu.tsx))
- Categorized by node type (Media, Content, AI, Structure)
- Visual icons and descriptions for each node type
- Instant node placement at cursor position

### Context Menus
Three context menu types:
1. **Node Context Menu** ([NodeContextMenu.tsx](src/components/workflow/NodeContextMenu.tsx)): Right-click node for duplicate, delete, copy
2. **Panel Context Menu** ([PanelContextMenu.tsx](src/components/workflow/PanelContextMenu.tsx)): Right-click canvas for add, paste, layout
3. **Selection Context Menu** ([SelectionContextMenu.tsx](src/components/workflow/SelectionContextMenu.tsx)): Multi-select actions

### Save Status Indicator
Real-time save feedback via [SaveStatusIndicator.tsx](src/components/workflow/SaveStatusIndicator.tsx):
- Shows "Saving...", "Saved", or error states
- Displays last saved timestamp
- Updates automatically with auto-save
- Manual trigger via Cmd/Ctrl+S
