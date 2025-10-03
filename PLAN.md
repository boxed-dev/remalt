# 🎯 COMPLETE WORKFLOW BUILDER - IMPLEMENTATION PLAN

## 📦 TECH STACK

### Core Dependencies
```json
{
  "dependencies": {
    // Workflow Core
    "@xyflow/react": "^12.0.0",
    "elkjs": "^0.9.0",
    "zustand": "^4.5.0",
    "immer": "^10.0.0",

    // AI & Chat
    "@google/generative-ai": "^0.21.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",

    // Rich Text Editor
    "@tiptap/react": "^2.1.0",
    "@tiptap/starter-kit": "^2.1.0",

    // YouTube
    "react-lite-youtube-embed": "^2.4.0",

    // Forms & Validation
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",

    // Utilities
    "nanoid": "^5.0.0",
    "date-fns": "^3.0.0",
    "use-debounce": "^10.0.0",
    "react-device-detect": "^2.2.3",
    "sonner": "^1.3.0",

    // Drag & Drop
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/utilities": "^3.2.2",

    // File Handling
    "react-dropzone": "^14.2.0"
  }
}
```

---

## 📁 COMPLETE FILE STRUCTURE

```
src/
├── app/
│   ├── flows/
│   │   ├── [id]/
│   │   │   └── page.tsx           # ⭐ Workflow Editor
│   │   └── new/
│   │       └── page.tsx
│   └── api/
│       ├── chat/
│       │   └── route.ts            # ⭐ Gemini AI endpoint
│       ├── workflows/
│       │   └── [id]/route.ts
│       └── youtube/
│           └── metadata/route.ts
│
├── components/
│   ├── workflow/
│   │   ├── WorkflowCanvas.tsx      # ⭐ Main canvas
│   │   ├── WorkflowToolbar.tsx
│   │   ├── WorkflowSidebar.tsx     # ⭐ Node palette
│   │   ├── WorkflowControls.tsx
│   │   ├── WorkflowMinimap.tsx
│   │   └── nodes/                  # ⭐ All node types
│   │       ├── TextNode.tsx        # Rich text
│   │       ├── YouTubeNode.tsx     # Video embed
│   │       ├── ChatNode.tsx        # AI chat
│   │       ├── TriggerNode.tsx
│   │       ├── ActionNode.tsx
│   │       ├── ConditionNode.tsx
│   │       ├── TransformNode.tsx
│   │       ├── DelayNode.tsx
│   │       ├── MergeNode.tsx
│   │       └── OutputNode.tsx
│   │
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   └── LinkedContent.tsx
│   │
│   ├── editor/
│   │   ├── RichTextEditor.tsx
│   │   └── EditorToolbar.tsx
│   │
│   ├── youtube/
│   │   ├── YouTubeEmbed.tsx
│   │   └── YouTubeUrlInput.tsx
│   │
│   └── mobile/
│       ├── MobileToolbar.tsx
│       └── MobileNodePalette.tsx
│
├── hooks/
│   ├── useWorkflow.ts              # ⭐ Main state
│   ├── useNodes.ts
│   ├── useEdges.ts
│   ├── useAutoLayout.ts
│   ├── useWorkflowExecution.ts
│   ├── useChat.ts
│   ├── useYouTube.ts
│   ├── usePersistence.ts
│   └── useMobileGestures.ts
│
├── lib/
│   ├── workflow/
│   │   ├── execution-engine.ts
│   │   ├── node-registry.ts
│   │   ├── validators.ts
│   │   └── context-builder.ts
│   │
│   ├── ai/
│   │   ├── gemini-client.ts
│   │   └── chat-handler.ts
│   │
│   ├── youtube/
│   │   ├── url-parser.ts
│   │   └── metadata-fetcher.ts
│   │
│   ├── stores/
│   │   └── workflow-store.ts       # ⭐ Zustand store
│   │
│   └── storage/
│       ├── local-storage.ts
│       └── api-client.ts
│
└── types/
    ├── workflow.ts                 # ⭐ Main types
    ├── nodes.ts
    ├── edges.ts
    └── execution.ts
```

