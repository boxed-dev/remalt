# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Remalt is a Next.js 15 AI workflow builder platform with both a marketing website and a fully functional workflow editor. The application allows users to create, visualize, and execute AI-powered workflows using a drag-and-drop interface powered by XYFlow (ReactFlow).

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
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with CSS variables
- **UI Components**: shadcn/ui (New York style)
- **Icons**: Lucide React
- **Development**: Turbopack for fast builds
- **State Management**: Zustand with Immer middleware
- **Workflow Canvas**: @xyflow/react (v12)
- **Authentication**: Supabase Auth (Email + Google OAuth, SSR-ready)
- **Database**: Supabase PostgreSQL with Row Level Security
- **AI Integration**: Google Generative AI (Gemini 2.5 Flash)
- **Transcription**: Deepgram SDK + Python API (youtube_transcript_api)
- **Layout**: ELK.js for automatic graph layout

### Project Structure
```
remalt/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with Inter font
│   │   ├── page.tsx            # Marketing homepage
│   │   ├── flows/
│   │   │   └── page.tsx        # Flow library with search/filtering
│   │   │   └── [id]/page.tsx   # Individual workflow editor
│   │   ├── account/page.tsx    # User account management
│   │   ├── pricing/page.tsx    # Pricing page
│   │   ├── auth/               # Authentication pages
│   │   │   ├── signin/         # Email/Google sign in
│   │   │   ├── signup/         # User registration
│   │   │   ├── signout/        # Sign out handler
│   │   │   └── callback/       # OAuth callback handler
│   │   └── api/
│   │       ├── chat/route.ts          # Gemini AI chat streaming API
│   │       ├── transcribe/route.ts    # YouTube transcription API
│   │       ├── voice/transcribe/      # Voice transcription (Deepgram)
│   │       ├── image/analyze/         # Image analysis (Gemini Vision)
│   │       ├── webpage/analyze/       # Webpage scraping
│   │       └── pdf/parse/             # PDF parsing
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Marketing page sections
│   │   ├── flows/              # Flow library components
│   │   └── workflow/           # Workflow canvas and node components
│   ├── lib/
│   │   ├── stores/
│   │   │   └── workflow-store.ts    # Zustand store for workflow state
│   │   ├── workflow/
│   │   │   ├── node-registry.ts     # Node type metadata and helpers
│   │   │   └── context-builder.ts   # Build context for chat nodes
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser client (client components)
│   │   │   ├── server.ts            # Server client (RSC, Route Handlers)
│   │   │   ├── middleware.ts        # Auth middleware utilities
│   │   │   └── workflows.ts         # Workflow CRUD operations
│   │   ├── cache/
│   │   │   └── transcript-cache.ts  # In-memory transcript caching
│   │   ├── mock-data/
│   │   │   └── flows.ts             # Mock workflow data
│   │   └── utils.ts            # Utility functions (cn for className merging)
│   ├── hooks/
│   │   ├── use-workflow-persistence.ts  # Auto-save hook with debouncing
│   │   ├── use-current-user.ts          # Get authenticated user
│   │   └── use-keyboard-shortcuts.ts    # Global keyboard shortcuts (Cmd+S)
│   ├── types/
│   │   └── workflow.ts         # Complete TypeScript definitions for workflows
│   └── middleware.ts           # Next.js middleware for auth protection
supabase/
└── schema.sql                  # Database schema with RLS policies
```

### Workflow System Architecture

**Node Types**: The workflow system supports 11 node types organized into 4 categories:

**Media Nodes** (Input/Processing):
- `pdf` - Upload/link PDF documents, automatic text parsing into searchable segments
- `voice` - Record audio directly in browser OR upload audio file/URL, automatic transcription
- `youtube` - Extract transcripts from YouTube videos using Deepgram or native captions
- `image` - Upload images with AI visual analysis and OCR for text extraction
- `webpage` - Scrape web pages by URL to extract content, metadata, and images

**Content Nodes** (Creation):
- `text` - Rich text editor with inline editing, supports markdown/HTML
- `mindmap` - Brainstorming concept bubbles with notes and tags for ideation

**AI Nodes** (Generation):
- `template` - AI content generation using templates (YouTube scripts, ad copy, captions, blog posts)
- `chat` - Conversational AI assistant with context awareness, streaming responses, markdown support

