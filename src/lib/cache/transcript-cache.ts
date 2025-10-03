// Simple in-memory cache for YouTube transcripts
// In production, consider using Redis or a database

interface CacheEntry {
  transcript: string;
  timestamp: number;
}

class TranscriptCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  get(videoId: string): string | null {
    const entry = this.cache.get(videoId);

    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(videoId);
      return null;
    }

    return entry.transcript;
  }

  set(videoId: string, transcript: string): void {
    this.cache.set(videoId, {
      transcript,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const transcriptCache = new TranscriptCache();
