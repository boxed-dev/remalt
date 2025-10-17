import { NextResponse } from 'next/server';
import { uploadWithRetry, uploadMultipleFromUrls, getCdnUrl } from '@/lib/uploadcare/upload-service';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Apify actors to try in order (most specific to most general)
const APIFY_ACTORS = [
  {
    id: 'apify/instagram-scraper',
    name: 'Instagram Scraper',
    prepareInput: (url: string) => ({
      directUrls: [url],
      resultsType: 'posts',
      resultsLimit: 1,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
    }),
  },
  {
    id: 'clockworks/instagram-scraper',
    name: 'Clockworks Instagram',
    prepareInput: (url: string) => ({
      directUrls: [url],
      resultsType: 'posts',
      resultsLimit: 1,
    }),
  },
];

type InstagramMediaItem = {
  id?: string;
  shortCode?: string;
  caption?: string;
  url?: string;
  displayUrl?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  imageUrl?: string;
  ownerUsername?: string;
  ownerFullName?: string;
  ownerId?: string;
  ownerProfilePicUrl?: string;
  owner?: {
    profile_pic_url?: string;
    profilePicUrl?: string;
    username?: string;
    full_name?: string;
  };
  images?: Array<{ url?: string } | string>;
  videoUrl?: string;
  videoUrls?: string[];
  videoDuration?: number;
  commentsCount?: number;
  likesCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  type?: string;
  isVideo?: boolean;
  takenAt?: string | number;
  takenAtTimestamp?: number;
  timestamp?: number;
  publishedTime?: string | number;
};

type OEmbedResponse = {
  version: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  author_id?: number;
  media_id?: string;
  provider_name: string;
  provider_url: string;
  type: string;
  width?: number | null;
  height?: number | null;
  html?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
};

function normaliseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes('instagram.com')) {
      throw new Error('URL must be an Instagram URL');
    }
    return parsed.toString();
  } catch (error) {
    throw new Error('Invalid Instagram URL');
  }
}