---

## 🎯 6-WEEK IMPLEMENTATION ROADMAP

### **Week 1: Foundation**

#### Day 1-2: Setup
- [x] Install dependencies (React Flow, Zustand, ELK)
- [ ] Install AI dependencies (Gemini SDK, react-markdown)
- [ ] Install UI dependencies (TipTap, shadcn components)

#### Day 3-4: Core Setup
- [ ] Create TypeScript types (`types/workflow.ts`)
- [ ] Set up Zustand store (`lib/stores/workflow-store.ts`)
- [ ] Create WorkflowCanvas component
- [ ] Implement React Flow basics (zoom, pan, background)

#### Day 5-7: Node Palette
- [ ] Create WorkflowSidebar component
- [ ] Implement drag-and-drop from palette
- [ ] Create node registry system
- [ ] Test basic node creation

---

### **Week 2-3: Node Types**

#### Day 8-10: Text Node
- [ ] Install TipTap editor
- [ ] Create TextNode component
- [ ] Implement rich text editing
- [ ] Add formatting toolbar
- [ ] Save/load text content

#### Day 11-13: YouTube Node
- [ ] Create YouTubeNode component
- [ ] Implement URL parser (extract video ID)
- [ ] Fetch YouTube metadata (oEmbed API)
- [ ] Display video thumbnail/player
- [ ] Handle URL changes

#### Day 14-18: Chat Node
- [ ] Create ChatNode component
- [ ] Build ChatWindow UI
- [ ] Implement message list
- [ ] Create ChatInput component
- [ ] Show linked content
- [ ] Handle node connections
- [ ] Test chat flow

#### Day 19-21: Other Nodes
- [ ] TriggerNode (workflow start)
- [ ] ActionNode (generic actions)
- [ ] ConditionNode (if/else)
- [ ] TransformNode (data transform)

---

### **Week 4: AI Integration**

#### Day 22-24: Gemini Setup
- [ ] Get Gemini API key
- [ ] Create `/api/chat` route
- [ ] Install Gemini SDK
- [ ] Test basic chat

#### Day 25-26: YouTube Context
- [ ] Implement YouTube URL passing to Gemini
- [ ] Test video understanding
- [ ] Handle multiple videos

#### Day 27-28: Context Building
- [ ] Implement `buildContextFromLinkedNodes()`
- [ ] Collect text from Text nodes
- [ ] Collect video URLs from YouTube nodes
- [ ] Test full context flow

---

### **Week 5: Persistence**

#### Day 29-31: Local Storage
- [ ] Implement `usePersistence` hook
- [ ] Auto-save to localStorage
- [ ] Load saved workflows
- [ ] Handle errors

#### Day 32-33: Database (Optional)
- [ ] Create database schema
- [ ] Implement API endpoints
- [ ] Sync localStorage to DB
- [ ] Test persistence

#### Day 34-35: Workflow Management
- [ ] List workflows
- [ ] Create new workflow
- [ ] Delete workflow
- [ ] Duplicate workflow

---

### **Week 6: Polish**

#### Day 36-38: Mobile Optimization
- [ ] Detect mobile devices
- [ ] Create MobileToolbar
- [ ] Implement touch gestures
- [ ] Test on mobile

#### Day 39-40: Auto-Layout
- [ ] Integrate ELK layout engine
- [ ] Implement auto-arrange button
- [ ] Test layout algorithms

#### Day 41-42: Features
- [ ] Undo/redo functionality
- [ ] Keyboard shortcuts
- [ ] Mini-map
- [ ] Zoom controls

---

## 🎨 KEY FEATURES

### 1. **Drag-and-Drop Workflow Builder**
- Visual canvas with React Flow
- Drag nodes from palette
- Connect nodes with edges
- Zoom, pan, minimap