**Structure Nodes** (Organization):
- `connector` - Define relationships between nodes (workflow, reference, dependency, custom)
- `group` - Group multiple nodes with optional unified chat over all grouped content

**State Management**: Zustand store (`workflow-store.ts`) manages:
- Workflow CRUD operations (create, load, update, clear)
- Node operations (add, update, delete, duplicate, move)
- Edge operations (add, update, delete)
- Selection state (nodes and edges)
- Clipboard (copy/paste nodes)
- Viewport state (pan/zoom)
- Group operations (create, add nodes, remove nodes, toggle collapse)

**Node Functionality Details**:

*PDF Node*:
- Click to upload or paste PDF URL
- Automatic parsing into text segments with headings
- Shows parsing status (idle/parsing/success/error)
- Displays segment count when parsed

*Voice Node*:
- **Record Mode**: Click to record → browser microphone access → modern animated recording UI → stop to save
- **Upload Mode**: Choose audio file from device OR paste audio URL
- Audio player with playback controls
- Automatic transcription with status indicators
- Smooth gradient animations during recording

*YouTube Node*:
- Paste any YouTube URL (supports multiple formats)
- Automatic transcript extraction via Deepgram or native captions
- Shows video thumbnail and title
- Status indicators (loading/success/unavailable/error)
- Transcript caching for performance (re-uses existing transcripts)
- Displays transcript method and character count when ready

*Image Node*:
- Upload image via URL or file selection
- Image preview with caption support
- AI analysis status (analyzing/success/error)
- OCR text extraction from images

*Text Node*:
- Inline click-to-edit interface
- No target handle (output only)
- Supports rich text with formatting
- Keyboard shortcuts (Enter to save, Escape to cancel)

*Mind Map Node*:
- Edit concept name and notes
- Support for tags/labels
- Visual organization of ideas
- Connect related concepts

*Template Node*:
- Select from predefined templates (YouTube Script, Ad Copy, Captions, Blog Post, Custom)
- Shows generated content preview
- Generation status indicator
- AI-powered content creation

*Webpage Node*:
- Enter any webpage URL
- Automatic scraping of page content
- Extracts title, metadata, text, and images
- Shows scraping status and content length

*Chat Node*:
- Full AI chat interface with streaming responses
- Automatically detects and uses context from connected nodes
- Markdown rendering with syntax highlighting
- Math equations support (KaTeX)
- Code blocks with copy functionality
- Shows context source count

*Connector Node*:
- Define relationship type (Workflow, Reference, Dependency, Custom)
- Click to change relationship type
- Visualizes node connections

*Group Node*:
- Group multiple nodes together
- Toggle group chat (enable/disable)
- Shows grouped node count
- Unified context from all grouped nodes when chat is enabled

**Context System**:
- Chat nodes automatically receive context from connected nodes via edges
- Text → raw text content
- YouTube → video transcripts (Deepgram or captions)
- Voice → transcribed audio text
- PDF → parsed document segments with headings
- Image → OCR text + AI analysis + captions
- Webpage → scraped page content + metadata
- Mind Map → concept notes and tags
- Template → generated content
- Chat → previous conversation history
- Group → aggregated context from all grouped nodes
- Context builder (`context-builder.ts`) assembles all incoming context
- Chat API streams responses with full context awareness

### API Routes

**`/api/chat` (POST)**: Streaming AI chat endpoint
- Accepts: `messages`, `textContext`, `youtubeTranscripts`, `voiceTranscripts`, `pdfDocuments`, `images`, `webpages`, `mindMaps`, `templates`, `groupChats`
- Uses Gemini 2.5 Flash model
- Returns: Server-sent events (SSE) stream with incremental responses
- Automatically builds context from ALL connected node types (11 types supported)

