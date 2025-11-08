import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Count tokens in text using Gemini's countTokens API
 */
export async function countTokens(text: string, modelName = 'gemini-2.5-flash'): Promise<number> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.countTokens(text);
    return result.totalTokens;
  } catch (error) {
    console.error('[TokenCounter] Error counting tokens:', error);
    // Fallback: rough estimate (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Fast token estimation (no API call, ~90% accurate)
 * Use this for quick checks, use countTokens for precise counts
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token budget
 */
export function truncateToTokenBudget(text: string, maxTokens: number): { text: string; truncated: boolean } {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return { text, truncated: false };
  }

  // Calculate how much to keep (with safety margin)
  const keepRatio = (maxTokens * 0.95) / estimatedTokens;
  const keepChars = Math.floor(text.length * keepRatio);

  const truncatedText = text.slice(0, keepChars) + '\n\n[... content truncated to fit token budget ...]';

  return { text: truncatedText, truncated: true };
}

/**
 * Token budget tracker for building contexts
 */
export class TokenBudget {
  private used = 0;
  private readonly max: number;

  constructor(maxTokens: number) {
    this.max = maxTokens;
  }

  get remaining(): number {
    return Math.max(0, this.max - this.used);
  }

  get percentage(): number {
    return (this.used / this.max) * 100;
  }

  get hasSpace(): boolean {
    return this.used < this.max;
  }

  /**
   * Try to allocate tokens. Returns true if successful.
   */
  allocate(tokens: number): boolean {
    if (this.used + tokens > this.max) {
      return false;
    }
    this.used += tokens;
    return true;
  }

  /**
   * Get how many tokens can be allocated for an item
   * Returns 0 if budget exhausted
   */
  availableFor(idealTokens: number): number {
    return Math.min(idealTokens, this.remaining);
  }

  getStats() {
    return {
      used: this.used,
      max: this.max,
      remaining: this.remaining,
      percentage: this.percentage.toFixed(1) + '%',
    };
  }
}