### 2. **10 Node Types**
- **Text**: Rich text editor (TipTap)
- **YouTube**: Video URL input + player
- **Chat**: AI conversation interface
- **Trigger**: Workflow start point
- **Action**: Generic actions (API calls, etc.)
- **Condition**: If/else logic
- **Transform**: Data transformation
- **Delay**: Wait/pause
- **Merge**: Combine data streams
- **Output**: Final results

### 3. **AI Integration (Gemini)**
- Native YouTube URL support
- Understands video + audio content
- Builds context from linked nodes
- Streaming responses
- Markdown rendering

### 4. **Persistence**
- Auto-save to localStorage
- Optional cloud sync
- Load saved workflows
- Workflow versioning

### 5. **Mobile-First**
- Touch gestures (pinch-zoom)
- Bottom toolbar for mobile
- Responsive design
- Progressive enhancement

---

## 💻 CODE EXAMPLES

### Zustand Store
```typescript
// lib/stores/workflow-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface WorkflowStore {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<WorkflowNode>) => void;
  deleteNode: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowStore>()(
  immer((set) => ({
    nodes: [],
    edges: [],

    addNode: (node) => set((state) => {
      state.nodes.push(node);
    }),

    updateNode: (id, updates) => set((state) => {
      const node = state.nodes.find(n => n.id === id);
      if (node) Object.assign(node, updates);
    }),

    deleteNode: (id) => set((state) => {
      state.nodes = state.nodes.filter(n => n.id !== id);
      state.edges = state.edges.filter(
        e => e.source !== id && e.target !== id
      );
    }),
  }))
);
```

### Workflow Canvas
```typescript
// components/workflow/WorkflowCanvas.tsx
'use client';

import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export function WorkflowCanvas() {
  const nodes = useWorkflowStore(state => state.nodes);
  const edges = useWorkflowStore(state => state.edges);

  return (
    <div className="h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### YouTube Node
```typescript
// components/workflow/nodes/YouTubeNode.tsx
import { Handle, Position } from '@xyflow/react';
import LiteYouTubeEmbed from 'react-lite-youtube-embed';

export function YouTubeNode({ id, data }) {
  return (
    <div className="w-96 border rounded-lg bg-white">
      <div className="p-3">
        {data.videoId ? (
          <LiteYouTubeEmbed id={data.videoId} title={data.title} />
        ) : (
          <input placeholder="Paste YouTube URL..." />
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

### Chat API
```typescript
// app/api/chat/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  const { messages, youtubeUrls } = await req.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const parts = [
    ...youtubeUrls.map(url => ({ fileData: { fileUri: url } })),
    { text: messages[messages.length - 1].content },
  ];

  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  const response = await result.response;

  return Response.json({ text: response.text() });
}
```

---

## ✅ SUCCESS CRITERIA

### Functional
- [ ] Can create workflows with 10+ node types
- [ ] YouTube URLs work with AI chat
- [ ] Workflows persist across sessions
- [ ] Mobile-responsive UI
- [ ] Executes workflows correctly

### Performance
- [ ] Canvas handles 50+ nodes smoothly
- [ ] AI responses < 2 seconds
- [ ] Auto-save without lag
- [ ] Smooth 60fps interactions

### UX
- [ ] Intuitive drag-and-drop
- [ ] Clear visual feedback
- [ ] Error messages helpful
- [ ] Mobile gestures natural
- [ ] Loading states clear

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Environment variables set
- [ ] Gemini API key configured
- [ ] Build passes with no errors
- [ ] Mobile tested on real devices
- [ ] Performance optimized
- [ ] Error handling complete
- [ ] Documentation updated
- [ ] User testing completed

---

## 📚 RESOURCES

- [React Flow Docs](https://reactflow.dev/)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [YouTube oEmbed](https://www.youtube.com/oembed)
- [Zustand Docs](https://zustand.docs.pmnd.rs/)
- [TipTap Docs](https://tiptap.dev/)

---

**Status**: Week 1 - Day 1 (Foundation Setup) 🚀
**Next**: Install remaining dependencies → Create types → Build Zustand store
