/**
 * YouTube API v3 Client
 * Handles channel and video data fetching
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  customUrl?: string;
}

export interface ChannelVideosResponse {
  channel: YouTubeChannel;
  videos: YouTubeVideo[];
  nextPageToken?: string;
  totalResults: number;
}

/**
 * Extract channel ID from various YouTube channel URL formats
 */
export function extractChannelId(url: string): { type: 'channel' | 'handle' | 'custom' | 'user'; id: string } | null {
  const patterns = [
    // youtube.com/channel/UC...
    { regex: /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/, type: 'channel' as const },
    // youtube.com/@username
    { regex: /youtube\.com\/@([a-zA-Z0-9_-]+)/, type: 'handle' as const },
    // youtube.com/c/customname
    { regex: /youtube\.com\/c\/([a-zA-Z0-9_-]+)/, type: 'custom' as const },
    // youtube.com/user/username
    { regex: /youtube\.com\/user\/([a-zA-Z0-9_-]+)/, type: 'user' as const },
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      return { type: pattern.type, id: match[1] };
    }
  }

  return null;
}

/**
 * Resolve channel ID from handle (@username) or custom URL
 */
async function resolveChannelId(type: 'handle' | 'custom' | 'user', identifier: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  try {
    // For handles (starts with @), use the search API
    if (type === 'handle') {
      const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(identifier)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error('Failed to search for channel');

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].snippet.channelId;
      }
    } else {
      // For custom URLs and usernames, try to find via search
      const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(identifier)}&maxResults=5&key=${YOUTUBE_API_KEY}`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error('Failed to search for channel');

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        // Try to find exact match
        const exactMatch = data.items.find((item: any) =>
          item.snippet.customUrl?.toLowerCase().includes(identifier.toLowerCase()) ||
          item.snippet.title.toLowerCase() === identifier.toLowerCase()
        );
        return exactMatch ? exactMatch.snippet.channelId : data.items[0].snippet.channelId;
      }
    }
  } catch (error) {
    console.error('[YouTube API] Error resolving channel ID:', error);
  }

  return null;
}

/**
 * Fetch channel details by ID
 */
export async function getChannelById(channelId: string): Promise<YouTubeChannel | null> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  try {
    const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const channel = data.items[0];
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url,
      subscriberCount: channel.statistics.subscriberCount,
      videoCount: channel.statistics.videoCount,
      customUrl: channel.snippet.customUrl,
    };
  } catch (error) {
    console.error('[YouTube API] Error fetching channel:', error);
    throw error;
  }
}

/**
 * Fetch channel details from any channel URL format
 */
export async function getChannelFromUrl(url: string): Promise<YouTubeChannel | null> {
  const parsed = extractChannelId(url);
  if (!parsed) {
    throw new Error('Invalid YouTube channel URL');
  }

  let channelId = parsed.id;

  // If not a direct channel ID, resolve it first
  if (parsed.type !== 'channel') {
    const resolvedId = await resolveChannelId(parsed.type, parsed.id);
    if (!resolvedId) {
      throw new Error('Could not resolve channel ID');
    }
    channelId = resolvedId;
  }

  return getChannelById(channelId);
}

/**
 * Fetch videos from a channel
 */
export async function getChannelVideos(
  channelId: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string; totalResults: number }> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  try {
    // First, get the uploads playlist ID
    const channelUrl = `${YOUTUBE_API_BASE}/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const channelResponse = await fetch(channelUrl);
    if (!channelResponse.ok) throw new Error('Failed to fetch channel details');

    const channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found');
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Fetch videos from uploads playlist
    let playlistUrl = `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    if (pageToken) {
      playlistUrl += `&pageToken=${pageToken}`;
    }

    const playlistResponse = await fetch(playlistUrl);
    if (!playlistResponse.ok) throw new Error('Failed to fetch playlist items');

    const playlistData = await playlistResponse.json();
    const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');

    // Fetch video details (duration, view count, etc.)
    const videosUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
    const videosResponse = await fetch(videosUrl);
    if (!videosResponse.ok) throw new Error('Failed to fetch video details');

    const videosData = await videosResponse.json();

    const videos: YouTubeVideo[] = videosData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
      publishedAt: item.snippet.publishedAt,
      duration: item.contentDetails.duration,
      viewCount: item.statistics.viewCount,
    }));

    return {
      videos,
      nextPageToken: playlistData.nextPageToken,
      totalResults: playlistData.pageInfo.totalResults,
    };
  } catch (error) {
    console.error('[YouTube API] Error fetching channel videos:', error);
    throw error;
  }
}

/**
 * Fetch both channel details and videos in one call
 */
export async function getChannelWithVideos(
  url: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<ChannelVideosResponse> {
  const channel = await getChannelFromUrl(url);
  if (!channel) {
    throw new Error('Channel not found');
  }

  const { videos, nextPageToken, totalResults } = await getChannelVideos(channel.id, maxResults, pageToken);

  return {
    channel,
    videos,
    nextPageToken,
    totalResults,
  };
}

/**
 * Parse ISO 8601 duration to human-readable format
 */
export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format view count to human-readable format
 */
export function formatViewCount(count: string): string {
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M views`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K views`;
  }
  return `${num} views`;
}
