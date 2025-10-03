export type FlowCategory = "Chat" | "Group" | "Image Gen" | "Play" | "Prompt" | "Text" | "Web";

export interface FlowTag {
  name: FlowCategory;
  count: number;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  recentlyOpened: boolean;
  tags: FlowTag[];
  created: string;
  updated: string;
}

export const mockFlows: Flow[] = [
  {
    id: "walkthrough-2",
    name: "Walkthrough 2",
    recentlyOpened: true,
    tags: [
      { name: "Text", count: 13 },
      { name: "Prompt", count: 7 },
      { name: "Web", count: 5 },
      { name: "Image Gen", count: 3 },
      { name: "Play", count: 3 },
      { name: "Group", count: 1 },
    ],
    created: "9/28/2024",
    updated: "9/30/2024",
  },
  {
    id: "fluffy-chinchilla",
    name: "Fluffy-Chinchilla",
    recentlyOpened: true,
    tags: [
      { name: "Play", count: 1 },
      { name: "Prompt", count: 1 },
      { name: "Text", count: 1 },
    ],
    created: "9/29/2024",
    updated: "9/30/2024",
  },
  {
    id: "innovative-fowl",
    name: "Innovative-Fowl",
    recentlyOpened: true,
    tags: [
      { name: "Play", count: 1 },
      { name: "Prompt", count: 1 },
      { name: "Text", count: 1 },
    ],
    created: "9/29/2024",
    updated: "9/30/2024",
  },
  {
    id: "walkthrough-1",
    name: "Walkthrough 1",
    recentlyOpened: false,
    tags: [
      { name: "Chat", count: 2 },
      { name: "Text", count: 5 },
      { name: "Group", count: 2 },
      { name: "Web", count: 4 },
    ],
    created: "9/20/2024",
    updated: "9/25/2024",
  },
];

export const categories: { name: string; count: number | null }[] = [
  { name: "All Projects", count: 4 },
  { name: "Chat", count: 1 },
  { name: "Group", count: 2 },
  { name: "Image Gen", count: 1 },
  { name: "Play", count: 3 },
  { name: "Prompt", count: 3 },
  { name: "Text", count: 4 },
  { name: "Web", count: 2 },
];