function extractShortcodeFromUrl(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reels\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

async function tryInstagramOEmbed(postUrl: string): Promise<Partial<InstagramMediaItem>> {
  console.log('[Instagram API] 🔄 Trying Instagram oEmbed API...');

  const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&access_token=ignore&omitscript=true`;

  const response = await fetchWithTimeout(oembedUrl, {}, 8000);

  if (!response.ok) {
    throw new Error(`oEmbed failed: ${response.status}`);
  }

  const data: OEmbedResponse = await response.json();
  const shortcode = extractShortcodeFromUrl(postUrl);

  return {
    shortCode: shortcode || undefined,
    url: postUrl,
    thumbnailUrl: data.thumbnail_url,
    displayUrl: data.thumbnail_url,
    ownerUsername: data.author_name,
    caption: data.title,
  };
}

async function tryDirectScrape(postUrl: string): Promise<Partial<InstagramMediaItem>> {
  console.log('[Instagram API] 🔄 Trying direct HTML scrape...');

  const response = await fetchWithTimeout(
    postUrl,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
    12000
  );

  if (!response.ok) {
    throw new Error(`Direct scrape failed: ${response.status}`);
  }

  const html = await response.text();

  // Extract Open Graph meta tags
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)?.[1];
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1];
  const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/)?.[1];
  const ogVideo = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/)?.[1];

  const shortcode = extractShortcodeFromUrl(postUrl);

  return {
    shortCode: shortcode || undefined,
    url: postUrl,
    thumbnailUrl: ogImage,
    displayUrl: ogImage,
    videoUrl: ogVideo,
    caption: ogDescription || ogTitle,
    isVideo: !!ogVideo,
  };
}

async function tryApifyScraper(postUrl: string): Promise<InstagramMediaItem> {
  if (!APIFY_TOKEN) {
    throw new Error('Apify token not configured');
  }

  const errors: Array<{ actor: string; error: string }> = [];

  // Try each actor in sequence until one succeeds
  for (const actor of APIFY_ACTORS) {
    try {
      console.log(`[Instagram API] 🔄 Trying Apify actor: ${actor.name}...`);

      const apifyUrl = new URL(`https://api.apify.com/v2/acts/${actor.id}/run-sync-get-dataset-items`);
      apifyUrl.searchParams.set('token', APIFY_TOKEN);
      apifyUrl.searchParams.set('timeout', '45'); // 45 second timeout

      const inputData = actor.prepareInput(postUrl);

      const response = await fetchWithTimeout(
        apifyUrl.toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(inputData),
        },
        50000 // 50 second client timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data returned');
      }

      console.log(`[Instagram API] ✅ ${actor.name} succeeded`);
      return data[0] as InstagramMediaItem;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Instagram API] ✗ ${actor.name} failed: ${errorMsg}`);
      errors.push({ actor: actor.name, error: errorMsg });
      // Continue to next actor
    }
  }

  // All actors failed
  throw new Error(
    `All Apify actors failed:\n${errors.map(e => `- ${e.actor}: ${e.error}`).join('\n')}`
  );
}

async function fetchInstagramData(postUrl: string): Promise<InstagramMediaItem> {
  const errors: Array<{ method: string; error: string; time: number }> = [];

  // STRATEGY 1: Try Instagram oEmbed first (fastest, works for public posts)
  try {
    const startTime = Date.now();
    const data = await tryInstagramOEmbed(postUrl);
    const elapsed = Date.now() - startTime;
    console.log(`[Instagram API] ✅ oEmbed success (${elapsed}ms)`);
    return data as InstagramMediaItem;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Instagram API] ❌ oEmbed failed:', errorMsg);
    errors.push({ method: 'oEmbed', error: errorMsg, time: 0 });
  }

  // STRATEGY 2: Try direct HTML scrape (fast, gets basic data)
  try {
    const startTime = Date.now();
    const data = await tryDirectScrape(postUrl);
    const elapsed = Date.now() - startTime;
    console.log(`[Instagram API] ✅ Direct scrape success (${elapsed}ms)`);
    return data as InstagramMediaItem;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Instagram API] ❌ Direct scrape failed:', errorMsg);
    errors.push({ method: 'Direct Scrape', error: errorMsg, time: 0 });
  }

  // STRATEGY 3: Try Apify as last resort (slower but most complete data)
  if (APIFY_TOKEN) {
    try {
      const startTime = Date.now();
      const data = await tryApifyScraper(postUrl);
      const elapsed = Date.now() - startTime;
      console.log(`[Instagram API] ✅ Apify success (${elapsed}ms)`);
      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Instagram API] ❌ Apify failed:', errorMsg);
      errors.push({ method: 'Apify', error: errorMsg, time: 0 });
    }
  }

  // All methods failed
  console.error('[Instagram API] ❌ All methods failed:', errors);
  throw new Error(
    `Failed to fetch Instagram data. Tried ${errors.length} methods:\n` +
    errors.map(e => `- ${e.method}: ${e.error}`).join('\n')
  );
}

async function processInstagramData(item: InstagramMediaItem, requestedUrl: string) {
  const videoUrl = item.videoUrl || item.videoUrls?.[0];
  const isVideo = item.isVideo || item.type === 'Video' || !!videoUrl;

  let thumbnail =
    item.displayUrl ||
    item.thumbnailUrl ||
    item.thumbnail ||
    item.imageUrl;

  if (!thumbnail && Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = item.images[0];
    thumbnail = typeof firstImage === 'string' ? firstImage : firstImage?.url;
  }

  let allImages: string[] | undefined = undefined;
  if (item.type === 'Sidecar' && Array.isArray(item.images) && item.images.length > 0) {
    allImages = item.images
      .map(img => (typeof img === 'string' ? img : img?.url))
      .filter((url): url is string => !!url);
  }

  if (!thumbnail && !videoUrl && !allImages?.length) {
    throw new Error('No media content found for this post');
  }

  const profilePic =
    item.ownerProfilePicUrl ||
    item.owner?.profile_pic_url ||
    item.owner?.profilePicUrl;

  const username = item.ownerUsername || item.owner?.username;
  const fullName = item.ownerFullName || item.owner?.full_name;

  // ============================================
  // UPLOADCARE-CENTRIC MEDIA STORAGE
  // ============================================
  let uploadcareCdnUrl: string | undefined;
  let uploadcareUuid: string | undefined;
  let uploadcareThumbnailUrl: string | undefined;
  let uploadcareThumbnailUuid: string | undefined;
  let uploadcareImages: string[] | undefined;
  let uploadcareImageUuids: string[] | undefined;
  let backupStatus: 'success' | 'partial' | 'failed' = 'success';
  const uploadErrors: string[] = [];

  // Prepare comprehensive metadata for all uploads
  const baseMetadata = {
    source: 'instagram',
    postCode: item.shortCode || 'unknown',
    author: username || 'unknown',
    timestamp: new Date().toISOString(),
  };

  console.log('[Instagram API] 📤 Starting UploadCare media backup...');

  // STRATEGY: Upload all media to UploadCare for permanent storage
  // Priority: Videos > Carousels > Single Images > Thumbnails

  try {
    // 1. Handle video posts
    if (isVideo && videoUrl) {
      try {
        console.log('[Instagram API] 📹 Uploading video to UploadCare...');
        const videoResult = await uploadWithRetry(
          {
            sourceUrl: videoUrl,
            store: '1',
            checkDuplicates: true,
            saveDuplicates: true,
            metadata: {
              ...baseMetadata,
              type: 'video',
              duration: item.videoDuration?.toString() || 'unknown',
            },
          },
          3 // Max 3 retries for videos
        );
        uploadcareCdnUrl = videoResult.cdnUrl;
        uploadcareUuid = videoResult.uuid;
        console.log(`[Instagram API] ✅ Video uploaded: ${uploadcareUuid}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Instagram API] ❌ Video upload failed:', errorMsg);
        uploadErrors.push(`Video: ${errorMsg}`);
        backupStatus = 'partial';
      }

      // Upload video thumbnail separately
      if (thumbnail) {
        try {
          console.log('[Instagram API] 🖼️  Uploading video thumbnail...');
          const thumbnailResult = await uploadWithRetry(
            {
              sourceUrl: thumbnail,
              store: '1',
              checkDuplicates: true,
              saveDuplicates: true,
              metadata: {
                ...baseMetadata,
                type: 'video-thumbnail',
                relatedVideo: uploadcareUuid || 'unknown',
              },
            },
            2 // Fewer retries for thumbnails
          );
          uploadcareThumbnailUrl = thumbnailResult.cdnUrl;
          uploadcareThumbnailUuid = thumbnailResult.uuid;
          console.log(`[Instagram API] ✅ Thumbnail uploaded: ${uploadcareThumbnailUuid}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Instagram API] ⚠️  Thumbnail upload failed:', errorMsg);
          uploadErrors.push(`Thumbnail: ${errorMsg}`);
          // Don't change status to partial for thumbnail failures
        }
      }
    }
    // 2. Handle carousel posts (multiple images)
    else if (allImages && allImages.length > 0) {
      try {
        console.log(`[Instagram API] 🎠 Uploading ${allImages.length} carousel images...`);
        const carouselResults = await uploadMultipleFromUrls(allImages, {
          store: '1',
          checkDuplicates: true,
          saveDuplicates: true,
          metadata: {
            ...baseMetadata,
            type: 'carousel-image',
            carouselSize: allImages.length.toString(),
          },
        });

        uploadcareImages = carouselResults.map(r => r.cdnUrl);
        uploadcareImageUuids = carouselResults.map(r => r.uuid);

        // Use first image as primary
        uploadcareCdnUrl = carouselResults[0]?.cdnUrl;
        uploadcareUuid = carouselResults[0]?.uuid;

        console.log(`[Instagram API] ✅ Carousel uploaded: ${uploadcareImageUuids.length} images`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Instagram API] ❌ Carousel upload failed:', errorMsg);
        uploadErrors.push(`Carousel: ${errorMsg}`);
        backupStatus = 'partial';
      }
    }
    // 3. Handle single image posts
    else if (thumbnail) {
      try {
        console.log('[Instagram API] 🖼️  Uploading image to UploadCare...');
        const result = await uploadWithRetry(
          {
            sourceUrl: thumbnail,
            store: '1',
            checkDuplicates: true,
            saveDuplicates: true,
            metadata: {
              ...baseMetadata,
              type: 'image',
            },
          },
          3 // Max 3 retries for primary images
        );
        uploadcareCdnUrl = result.cdnUrl;
        uploadcareUuid = result.uuid;
        console.log(`[Instagram API] ✅ Image uploaded: ${uploadcareUuid}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Instagram API] ❌ Image upload failed:', errorMsg);
        uploadErrors.push(`Image: ${errorMsg}`);
        backupStatus = 'partial';
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Instagram API] ❌ UploadCare backup failed:', errorMsg);
    backupStatus = 'failed';
    uploadErrors.push(`Critical: ${errorMsg}`);
  }

  // Determine final backup status
  if (uploadErrors.length === 0) {
    backupStatus = 'success';
    console.log('[Instagram API] ✅ All media backed up to UploadCare');
  } else if (!uploadcareCdnUrl && !uploadcareImages?.length) {
    backupStatus = 'failed';
    console.error('[Instagram API] ❌ Complete backup failure - no media uploaded');
  } else {
    backupStatus = 'partial';
    console.warn('[Instagram API] ⚠️  Partial backup - some uploads failed');
  }

  // Generate optimized thumbnail URLs using UploadCare transformations
  let optimizedThumbnail: string | undefined;
  if (uploadcareThumbnailUuid) {
    // For video thumbnails, create optimized preview (800x800, smart crop, webp)
    optimizedThumbnail = `https://ucarecdn.com/${uploadcareThumbnailUuid}/-/preview/800x800/-/quality/smart/-/format/webp/`;
  } else if (uploadcareUuid && !isVideo) {
    // For images, create optimized preview
    optimizedThumbnail = `https://ucarecdn.com/${uploadcareUuid}/-/preview/800x800/-/quality/smart/-/format/webp/`;
  }

  const permalink = item.url || requestedUrl;

  return {
    success: true as const,
    url: requestedUrl,
    reelCode: item.shortCode,

    // Primary media URLs (UploadCare first, original as fallback)
    videoUrl: uploadcareCdnUrl && isVideo ? uploadcareCdnUrl : videoUrl,
    thumbnail: optimizedThumbnail || uploadcareCdnUrl || uploadcareThumbnailUrl || thumbnail,
    images: uploadcareImages || allImages,

    // UploadCare backup info
    uploadcare: {
      status: backupStatus,
      primaryCdnUrl: uploadcareCdnUrl,
      primaryUuid: uploadcareUuid,
      thumbnailCdnUrl: uploadcareThumbnailUrl,
      thumbnailUuid: uploadcareThumbnailUuid,
      carouselUrls: uploadcareImages,
      carouselUuids: uploadcareImageUuids,
      errors: uploadErrors.length > 0 ? uploadErrors : undefined,
    },

    // Original URLs (for fallback/reference)
    originalVideoUrl: videoUrl,
    originalThumbnail: thumbnail,
    originalImages: allImages,

    // Post metadata
    caption: item.caption,
    author: {
      username,
      fullName,
      profilePicUrl: profilePic,
      id: item.ownerId,
    },
    likes: item.likesCount !== undefined && item.likesCount >= 0 ? item.likesCount : undefined,
    views: item.videoViewCount ?? item.videoPlayCount,
    comments: item.commentsCount,
    duration: item.videoDuration,
    rawId: item.id,
    isVideo,
    postType: item.type,
    permalink,
  };
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const requestedUrl = normaliseUrl(body?.url ?? '');

    console.log('[Instagram API] 🎯 Fetching:', requestedUrl);

    const instagramData = await fetchInstagramData(requestedUrl);
    const responsePayload = await processInstagramData(instagramData, requestedUrl);

    const elapsed = Date.now() - startTime;
    console.log(`[Instagram API] ✅ Complete success in ${elapsed}ms:`, {
      postType: responsePayload.postType,
      isVideo: responsePayload.isVideo,
      hasCarousel: !!responsePayload.images?.length,
      uploadcareStatus: responsePayload.uploadcare.status,
      uploadcareErrors: responsePayload.uploadcare.errors?.length || 0,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Instagram API] ❌ Failed after ${elapsed}ms:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        error: message,
        details: 'Please ensure the Instagram URL is correct and the post is public.',
      },
      { status: 500 }
    );
  }
}
