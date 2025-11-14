import type { NodeType } from '@/types/workflow';

export interface NodeHeaderTheme {
  accent: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  border: string;
  iconBackground: string;
  iconColor: string;
  textColor: string;
  mutedText: string;
  shadow: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (normalized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const num = Number.parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function componentToHex(component: number): string {
  const hex = component.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamped = Math.max(0, Math.min(1, amount));
  const newR = Math.round(r + (255 - r) * clamped);
  const newG = Math.round(g + (255 - g) * clamped);
  const newB = Math.round(b + (255 - b) * clamped);
  return rgbToHex(newR, newG, newB);
}

export function transparentize(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

interface ThemeOverrides extends Partial<NodeHeaderTheme> {
  textColor?: string;
  mutedText?: string;
  iconColor?: string;
}

function createTheme(accent: string, overrides: ThemeOverrides = {}): NodeHeaderTheme {
  // Premium solid colors - much darker, richer (75% lightness for visible color)
  const surface = lighten(accent, 0.75);
  const surfaceHover = lighten(accent, 0.70);
  const surfaceActive = lighten(accent, 0.65);

  return {
    accent,
    surface,
    surfaceHover,
    surfaceActive,
    border: transparentize(lighten(accent, 0.68), 0.7),
    iconBackground: transparentize(lighten(accent, 0.60), 0.3),
    iconColor: overrides.iconColor ?? accent,
    textColor: overrides.textColor ?? '#14171B',
    mutedText: overrides.mutedText ?? '#4A5562',
    shadow: transparentize(accent, 0.2),
    ...overrides,
  } satisfies NodeHeaderTheme;
}

export type NodeThemeKey =
  | NodeType
  | 'trigger'
  | 'action'
  | 'condition'
  | 'transform'
  | 'delay'
  | 'merge'
  | 'output';

export const NODE_HEADER_THEMES: Record<NodeThemeKey | 'default', NodeHeaderTheme> = {
  default: createTheme('#CBD5F5', {
    iconColor: '#3B82F6',
    mutedText: '#6B7280',
  }),
  text: createTheme('#2d89ef'),           // Metro Blue - vibrant, professional
  pdf: createTheme('#da532c'),            // Dark Orange - rich, warm
  voice: createTheme('#00aba9'),          // Metro Teal - bright, saturated
  image: createTheme('#e3a21a'),          // Metro Orange/Amber - warm, golden
  youtube: createTheme('#FF0000', { iconColor: '#FF0000' }),  // YouTube Red - official brand color
  instagram: createTheme('#E4405F'),      // Instagram Brand Color - official pink/magenta
  linkedin: createTheme('#2b5797'),       // Dark Blue - professional LinkedIn tone
  mindmap: createTheme('#603cba'),        // Dark Purple - creative, deep
  template: createTheme('#ff0097'),       // Metro Magenta - bold, eye-catching
  webpage: createTheme('#603cba'),        // Dark Purple - rich indigo alternative
  chat: createTheme('#16a085'),           // Mountain Meadow - professional emerald
  connector: createTheme('#4B5563', {
    textColor: '#111827',
    iconColor: '#111827',
    mutedText: '#4B5563',
  }),
  group: createTheme('#111827', {
    textColor: '#F9FAFB',
    mutedText: '#D1D5DB',
    iconColor: '#F9FAFB',
    iconBackground: transparentize('#1F2937', 0.3),
    surface: '#1F2937',
    surfaceHover: '#374151',
    surfaceActive: '#4B5563',
    border: '#374151',
    shadow: transparentize('#000000', 0.3),
  }),
  sticky: createTheme('#ffc40d', {          // Metro Yellow - vibrant, attention-grabbing
    textColor: '#111827',
    iconColor: '#92400E',
  }),
  prompt: createTheme('#3B82F6', {          // Blue - AI transformation
    textColor: '#1E293B',
    iconColor: '#1D4ED8',
  }),
  trigger: createTheme('#603cba'),          // Dark Purple - distinctive trigger
  action: createTheme('#da532c'),           // Dark Orange - active, energetic
  condition: createTheme('#e3a21a'),        // Metro Orange - decision point
  transform: createTheme('#00aba9'),        // Metro Teal - transformation
  delay: createTheme('#1d1d1d', {           // Dark - pause/wait state
    textColor: '#F9FAFB',
    mutedText: '#D1D5DB',
    iconColor: '#F9FAFB',
  }),
  merge: createTheme('#7e3878'),            // Metro Purple - combining flows
  output: createTheme('#2d89ef'),           // Metro Blue - final output
};

export function getNodeHeaderTheme(type?: string | null): NodeHeaderTheme {
  if (!type) {
    return NODE_HEADER_THEMES.default;
  }

  const normalized = type.toLowerCase() as NodeThemeKey;
  if (normalized in NODE_HEADER_THEMES) {
    return NODE_HEADER_THEMES[normalized];
  }

  return NODE_HEADER_THEMES.default;
}

export function extractRGB(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}
