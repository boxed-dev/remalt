import { NextResponse } from 'next/server';
import { uploadWithRetry, uploadMultipleFromUrls } from '@/lib/supabase/storage-service';
import { createClient } from '@/lib/supabase/server';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_ACTOR_ENDPOINT = 'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items';

type ApifyInstagramItem = {
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
  };
  images?: Array<{ url?: string } | string>;
  videoUrl?: string;
  videoUrls?: string[];
  videoDuration?: number;
  commentsCount?: number;
  likesCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  type?: string; // 'Video', 'Image', 'Sidecar' (carousel)
  isVideo?: boolean;
  // Story-related fields (best-effort - Apify datasets may vary)
  takenAt?: string | number;
  takenAtTimestamp?: number;
  timestamp?: number;
  publishedTime?: string | number;
  expiringAt?: string | number;
  expireAt?: string | number;
  isStory?: boolean;
};

function normaliseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch (error) {
    throw new Error('Invalid Instagram URL');
  }
}

function isStoryUrl(url: string): boolean {
  return /instagram\.com\/stories\//.test(url);
}

function toIsoDate(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    // If it's already an ISO-like string, try Date parse
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === 'number') {
    // Could be seconds or milliseconds
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function pickFirstIso(...values: Array<unknown>): string | undefined {
  for (const v of values) {
    const iso = toIsoDate(v);
    if (iso) return iso;
  }
  return undefined;
}

async function mapApifyItemToResponse(item: ApifyInstagramItem, requestedUrl: string, userId: string) {
  // Handle both videos (reels) and images (posts)
  const videoUrl = item.videoUrl || item.videoUrls?.[0];
  const isVideo = item.isVideo || item.type === 'Video' || !!videoUrl;
  const isStory = isStoryUrl(requestedUrl) || !!item.isStory || (item.url ? isStoryUrl(item.url) : false);

  const profilePic =
    item.ownerProfilePicUrl ||
    item.owner?.profile_pic_url ||
    item.owner?.profilePicUrl ||
    undefined;

  // Try multiple potential thumbnail sources from Apify
  let thumbnail =
    item.displayUrl ||
    item.thumbnailUrl ||
    item.thumbnail ||
    item.imageUrl;

  // If still no thumbnail, try to extract from images array
  if (!thumbnail && Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = item.images[0];
    if (typeof firstImage === 'string') {
      thumbnail = firstImage;
    } else if (firstImage?.url) {
      thumbnail = firstImage.url;
    }
  }

  // Extract ALL images for carousel posts (Sidecar)
  let allImages: string[] | undefined = undefined;
  if (item.type === 'Sidecar' && Array.isArray(item.images) && item.images.length > 0) {
    allImages = item.images.map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && 'url' in img) return img.url as string;
      return '';
    }).filter(Boolean);

    console.log(`[Instagram API] Extracted ${allImages.length} carousel images`);
  }

  // For image posts, if no thumbnail found, throw error
  if (!thumbnail && !videoUrl) {
    throw new Error('No media content found for this post');
  }

  const permalink = item.url ?? requestedUrl;
  const thumbnailFallback = permalink ? `https://image.microlink.io/${encodeURIComponent(permalink)}` : undefined;

  // Story timestamps (best-effort)
  const takenAt = pickFirstIso(
    item.takenAt,
    item.takenAtTimestamp,
    item.timestamp,
    item.publishedTime
  );
  const explicitExpires = pickFirstIso(item.expiringAt, item.expireAt);
  const expiresAt = explicitExpires || (takenAt ? new Date(new Date(takenAt).getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined);

  // ============================================
  // SUPABASE STORAGE PERMANENT MEDIA BACKUP
  // ============================================
  let storageUrl: string | undefined;
  let storagePath: string | undefined;
  let storageThumbnailUrl: string | undefined;
  let storageThumbnailPath: string | undefined;
  let storageImageUrls: string[] | undefined;
  let storageImagePaths: string[] | undefined;
  let backupStatus: 'success' | 'partial' | 'failed' = 'success';
  const uploadErrors: string[] = [];

  // Prepare comprehensive metadata for all uploads
  const baseMetadata = {
    source: 'instagram',
    postCode: item.shortCode || 'unknown',
    author: item.ownerUsername || 'unknown',
    timestamp: new Date().toISOString(),
    postType: item.type || 'unknown',
  };

  console.log('[Instagram API] 📤 Starting UploadCare media backup...');

  // STRATEGY: Upload all media to UploadCare for permanent storage
  // Priority: Videos > Carousels > Single Images > Thumbnails

  try {
    // 1. Handle video posts/reels
    if (isVideo && videoUrl) {
      try {
        console.log('[Instagram API] 📹 Uploading video to Supabase Storage...');
        const videoResult = await uploadWithRetry(
          videoUrl,
          userId,
          'instagram',
          `${item.shortCode}-video.mp4`,
          { contentType: 'video/mp4' },
          3 // Max 3 retries for videos
        );
        storageUrl = videoResult.publicUrl;
        storagePath = videoResult.path;
        console.log(`[Instagram API] ✅ Video uploaded: ${videoResult.path}`);
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
            thumbnail,
            userId,
            'instagram',
            `${item.shortCode}-thumbnail.jpg`,
            { contentType: 'image/jpeg' },
            2 // Fewer retries for thumbnails
          );
          storageThumbnailUrl = thumbnailResult.publicUrl;
          storageThumbnailPath = thumbnailResult.path;
          console.log(`[Instagram API] ✅ Thumbnail uploaded: ${thumbnailResult.path}`);
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

        const carouselUrls = allImages.map((url, index) => ({
          url,
          fileName: `${item.shortCode}-image-${index + 1}.jpg`,
          contentType: 'image/jpeg'
        }));

        const carouselResults = await uploadMultipleFromUrls(
          carouselUrls,
          userId,
          'instagram',
          { contentType: 'image/jpeg' },
          2 // 2 retries per image
        );

        // Separate successful and failed uploads
        const successfulUploads = carouselResults.filter(r => r.success && r.result);
        const failedUploads = carouselResults.filter(r => !r.success);

        if (successfulUploads.length > 0) {
          storageImageUrls = successfulUploads.map(r => r.result!.publicUrl);
          storageImagePaths = successfulUploads.map(r => r.result!.path);

          // Use first successful image as primary
          storageUrl = successfulUploads[0].result!.publicUrl;
          storagePath = successfulUploads[0].result!.path;

          console.log(`[Instagram API] ✅ Carousel uploaded: ${successfulUploads.length}/${allImages.length} images`);
        }

        // Track failures
        if (failedUploads.length > 0) {
          failedUploads.forEach(failed => {
            const errorMsg = `Image ${failed.originalUrl.substring(0, 50)}...: ${failed.error}`;
            uploadErrors.push(errorMsg);
            console.error(`[Instagram API] ⚠️  Carousel image failed: ${errorMsg}`);
          });
          backupStatus = successfulUploads.length > 0 ? 'partial' : 'failed';
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Instagram API] ❌ Carousel upload failed:', errorMsg);
        uploadErrors.push(`Carousel: ${errorMsg}`);
        backupStatus = 'failed';
      }
    }
    // 3. Handle single image posts
    else if (thumbnail) {
      try {
        console.log('[Instagram API] 🖼️  Uploading image to Supabase Storage...');
        const result = await uploadWithRetry(
          thumbnail,
          userId,
          'instagram',
          `${item.shortCode}-image.jpg`,
          { contentType: 'image/jpeg' },
          3 // Max 3 retries for primary images
        );
        storageUrl = result.publicUrl;
        storagePath = result.path;
        console.log(`[Instagram API] ✅ Image uploaded: ${result.path}`);
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
    console.log('[Instagram API] ✅ All media backed up to Supabase Storage');
  } else if (!storageUrl && !storageImageUrls?.length) {
    backupStatus = 'failed';
    console.error('[Instagram API] ❌ Complete backup failure - no media uploaded');
  } else {
    backupStatus = 'partial';
    console.warn('[Instagram API] ⚠️  Partial backup - some uploads failed');
  }

  // Use storage URLs directly (no transformations needed - Supabase serves originals)
  let optimizedThumbnail: string | undefined;
  if (storageThumbnailUrl) {
    optimizedThumbnail = storageThumbnailUrl;
  } else if (storageUrl && !isVideo) {
    optimizedThumbnail = storageUrl;
  }

  return {
    success: true as const,
    url: requestedUrl,
    reelCode: item.shortCode,

    // Primary media URLs: Use Supabase Storage for permanent storage, with automatic fallback to Instagram
    videoUrl: storageUrl && isVideo ? storageUrl : videoUrl,
    thumbnail: storageThumbnailUrl || optimizedThumbnail || thumbnail,
    thumbnailFallback,
    images: storageImageUrls || allImages,

    // Supabase Storage backup info (for permanent storage)
    storage: {
      status: backupStatus,
      videoUrl: storageUrl,
      videoPath: storagePath,
      thumbnailUrl: storageThumbnailUrl || optimizedThumbnail,
      thumbnailPath: storageThumbnailPath,
      imageUrls: storageImageUrls,
      imagePaths: storageImagePaths,
      errors: uploadErrors.length > 0 ? uploadErrors : undefined,
    },

    // Original URLs (for automatic fallback)
    originalVideoUrl: videoUrl,
    originalThumbnail: thumbnail,
    originalImages: allImages,

    // Post metadata
    caption: item.caption,
    author: {
      username: item.ownerUsername,
      fullName: item.ownerFullName,
      profilePicUrl: profilePic,
      id: item.ownerId,
    },
    likes: item.likesCount !== undefined && item.likesCount >= 0 ? item.likesCount : undefined,
    views: item.videoViewCount ?? item.videoPlayCount,
    comments: item.commentsCount,
    duration: item.videoDuration,
    isStory,
    takenAt,
    expiresAt,
    rawId: item.id,
    isVideo,
    postType: item.type,
    permalink,
  };
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const requestedUrl = normaliseUrl(body?.url ?? '');

    if (!APIFY_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Instagram integration is not configured' },
        { status: 503 }
      );
    }

    const apifyUrl = new URL(APIFY_ACTOR_ENDPOINT);
    apifyUrl.searchParams.set('token', APIFY_TOKEN);

    // Determine if this is a story or regular post
    const resultsType = isStoryUrl(requestedUrl) ? 'stories' : 'posts';
    console.log(`[Instagram API] 🎯 Fetching ${resultsType}:`, requestedUrl);

    const apifyResponse = await fetch(apifyUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directUrls: [requestedUrl],
        addParentData: false,
        enhanceUserSearchWithFacebookPage: false,
        resultsType,
        resultsLimit: 1,
      }),
      cache: 'no-store',
    });

    if (!apifyResponse.ok) {
      const errorPayload = await apifyResponse.text();
      console.error('[Instagram API] ❌ Apify request failed:', apifyResponse.status, errorPayload);
      throw new Error('Failed to fetch Instagram post data');
    }

    const data = await apifyResponse.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No data returned for the requested post');
    }

    const item = data[0] as ApifyInstagramItem;

    // Debug logging to see what Apify returns
    console.log('[Instagram API] ✅ Apify data received');
    console.log(`[Instagram API]   - Type: ${item.type}`);
    console.log(`[Instagram API]   - Post code: ${item.shortCode}`);
    console.log(`[Instagram API]   - Author: @${item.ownerUsername}`);
    console.log(`[Instagram API]   - Has video: ${!!item.videoUrl}`);
    console.log(`[Instagram API]   - Has thumbnail: ${!!item.displayUrl}`);
    console.log(`[Instagram API]   - Is carousel: ${item.type === 'Sidecar'}`);

    const responsePayload = await mapApifyItemToResponse(item, requestedUrl, user.id);

    const elapsed = Date.now() - startTime;
    console.log(`[Instagram API] ✅ Complete success in ${elapsed}ms`);
    console.log(`[Instagram API]   - Post type: ${responsePayload.postType}`);
    console.log(`[Instagram API]   - Is video: ${responsePayload.isVideo}`);
    console.log(`[Instagram API]   - Has carousel: ${!!responsePayload.images?.length}`);
    console.log(`[Instagram API]   - Storage status: ${responsePayload.storage.status}`);
    if (responsePayload.storage.errors) {
      console.log(`[Instagram API]   - Upload errors: ${responsePayload.storage.errors.length}`);
    }

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