**`/api/transcribe` (POST)**: YouTube transcription endpoint
- Accepts: `url` (YouTube video URL)
- Returns: `transcript`, `method`, `language`, `videoId`, `cached`, `elapsed_ms`
- Caching layer for performance
- Calls Python API (`PYTHON_API_URL` env var, default: http://localhost:5001)

**`/api/voice/transcribe` (POST)**: Voice transcription endpoint
- Accepts: `audio` (base64 or URL), `format` (wav/mp3/etc.)
- Uses Deepgram SDK for high-accuracy transcription
- Returns: `transcript`, `confidence`, `words` (with timestamps)

**`/api/image/analyze` (POST)**: Image analysis endpoint
- Accepts: `imageUrl` or `imageData` (base64)
- Uses Gemini Vision for AI-powered analysis
- Returns: `description`, `ocrText`, `objects`, `tags`

**`/api/webpage/analyze` (POST)**: Webpage scraping endpoint
- Accepts: `url`
- Returns: `title`, `content`, `metadata`, `images`, `links`

**`/api/pdf/parse` (POST)**: PDF parsing endpoint
- Accepts: `pdfUrl` or `pdfData`
- Returns: `segments` (array of text chunks with headings)

### Environment Variables
```bash
# Authentication & Database (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anonymous key

# AI Services (REQUIRED)
GEMINI_API_KEY=                     # Google Gemini API key for AI chat/vision

# Transcription Services (OPTIONAL)
DEEPGRAM_API_KEY=                   # Deepgram API key for voice transcription
PYTHON_API_URL=                     # Python API URL, defaults to http://localhost:5001
```

### Path Aliases
- `@/*` → `./src/*`
- `@/components` → UI and layout components
- `@/lib` → Utility functions and helpers
- `@/types` → TypeScript type definitions

### Key Patterns

**Authentication Flow**:
- Use `createServerClient()` from `@/lib/supabase/server` in Server Components and Route Handlers
- Use `createClient()` from `@/lib/supabase/client` in Client Components
- Middleware (`src/middleware.ts`) protects routes by checking auth status
- User profile automatically created via database trigger on signup
- OAuth providers (Google) configured in Supabase dashboard

**Workflow Persistence**:
- `useWorkflowPersistence` hook handles auto-save with 2-second debouncing
- Manual save triggered by Cmd/Ctrl+S via `use-keyboard-shortcuts` hook
- All workflow operations go through `src/lib/supabase/workflows.ts`
- Upsert pattern used to handle both create and update seamlessly
- Row Level Security (RLS) ensures users can only access their own workflows

**Node Data Management**: Each node type has strongly-typed data interfaces defined in `workflow.ts`. The workflow store uses Immer middleware for immutable updates.

**Node Registry**: `node-registry.ts` provides metadata for all node types including labels, descriptions, colors, and default dimensions. Use `getNodeMetadata(type)` to access.

**Type Safety**: All workflow operations are fully typed. The `NodeData` discriminated union ensures type safety when accessing node-specific data.

**Context Building**: When a chat node sends a message, use `buildChatContext(chatNodeId, workflow)` to gather all text content and transcripts from connected nodes.

**ID Generation**: Use `nanoid()` for workflow, node, and edge IDs. Use `crypto.randomUUID()` for Supabase-generated UUIDs (workflows table).

**Design Philosophy**:
- Clean, minimal UI with focus on functionality
- No unnecessary decorations or complex styling
- Simple borders and subtle hover states
- Small, unobtrusive connection handles
- White background with minimal grid pattern
- Smooth animations for interactive elements (recording, loading states)
- Mobile-first responsive design approach

## Development Notes

### Database & Authentication
- **Supabase Setup**: Run `supabase/schema.sql` in SQL Editor to create tables and RLS policies
- **Auto-save System**: 2-second debounce prevents excessive writes, status shown in UI
- **RLS Policies**: Users can only read/write their own workflows via `auth.uid() = user_id` checks
- **Profile Creation**: Automatic via database trigger when new user signs up
- **Protected Routes**: Middleware redirects unauthenticated users to `/auth/signin`

### Code Quality & Architecture
- No test framework is currently configured
- Uses ESLint for code quality
- TypeScript configured with strict mode and bundler module resolution
- Components follow shadcn/ui patterns with variant props
- Make things perfect always and with mobile first approach
- Clean minimal design - no clutter, no unnecessary visual elements

### Node Implementation Details
- All 11 node types are fully functional with interactive editing
- Voice recording uses browser MediaRecorder API with proper cleanup
- MediaStream tracks must be properly stopped to release microphone
- Smooth animations using CSS transitions and Tailwind utilities
- No properties panel - all editing happens inline within nodes
- Each node type has dedicated API routes for processing (transcription, analysis, etc.)

### Python API Integration
- YouTube transcription requires Python API running on port 5001
- Install dependencies: `pip install -r requirements.txt`
- Start API: `python transcript_api.py 5001`
- Handles both Deepgram and native YouTube captions
- In-memory caching prevents duplicate API calls for same videos
